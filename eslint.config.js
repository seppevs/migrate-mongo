const mochaPlugin = require("eslint-plugin-mocha");

module.exports = [
  {
    ...mochaPlugin.default.configs.recommended,
    rules: {
      ...mochaPlugin.default.configs.recommended.rules,
      'mocha/no-mocha-arrows': 'off',
      'mocha/consistent-spacing-between-blocks': 'off'
    }
  }
];
