const jestPlugin = require("eslint-plugin-jest");

module.exports = [
  {
    files: ["test/**/*.js"],
    ...jestPlugin.configs['flat/recommended'],
    rules: {
      ...jestPlugin.configs['flat/recommended'].rules,
      'jest/prefer-expect-assertions': 'off',
      'jest/no-conditional-expect': 'off', // We use expect in try/catch blocks
      'jest/expect-expect': 'off', // We use expect.rejects and expect.resolves
      'jest/valid-title': 'warn', // Allow duplicate prefixes in nested describes
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/valid-expect': 'error'
    }
  }
];
