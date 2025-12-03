import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./test/setup.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'lib/**/*.js',
      ],
      exclude: [
        'lib/**/*.test.js',
        'lib/migrate-mongo.js',  // Main export file - no logic to test
        'lib/migrate-mongo.cjs', // CommonJS wrapper
        'test/**',
        'node_modules/**',
      ],
    },
    include: [
      'test/**/*.test.js',
    ],
    exclude: [
      'node_modules/**',
    ],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});
