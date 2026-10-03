/** Runs user JavaScript inside a Web Worker (so infinite loops can be stopped) and explains errors. */

export type TestCase = { args: unknown[]; expected: unknown };
export type TestResult = { ok: boolean; got?: string; error?: { name: string; message: string } };
export type RunOutcome =
  | { type: "done"; results: TestResult[]; logs: string[] }
  | { type: "error"; name: string; message: string; logs: string[] }
  | { type: "timeout"; logs: string[] };

const WORKER_SRC = `
self.onmessage = function (e) {
  var d = e.data, logs = [];
  function fmt(v) { if (typeof v === "string") return v; try { return JSON.stringify(v); } catch (_) { return String(v); } }
  var con = { log: function () { logs.push([].map.call(arguments, fmt).join(" ")); } };
  con.error = con.warn = con.info = con.log;
  var f;
  try {
    f = new Function("console", d.code + "\\n;return typeof " + d.fn + " === 'function' ? " + d.fn + " : undefined;")(con);
  } catch (err) { return self.postMessage({ type: "error", name: err.name, message: err.message, logs: logs }); }
  if (!f) return self.postMessage({ type: "error", name: "NotFound", message: d.fn, logs: logs });
  var results = d.tests.map(function (t) {
    try {
      var got = f.apply(null, JSON.parse(JSON.stringify(t.args)));
      return { ok: fmt(got) === fmt(t.expected) && typeof got !== "undefined", got: typeof got === "undefined" ? "undefined" : fmt(got) };
    } catch (err) { return { ok: false, error: { name: err.name, message: err.message } }; }
  });
  self.postMessage({ type: "done", results: results, logs: logs });
};`;

export function runCode(code: string, fn: string, tests: TestCase[], timeoutMs = 3000): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const worker = new Worker(url);
    const finish = (o: RunOutcome) => {
      window.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(o);
    };
    const timer = window.setTimeout(() => finish({ type: "timeout", logs: [] }), timeoutMs);
    worker.onmessage = (e) => finish(e.data as RunOutcome);
    worker.onerror = (e) => finish({ type: "error", name: "Error", message: e.message || "Unknown error", logs: [] });
    worker.postMessage({ code, fn, tests });
  });
}

export type Topic = { label: string; url: string };
export type Explanation = { title: string; why: string; fix: string[]; topics: Topic[] };

const mdn = (path: string, label: string): Topic => ({ label, url: `https://developer.mozilla.org/en-US/docs/${path}` });

export function explainError(name: string, message: string, fn: string): Explanation {
  const m = message || "";
  if (name === "NotFound")
    return {
      title: `Function "${fn}" was not found`,
      why: `The tests call a function named ${fn}, but your code does not define it (or the name is spelled differently).`,
      fix: [`Keep the exact name: function ${fn}(...) { ... }`, "Check capital letters. JavaScript is case-sensitive.", "Do not rename or delete the starter function."],
      topics: [mdn("Web/JavaScript/Guide/Functions", "JavaScript functions")],
    };
  if (name === "SyntaxError")
    return {
      title: "Syntax error: the code is not written correctly",
      why: `JavaScript could not read your code (${m}). This usually means a missing or extra bracket, quote, comma or parenthesis.`,
      fix: ["Check that every ( { [ has a matching ) } ].", "Check that every string has both opening and closing quotes.", "Look at the line just above where the error seems to point."],
      topics: [mdn("Web/JavaScript/Reference/Errors/Unexpected_token", "Unexpected token errors"), mdn("Web/JavaScript/Guide/Grammar_and_types", "Syntax and types")],
    };
  if (name === "ReferenceError")
    return {
      title: "Reference error: a name is not defined",
      why: `You used something that does not exist in this scope (${m}). Common causes are a typo, a missing let/const, or using a variable outside the block where it was created.`,
      fix: ["Declare variables with let or const before using them.", "Compare the spelling and capital letters with where you declared it.", "Check that the variable is not declared inside a smaller block ({ }) than where you use it."],
      topics: [mdn("Web/JavaScript/Reference/Errors/Not_defined", "Not defined errors"), mdn("Glossary/Scope", "Variable scope")],
    };
  if (name === "TypeError")
    return {
      title: "Type error: a value is not what the code expected",
      why: `An operation was used on the wrong type of value (${m}). For example calling .map on something that is not an array, or reading a property of undefined.`,
      fix: ["Print the value with console.log to see what it really is.", "Check that you return the right thing and loop over an array, not a string or number.", "Handle empty or missing input before using it."],
      topics: [mdn("Web/JavaScript/Reference/Errors/Cant_access_property", "Cannot read properties"), mdn("Web/JavaScript/Reference/Errors/Not_a_function", "Not a function")],
    };
  if (name === "RangeError")
    return {
      title: "Range error: too much recursion",
      why: "A function kept calling itself and never stopped, so JavaScript ran out of memory for calls (stack overflow).",
      fix: ["Add a base case: a condition that returns without calling the function again.", "Make sure every recursive call moves closer to that base case."],
      topics: [mdn("Web/JavaScript/Reference/Errors/Too_much_recursion", "Too much recursion"), mdn("Glossary/Recursion", "Recursion")],
    };
  return {
    title: `${name}: ${m}`.slice(0, 120),
    why: "Your code threw an error while running the tests.",
    fix: ["Read the message carefully. It usually names the problem.", "Add console.log lines to find which line fails."],
    topics: [mdn("Web/JavaScript/Guide/Control_flow_and_error_handling", "Error handling")],
  };
}

export const timeoutExplanation: Explanation = {
  title: "Your code ran for too long (possible infinite loop)",
  why: "The program did not finish within 3 seconds. A loop probably never reaches its stopping condition.",
  fix: ["Check that the loop variable changes in every round (i++ or similar).", "Check that the while or for condition can eventually become false.", "Test with a very small input first."],
  topics: [mdn("Web/JavaScript/Guide/Loops_and_iteration", "Loops and iteration")],
};

export function explainWrong(results: TestResult[]): Explanation {
  const undef = results.some((r) => r.got === "undefined");
  return undef
    ? {
        title: "Your function returned undefined",
        why: "The function finished without sending a value back. This usually means the return keyword is missing.",
        fix: ["Add return before the value you want to give back.", "Make sure return is inside the function and also reached for every input."],
        topics: [mdn("Web/JavaScript/Reference/Statements/return", "The return statement")],
      }
    : {
        title: "Wrong answer: the logic needs a small fix",
        why: "Your code runs, but some outputs differ from what is expected. Failing tests are often edge cases such as empty input, repeated values, or capital letters.",
        fix: ["Compare each failing test: your output versus the expected output.", "Try the smallest and the strangest input by hand.", "Use console.log inside the loop to follow the values step by step."],
        topics: [mdn("Web/JavaScript/Guide/Control_flow_and_error_handling", "Conditions and control flow"), mdn("Web/JavaScript/Reference/Global_Objects/Array", "Array methods")],
      };
}
