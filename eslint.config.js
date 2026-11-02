import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/*.d.ts"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,ts}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        __ENABLE_GH_RELEASE_UPDATE_CHECK__: "readonly",
        __GH_RELEASE_REPO__: "readonly",
        __UPDATE_CHANNEL__: "readonly",
        __BUILD_LABEL__: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-useless-escape": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-case-declarations": "off",
      "no-irregular-whitespace": "off",
      "no-async-promise-executor": "off",
    },
  },
];
