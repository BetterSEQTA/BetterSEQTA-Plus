export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
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
    '^webextension-polyfill$': '<rootDir>/src/test/mocks/webextension-polyfill.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
}; 