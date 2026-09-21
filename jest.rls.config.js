/**
 * Database tests (RLS + schema behaviour).
 * These require a running Postgres reachable through ALIAPP_TEST_DATABASE_URL.
 * Start one with `npm run db:start` (local cluster) or point it at `supabase start`.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/rls'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['babel-jest', { presets: [['babel-preset-expo', { jsxImportSource: 'react' }]] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  maxWorkers: 1,
};
