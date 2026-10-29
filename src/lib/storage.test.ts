import { describe, expect, test } from "vitest";

import { readItem, removeItem, writeItem } from "./storage";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

function throwingStorage(): Storage {
  const fail = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

describe("readItem / writeItem / removeItem", () => {
  test("書いた値を読める。ない値は null", () => {
    const storage = memoryStorage();

    expect(writeItem(storage, "k", "v")).toBe(true);
    expect(readItem(storage, "k")).toEqual({ ok: true, value: "v" });
    expect(readItem(storage, "none")).toEqual({ ok: true, value: null });
    expect(removeItem(storage, "k")).toBe(true);
    expect(readItem(storage, "k")).toEqual({ ok: true, value: null });
  });

  test("AC-22: 保存が禁止されているときは、例外ではなく失敗として返す", () => {
    const storage = throwingStorage();

    expect(readItem(storage, "k")).toEqual({ ok: false });
    expect(writeItem(storage, "k", "v")).toBe(false);
    expect(removeItem(storage, "k")).toBe(false);
  });
});
