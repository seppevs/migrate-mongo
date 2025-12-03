# Integration Tests

## Overview

The integration tests validate the full migrate-mongo lifecycle using a real MongoDB instance (via mongodb-memory-server).

## Running Integration Tests

```bash
npm run integration-test
```

## What It Tests

The integration test performs a complete end-to-end workflow:

1. **Initialize** - `migrate-mongo init` creates project structure
2. **Configure** - Updates config to connect to test MongoDB
3. **Seed Data** - Creates `albums` collection with The Beatles
4. **Create Migration** - `migrate-mongo create blacklist-beatles`
5. **Edit Migration** - Adds up/down logic to blacklist/unblacklist
6. **Check Status** - `migrate-mongo status` shows PENDING
7. **Migrate Up** - `migrate-mongo up` applies migration
8. **Verify Up** - Confirms Beatles is blacklisted
9. **Check Status** - Confirms migration is applied
10. **Migrate Down** - `migrate-mongo down` rolls back
11. **Verify Down** - Confirms Beatles is not blacklisted
12. **Check Status** - Confirms migration is PENDING again

## Test Architecture

- **MongoDB**: Uses `mongodb-memory-server` for isolated testing
- **CLI Testing**: Executes the actual `bin/migrate-mongo.js` CLI
- **Temporary Directory**: Creates isolated test directory for each run
- **Cleanup**: Automatically cleans up MongoDB and temp files

## Test Output Example

```
=== Step 1: Initialize project ===
Created: migrate-mongo-config.js

=== Step 2: Update config to use memory server ===
Config updated with MongoDB URI

=== Step 3: Verify initial data ===
Found Beatles album: Abbey Road

=== Step 4: Create migration ===
Created: migrations/20251203205515-blacklist-beatles.js

=== Step 5: Write migration logic ===
Migration logic written

=== Step 6: Check status (should be pending) ===
┌─────────────────────────────────────┬────────────┐
│ Filename                            │ Applied At │
├─────────────────────────────────────┼────────────┤
│ 20251203205515-blacklist-beatles.js │ PENDING    │
└─────────────────────────────────────┴────────────┘

=== Step 7: Run migration UP ===
MIGRATED UP: 20251203205515-blacklist-beatles.js
✓ The Beatles is now blacklisted: true

=== Step 8: Check status (should be applied) ===
✓ Migration recorded in changelog

=== Step 9: Run migration DOWN ===
MIGRATED DOWN: 20251203205515-blacklist-beatles.js
✓ The Beatles is no longer blacklisted: false

=== Step 10: Check status (should be pending again) ===
✓ Migration removed from changelog

=== ✅ Integration test completed successfully! ===
```

## Development

### Running Specific Steps

The test is designed as a single comprehensive workflow, but you can modify it to test specific scenarios:

```javascript
// Focus on just one test
it.only("should run full migration lifecycle", async () => {
  // ...
});

// Skip a test
it.skip("should run full migration lifecycle", async () => {
  // ...
});
```

### Debugging

Add more console.log statements or increase verbosity:

```javascript
const output = execSync(command, {
  cwd,
  encoding: "utf8",
  stdio: "inherit" // Shows real-time output
});
```

### Timeout Configuration

Integration tests have longer timeouts:
- `beforeAll`: 60 seconds (MongoDB startup)
- `afterAll`: 30 seconds (cleanup)
- Main test: 120 seconds (full workflow)

## Why Integration Tests?

Unit tests are great, but integration tests ensure:

✅ **CLI works end-to-end** - Not just library functions  
✅ **Real MongoDB behavior** - Catches driver-specific issues  
✅ **Config file parsing** - Validates actual config format  
✅ **File system operations** - Tests migration file creation  
✅ **Migration lifecycle** - Up, down, and status work together  
✅ **User experience** - Tests what users actually do  

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run integration tests
  run: npm run integration-test
```

The test automatically handles MongoDB setup and cleanup - no external MongoDB required!
