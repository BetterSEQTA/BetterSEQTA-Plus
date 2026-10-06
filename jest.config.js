export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/scripts/agent-audit/lib/**/*.test.js',
    '**/scripts/agent-audit/report-html.test.js'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(color|color-string|color-convert|color-name)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^color$': '<rootDir>/src/test/mocks/color.ts',
    '^webextension-polyfill$': '<rootDir>/src/test/mocks/webextension-polyfill.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
}; 
