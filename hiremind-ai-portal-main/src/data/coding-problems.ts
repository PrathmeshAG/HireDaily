import type { TestCase } from "../lib/code-runner";

export type Problem = {
  id: string; title: string; level: "Easy" | "Medium"; topics: string[];
  fn: string; description: string; starter: string; tests: TestCase[]; hint: string;
};

export const PROBLEMS: Problem[] = [
  {
    id: "sum-array", title: "Sum of an array", level: "Easy", topics: ["Arrays", "Loops"], fn: "sumArray",
    description: "Return the sum of all numbers in the array. An empty array should return 0.",
    starter: "function sumArray(nums) {\n  // write your code here\n}\n",
    tests: [{ args: [[1, 2, 3]], expected: 6 }, { args: [[]], expected: 0 }, { args: [[-2, 5, 10]], expected: 13 }, { args: [[7]], expected: 7 }],
    hint: "Start with let total = 0, loop through the array and add each number to total.",
  },
  {
    id: "reverse-string", title: "Reverse a string", level: "Easy", topics: ["Strings"], fn: "reverseString",
    description: "Return the string written backwards.",
    starter: "function reverseString(text) {\n  // write your code here\n}\n",
    tests: [{ args: ["hello"], expected: "olleh" }, { args: [""], expected: "" }, { args: ["a"], expected: "a" }, { args: ["Hire Daily"], expected: "yliaD eriH" }],
    hint: "Strings can be split into an array with split(''), reversed, and joined back with join('').",
  },
  {
    id: "palindrome", title: "Palindrome check", level: "Easy", topics: ["Strings", "Conditions"], fn: "isPalindrome",
    description: "Return true if the text reads the same forwards and backwards, ignoring capital letters. Otherwise return false.",
    starter: "function isPalindrome(text) {\n  // write your code here\n}\n",
    tests: [{ args: ["madam"], expected: true }, { args: ["Level"], expected: true }, { args: ["hello"], expected: false }, { args: [""], expected: true }],
    hint: "Convert to lower case first, then compare the string with its reverse.",
  },
  {
    id: "fizzbuzz", title: "FizzBuzz", level: "Easy", topics: ["Loops", "Conditions"], fn: "fizzBuzz",
    description: "Return an array for numbers 1 to n. Use 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, 'FizzBuzz' for both, otherwise the number as a string.",
    starter: "function fizzBuzz(n) {\n  // write your code here\n}\n",
    tests: [{ args: [3], expected: ["1", "2", "Fizz"] }, { args: [5], expected: ["1", "2", "Fizz", "4", "Buzz"] }, { args: [15], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"] }],
    hint: "Check the 'both' case (divisible by 15) first, then 3, then 5. Use the % operator.",
  },
  {
    id: "two-sum", title: "Two Sum", level: "Medium", topics: ["Arrays", "Hash map"], fn: "twoSum",
    description: "Return the indexes of the two numbers that add up to target, as [smaller index, larger index]. Exactly one answer exists.",
    starter: "function twoSum(nums, target) {\n  // write your code here\n}\n",
    tests: [{ args: [[2, 7, 11, 15], 9], expected: [0, 1] }, { args: [[3, 2, 4], 6], expected: [1, 2] }, { args: [[3, 3], 6], expected: [0, 1] }],
    hint: "Use an object or Map to remember numbers you have seen and their index, then check if target - current exists.",
  },
  {
    id: "valid-parentheses", title: "Valid parentheses", level: "Medium", topics: ["Stack", "Strings"], fn: "isValid",
    description: "The text contains only ()[]{} characters. Return true if every bracket is closed by the same type in the correct order.",
    starter: "function isValid(text) {\n  // write your code here\n}\n",
    tests: [{ args: ["()"], expected: true }, { args: ["()[]{}"], expected: true }, { args: ["(]"], expected: false }, { args: ["([)]"], expected: false }, { args: ["{[]}"], expected: true }],
    hint: "Push opening brackets on a stack. When you see a closing bracket, the top of the stack must be its pair.",
  },
];
