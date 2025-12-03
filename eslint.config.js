import vitestPlugin from "eslint-plugin-vitest";

export default [
  {
    files: ["test/**/*.js"],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      'vitest/prefer-expect-assertions': 'off',
      'vitest/no-conditional-expect': 'off', // We use expect in try/catch blocks
      'vitest/expect-expect': 'off', // We use expect.rejects and expect.resolves
      'vitest/valid-title': 'warn', // Allow duplicate prefixes in nested describes
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/valid-expect': 'error'
    },
    languageOptions: {
      globals: {
        ...vitestPlugin.environments.env.globals,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
  }
];
