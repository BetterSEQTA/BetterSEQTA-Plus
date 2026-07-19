import isEqual from "./isEqual";

describe("isEqual", () => {
  it("treats primitives by value", () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual("a", "a")).toBe(true);
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(undefined, undefined)).toBe(true);
    expect(isEqual(null, undefined)).toBe(false);
  });

  it("compares flat objects deeply", () => {
    expect(isEqual({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("compares arrays deeply", () => {
    expect(isEqual([1, { x: 2 }], [1, { x: 2 }])).toBe(true);
    expect(isEqual([1, 2], [1, 3])).toBe(false);
    expect(isEqual([1], [1, 2])).toBe(false);
  });
});
