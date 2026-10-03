import type { TestCase } from "../lib/code-runner";

export type Track = "software" | "analyst" | "cyber";
export type Level = "Easy" | "Medium" | "Hard";

export type Problem = {
  id: string; track: Track; title: string; level: Level; topics: string[];
  fn: string; description: string; starter: string; tests: TestCase[]; hint: string;
};

export const TRACKS: { id: Track; label: string; blurb: string }[] = [
  { id: "software", label: "Software Development", blurb: "Arrays, strings, hash maps and stacks, the basics of every coding round." },
  { id: "analyst", label: "Data Analyst", blurb: "Clean, group and summarise data with JavaScript, the way you would in SQL or pandas." },
  { id: "cyber", label: "Cyber Security", blurb: "Passwords, ciphers, log analysis and input checks used in security work." },
];

const p = (
  id: string, track: Track, level: Level, title: string, topics: string[], fn: string, args: string,
  description: string, hint: string, tests: [unknown[], unknown][],
): Problem => ({
  id, track, level, title, topics, fn, description, hint,
  starter: `function ${fn}(${args}) {\n  // write your code here\n}\n`,
  tests: tests.map(([a, expected]) => ({ args: a, expected })),
});

export const PROBLEMS: Problem[] = [
  /* ---------------- Software Development ---------------- */
  p("sum-array", "software", "Easy", "Sum of an array", ["Arrays", "Loops"], "sumArray", "nums",
    "Return the sum of all numbers in the array. An empty array should return 0.",
    "Start with let total = 0, loop through the array and add each number to total.",
    [[[[1, 2, 3]], 6], [[[]], 0], [[[-2, 5, 10]], 13], [[[7]], 7]]),
  p("reverse-string", "software", "Easy", "Reverse a string", ["Strings"], "reverseString", "text",
    "Return the string written backwards.",
    "Strings can be split into an array with split(''), reversed, and joined back with join('').",
    [[["hello"], "olleh"], [[""], ""], [["a"], "a"], [["Hire Daily"], "yliaD eriH"]]),
  p("palindrome", "software", "Easy", "Palindrome check", ["Strings", "Conditions"], "isPalindrome", "text",
    "Return true if the text reads the same forwards and backwards, ignoring capital letters. Otherwise return false.",
    "Convert to lower case first, then compare the string with its reverse.",
    [[["madam"], true], [["Level"], true], [["hello"], false], [[""], true]]),
  p("fizzbuzz", "software", "Easy", "FizzBuzz", ["Loops", "Conditions"], "fizzBuzz", "n",
    "Return an array for numbers 1 to n. Use 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, 'FizzBuzz' for both, otherwise the number as a string.",
    "Check the 'both' case (divisible by 15) first, then 3, then 5. Use the % operator.",
    [[[3], ["1", "2", "Fizz"]], [[5], ["1", "2", "Fizz", "4", "Buzz"]], [[15], ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]]]),
  p("anagram", "software", "Medium", "Valid anagram", ["Strings", "Hash map"], "isAnagram", "a, b",
    "Return true if the two words use exactly the same letters the same number of times.",
    "Sort the letters of both words and compare, or count letters with an object.",
    [[["listen", "silent"], true], [["rat", "car"], false], [["a", "a"], true], [["aab", "abb"], false]]),
  p("two-sum", "software", "Medium", "Two Sum", ["Arrays", "Hash map"], "twoSum", "nums, target",
    "Return the indexes of the two numbers that add up to target, as [smaller index, larger index]. Exactly one answer exists.",
    "Use an object or Map to remember numbers you have seen and their index, then check if target - current exists.",
    [[[[2, 7, 11, 15], 9], [0, 1]], [[[3, 2, 4], 6], [1, 2]], [[[3, 3], 6], [0, 1]]]),
  p("valid-parentheses", "software", "Medium", "Valid parentheses", ["Stack", "Strings"], "isValid", "text",
    "The text contains only ()[]{} characters. Return true if every bracket is closed by the same type in the correct order.",
    "Push opening brackets on a stack. When you see a closing bracket, the top of the stack must be its pair.",
    [[["()"], true], [["()[]{}"], true], [["(]"], false], [["([)]"], false], [["{[]}"], true]]),
  p("max-subarray", "software", "Hard", "Maximum subarray sum", ["Arrays", "Dynamic programming"], "maxSubArray", "nums",
    "Return the largest sum of any continuous part of the array (at least one number).",
    "Kadane's idea: keep a running sum and reset it to the current number whenever the running sum becomes smaller than that number.",
    [[[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], 6], [[[1]], 1], [[[5, 4, -1, 7, 8]], 23], [[[-3, -2, -1]], -1]]),
  p("longest-substring", "software", "Hard", "Longest substring without repeats", ["Strings", "Sliding window"], "lengthOfLongestSubstring", "text",
    "Return the length of the longest part of the text that has no repeating character.",
    "Use two pointers (a window) and a Map of the last index of each character. Move the left pointer past a repeated character.",
    [[["abcabcbb"], 3], [["bbbbb"], 1], [["pwwkew"], 3], [[""], 0], [["dvdf"], 3]]),

  /* ---------------- Data Analyst ---------------- */
  p("average", "analyst", "Easy", "Average of numbers", ["Statistics", "Arrays"], "average", "nums",
    "Return the mean of the numbers rounded to 2 decimal places. An empty array should return 0.",
    "Add everything, divide by the length, then use Math.round(value * 100) / 100.",
    [[[[1, 2, 3, 4]], 2.5], [[[]], 0], [[[10, 20, 25]], 18.33], [[[5]], 5]]),
  p("count-by", "analyst", "Easy", "Count by category", ["Group by", "Objects"], "countBy", "items",
    "Given an array of text values, return an object with how many times each value appears (keys in order of first appearance).",
    "Loop over the items and do counts[item] = (counts[item] || 0) + 1.",
    [[[["a", "b", "a"]], { a: 2, b: 1 }], [[[]], {}], [[["x", "x", "x"]], { x: 3 }], [[["pune", "mumbai", "pune", "delhi"]], { pune: 2, mumbai: 1, delhi: 1 }]]),
  p("unique", "analyst", "Easy", "Remove duplicates", ["Cleaning", "Arrays"], "removeDuplicates", "values",
    "Return the array without duplicates, keeping the first appearance of each value and the original order.",
    "Use a Set to remember what you have seen, or check with includes().",
    [[[[1, 2, 2, 3, 1]], [1, 2, 3]], [[[]], []], [[["a", "a"]], ["a"]], [[[3, 2, 1]], [3, 2, 1]]]),
  p("top-n", "analyst", "Medium", "Top N by sales", ["Sorting", "ORDER BY"], "topN", "sales, n",
    "Each item is { name, amount }. Return the names of the n items with the highest amount, highest first.",
    "Copy the array with [...sales], sort by b.amount - a.amount, slice the first n and map to names.",
    [[[[{ name: "A", amount: 10 }, { name: "B", amount: 30 }, { name: "C", amount: 20 }], 2], ["B", "C"]], [[[{ name: "X", amount: 5 }], 3], ["X"]], [[[], 1], []]]),
  p("group-sum", "analyst", "Medium", "Group and sum", ["GROUP BY", "Objects"], "groupSum", "rows, key, valueKey",
    "Return an object that sums valueKey for each distinct value of key (keys in order of first appearance).",
    "Like SQL: SELECT key, SUM(valueKey) GROUP BY key. Use an object and add to the running total.",
    [[[[{ city: "Pune", sales: 10 }, { city: "Delhi", sales: 5 }, { city: "Pune", sales: 7 }], "city", "sales"], { Pune: 17, Delhi: 5 }], [[[], "city", "sales"], {}], [[[{ r: "N", v: 1 }, { r: "N", v: 2 }], "r", "v"], { N: 3 }]]),
  p("median", "analyst", "Medium", "Median", ["Statistics", "Sorting"], "median", "nums",
    "Return the median. For an even count, return the average of the two middle numbers. Empty array returns 0.",
    "Sort a copy with (a, b) => a - b. Odd length: middle item. Even length: average of the two middle items.",
    [[[[3, 1, 2]], 2], [[[4, 1, 3, 2]], 2.5], [[[]], 0], [[[10]], 10], [[[1, 100, 3]], 3]]),
  p("pct-change", "analyst", "Hard", "Percentage change", ["Trends", "Arrays"], "percentChange", "values",
    "Return an array with the percentage change of each value compared to the previous one, rounded to 1 decimal. The first item is null.",
    "change = (current - previous) / previous * 100. Round with Math.round(x * 10) / 10.",
    [[[[100, 110, 99]], [null, 10, -10]], [[[50]], [null]], [[[200, 100, 150]], [null, -50, 50]]]),
  p("moving-average", "analyst", "Hard", "Moving average", ["Time series", "Sliding window"], "movingAverage", "values, size",
    "Return the average of every full window of `size` consecutive values, rounded to 2 decimals. If there are fewer values than size, return an empty array.",
    "For each start index i from 0 to length - size, average values.slice(i, i + size).",
    [[[[1, 2, 3, 4, 5], 3], [2, 3, 4]], [[[10, 20], 3], []], [[[1, 2, 4], 2], [1.5, 3]]]),

  /* ---------------- Cyber Security ---------------- */
  p("strong-password", "cyber", "Easy", "Strong password check", ["Passwords", "Strings"], "isStrongPassword", "password",
    "Return true only if the password has at least 8 characters and contains an upper case letter, a lower case letter, a digit and a symbol (anything that is not a letter or digit).",
    "Use regular expressions such as /[A-Z]/.test(password) for each rule.",
    [[["Abcdef1!"], true], [["abcdefg1!"], false], [["Short1!"], false], [["NoDigits!!"], false], [["Passw0rd#2026"], true]]),
  p("caesar", "cyber", "Easy", "Caesar cipher decoder", ["Cryptography", "Strings"], "caesarDecode", "text, shift",
    "The text was shifted forward by `shift` letters. Return the original text. Keep capital letters, and leave non-letters unchanged.",
    "Use charCodeAt and String.fromCharCode. Subtract the shift and wrap around with ((x % 26) + 26) % 26.",
    [[["Khoor", 3], "Hello"], [["Zruog!", 3], "World!"], [["abc", 0], "abc"], [["Bcd", 1], "Abc"]]),
  p("mask-email", "cyber", "Medium", "Mask an email", ["Privacy", "Strings"], "maskEmail", "email",
    "Keep the first letter of the part before @, replace the rest of that part with *, and keep the domain unchanged.",
    "Split at '@'. Rebuild with local[0] + '*'.repeat(local.length - 1) + '@' + domain.",
    [[["john.doe@gmail.com"], "j*******@gmail.com"], [["ab@x.com"], "a*@x.com"], [["a@x.com"], "a@x.com"]]),
  p("failed-logins", "cyber", "Medium", "Detect brute force", ["Logs", "Hash map"], "findFailedLogins", "logs, limit",
    "Each log is 'IP,STATUS' (STATUS is OK or FAIL). Return the IPs with at least `limit` FAIL entries, sorted alphabetically.",
    "Count FAIL per IP in an object, filter by the limit, then sort the keys.",
    [[[["1.1.1.1,FAIL", "1.1.1.1,FAIL", "2.2.2.2,OK", "1.1.1.1,FAIL"], 3], ["1.1.1.1"]], [[["9.9.9.9,FAIL", "3.3.3.3,FAIL", "3.3.3.3,FAIL", "9.9.9.9,FAIL"], 2], ["3.3.3.3", "9.9.9.9"]], [[[], 1], []]]),
  p("sqli", "cyber", "Medium", "Spot SQL injection", ["Web security", "Strings"], "containsSqlInjection", "input",
    "Return true if the lower-cased input contains any of these patterns: \"' or \", \"union select\", \"; drop\" or \"--\". Otherwise return false.",
    "Lower-case the input and test each pattern with includes().",
    [[["admin' OR '1'='1"], true], [["hello world"], false], [["1; DROP TABLE users"], true], [["x UNION SELECT password FROM users"], true], [["John Smith"], false]]),
  p("ipv4", "cyber", "Hard", "Validate an IPv4 address", ["Networking", "Validation"], "isValidIPv4", "ip",
    "Return true if the text has exactly four parts separated by dots, each a whole number from 0 to 255 with no leading zeros (except 0 itself).",
    "Split on '.', check length 4, then test each part with /^(0|[1-9]\\d{0,2})$/ and compare the number with 255.",
    [[["192.168.1.1"], true], [["256.1.1.1"], false], [["1.1.1"], false], [["01.1.1.1"], false], [["0.0.0.0"], true], [["1.2.3.4.5"], false]]),
];

export const problemsOf = (track: Track) => PROBLEMS.filter((x) => x.track === track);
