import { expect, test } from "vitest";

import { isTextEntry } from "./typing";

function input(type?: string) {
  const element = document.createElement("input");
  if (type !== undefined) {
    element.type = type;
  }
  return element;
}

test.each([
  ["textarea", document.createElement("textarea")],
  ["input（type なし）", input()],
  ["input type=text", input("text")],
  ["input type=email", input("email")],
  ["input type=search", input("search")],
])("AC-9: %s は文字を打つ欄", (_, element) => {
  expect(isTextEntry(element)).toBe(true);
});

test.each([
  ["input type=checkbox", input("checkbox")],
  ["input type=radio", input("radio")],
  ["input type=button", input("button")],
  ["input type=submit", input("submit")],
  ["button", document.createElement("button")],
  ["a", document.createElement("a")],
  ["何も選ばれていない", null],
])("AC-9: %s は文字を打つ欄ではない", (_, element) => {
  expect(isTextEntry(element)).toBe(false);
});
