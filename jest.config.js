export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": ["ts-jest", { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: ["/node_modules/(?!(color|color-string|color-convert|color-name)/)"],
  moduleNameMapper: {
    "^@/(.*)\\?script(?:&(?:iife|module))?$": "<rootDir>/src/test/mocks/crxjsScriptPath.ts",
    "^@/lib/browser$": "<rootDir>/src/test/mocks/browser.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^color$": "<rootDir>/src/test/mocks/color.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/src/test/jest.setup.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
};
