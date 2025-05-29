/**
 * Extracts a union type of all values from the properties of an object type `T`.
 *
 * @template T - An object type (typically a Record or an enum-like object).
 * @example
 * type MyObject = { a: "foo", b: "bar", c: 123 };
 * type MyObjectValues = ObjectValues<MyObject>; // "foo" | "bar" | 123
 */
export type ObjectValues<T> = T[keyof T];

/**
 * Creates a union of an object's string values, often used to represent the set of possible values for an enum-like object.
 * Note: The implementation `Object.values(enumObj) as unknown as ObjectValues<T>` returns an array at runtime,
 * but the declared return type `ObjectValues<T>` is a union of the object's property values.
 * This type signature suggests it's intended to represent the set of possible string values from `enumObj`.
 *
 * @template T - An object type where keys are strings and values are strings (e.g., `const MyEnum = { VAL_A: "A", VAL_B: "B" }`).
 * @param {T} enumObj - The object from which to extract values.
 * @returns {ObjectValues<T>} A union type representing all possible string values of the `enumObj`.
 *                            For example, if `enumObj` is `{ A: "valA", B: "valB" }`, the return type is `"valA" | "valB"`.
 *                            (Runtime behavior of `Object.values()` is to return an array like `["valA", "valB"]`).
 */
export function createEnum<T extends Record<string, string>>(enumObj: T) {
  return Object.values(enumObj) as unknown as ObjectValues<T>;
}

/**
 * Creates a union type that includes various case formats (uppercase, lowercase, capitalized, uncapitalized)
 * of a given string literal type `T`.
 *
 * @template T - A string literal type.
 * @example
 * type MyString = "example";
 * type MyStringAnyCase = AnyCase<MyString>; // "EXAMPLE" | "example" | "Example" | "example" (Uncapitalize<"Example"> is "example")
 */
export type AnyCase<T extends string> =
  | Uppercase<T>
  | Lowercase<T>
  | Capitalize<T>
  | Uncapitalize<T>;

/**
 * Creates a union type that includes various case formats (uppercase, lowercase, capitalized, uncapitalized)
 * of the union of two given string literal types `T` and `K`.
 * This is useful for representing a combined set of related string constants where case variations are permitted for each.
 *
 * @template T - A string literal type.
 * @template K - Another string literal type.
 * @example
 * type Lang1 = "english";
 * type Lang2 = "french";
 * type CombinedLangsAnyCase = AnyCaseLanguage<Lang1, Lang2>;
 * // Result includes: "ENGLISH" | "english" | "English" | "FRENCH" | "french" | "French" etc.
 * // for all case variations of "english" and "french".
 */
export type AnyCaseLanguage<T extends string, K extends string> =
  | Uppercase<T | K>
  | Lowercase<T | K>
  | Capitalize<T | K>
  | Uncapitalize<T | K>;

/**
 * Extracts a new object type containing only the keys of `T` whose properties are optional
 * (i.e., their type includes `undefined`). The values associated with these keys retain their original types.
 *
 * @template T - An object type.
 * @example
 * type MyObject = {
 *   requiredProp: string;
 *   optionalProp?: number;
 *   anotherOptional?: boolean | undefined;
 *   nullProp: string | null;
 * };
 * type MyOptionalProps = OptionalKeys<MyObject>;
 * // MyOptionalProps would be conceptually equivalent to:
 * // {
 * //   optionalProp?: number;
 * //   anotherOptional?: boolean | undefined;
 * // }
 * // The actual resulting type is an object type with only these optional keys.
 */
export type OptionalKeys<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};
