module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.test.js',
    '!lib/migrate-mongo.js',  // Main export file - no logic to test
  ],
  testMatch: [
    '**/test/**/*.test.js',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
};
