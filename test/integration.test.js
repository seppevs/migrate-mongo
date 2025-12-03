const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");
const { execSync } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

describe("Integration Test", () => {
  let mongod;
  let mongoUri;
  let testDir;
  let client;
  let db;

  // Helper to run migrate-mongo CLI commands
  function runMigrateMongo(args, cwd = testDir) {
    const binPath = path.resolve(__dirname, "../bin/migrate-mongo.js");
    const command = `node "${binPath}" ${args}`;
    try {
      const output = execSync(command, {
        cwd,
        encoding: "utf8",
        stdio: "pipe"
      });
      return output;
    } catch (error) {
      console.error("Command failed:", command);
      console.error("Error:", error.message);
      console.error("Stdout:", error.stdout);
      console.error("Stderr:", error.stderr);
      throw error;
    }
  }

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: "integration-test"
      }
    });
    mongoUri = mongod.getUri();

    console.log("MongoDB Memory Server started at:", mongoUri);

    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "migrate-mongo-test-"));
    console.log("Test directory:", testDir);

    // Connect to MongoDB and seed data
    client = await MongoClient.connect(mongoUri);
    db = client.db("integration-test");

    // Create albums collection with The Beatles
    await db.collection("albums").insertOne({
      artist: "The Beatles",
      album: "Abbey Road",
      year: 1969,
      blacklisted: false
    });

    console.log("Seeded albums collection with The Beatles");
  }, 60000); // Increase timeout for MongoDB Memory Server startup

  afterAll(async () => {
    // Close MongoDB connection
    if (client) {
      await client.close();
    }

    // Stop MongoDB Memory Server
    if (mongod) {
      await mongod.stop();
    }

    // Clean up test directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  }, 30000);

  it("should run full migration lifecycle", async () => {
    // Step 1: Initialize project with 'init' command
    console.log("\n=== Step 1: Initialize project ===");
    const initOutput = runMigrateMongo("init");
    expect(initOutput).toContain("Initialization successful");

    // Verify migrate-mongo-config.js was created
    const configPath = path.join(testDir, "migrate-mongo-config.js");
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(configExists).toBe(true);

    // Step 2: Modify config to connect to mongodb-memory-server
    console.log("\n=== Step 2: Update config to use memory server ===");
    const configContent = `
module.exports = {
  mongodb: {
    url: "${mongoUri}",
    databaseName: "integration-test",
    options: {}
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: 'commonjs',
};
`;
    await fs.writeFile(configPath, configContent);
    console.log("Config updated with MongoDB URI:", mongoUri);

    // Step 3: Verify albums collection exists with The Beatles
    console.log("\n=== Step 3: Verify initial data ===");
    const beatlesAlbum = await db.collection("albums").findOne({ artist: "The Beatles" });
    expect(beatlesAlbum).toBeDefined();
    expect(beatlesAlbum.artist).toBe("The Beatles");
    expect(beatlesAlbum.blacklisted).toBe(false);
    console.log("Found Beatles album:", beatlesAlbum.album);

    // Step 4: Create a new migration
    console.log("\n=== Step 4: Create migration ===");
    const createOutput = runMigrateMongo("create blacklist-beatles");
    expect(createOutput).toContain("Created:");
    console.log(createOutput.trim());

    // Find the created migration file
    const migrationsDir = path.join(testDir, "migrations");
    const files = await fs.readdir(migrationsDir);
    const migrationFile = files.find(f => f.includes("blacklist-beatles"));
    expect(migrationFile).toBeDefined();
    console.log("Migration file created:", migrationFile);

    // Step 5: Modify migration to blacklist/unblacklist The Beatles
    console.log("\n=== Step 5: Write migration logic ===");
    const migrationPath = path.join(migrationsDir, migrationFile);
    const migrationContent = `
module.exports = {
  async up(db, client) {
    await db.collection('albums').updateOne(
      { artist: 'The Beatles' },
      { $set: { blacklisted: true } }
    );
  },

  async down(db, client) {
    await db.collection('albums').updateOne(
      { artist: 'The Beatles' },
      { $set: { blacklisted: false } }
    );
  }
};
`;
    await fs.writeFile(migrationPath, migrationContent);
    console.log("Migration logic written");

    // Step 6: Check status - should show pending
    console.log("\n=== Step 6: Check status (should be pending) ===");
    const statusPendingOutput = runMigrateMongo("status");
    expect(statusPendingOutput).toContain("PENDING");
    expect(statusPendingOutput).toContain(migrationFile);
    console.log(statusPendingOutput.trim());

    // Step 7: Run migration up
    console.log("\n=== Step 7: Run migration UP ===");
    const upOutput = runMigrateMongo("up");
    expect(upOutput).toContain("MIGRATED UP");
    expect(upOutput).toContain(migrationFile);
    console.log(upOutput.trim());

    // Verify The Beatles is now blacklisted
    const blacklistedAlbum = await db.collection("albums").findOne({ artist: "The Beatles" });
    expect(blacklistedAlbum.blacklisted).toBe(true);
    console.log("✓ The Beatles is now blacklisted:", blacklistedAlbum.blacklisted);

    // Step 8: Check status - should show applied
    console.log("\n=== Step 8: Check status (should be applied) ===");
    const statusAppliedOutput = runMigrateMongo("status");
    expect(statusAppliedOutput).toContain(migrationFile);
    expect(statusAppliedOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // Should have timestamp
    console.log(statusAppliedOutput.trim());

    // Verify changelog collection
    const changelog = await db.collection("changelog").findOne({ fileName: migrationFile });
    expect(changelog).toBeDefined();
    expect(changelog.appliedAt).toBeDefined();
    console.log("✓ Migration recorded in changelog at:", changelog.appliedAt);

    // Step 9: Run migration down
    console.log("\n=== Step 9: Run migration DOWN ===");
    const downOutput = runMigrateMongo("down");
    expect(downOutput).toContain("MIGRATED DOWN");
    expect(downOutput).toContain(migrationFile);
    console.log(downOutput.trim());

    // Verify The Beatles is no longer blacklisted
    const restoredAlbum = await db.collection("albums").findOne({ artist: "The Beatles" });
    expect(restoredAlbum.blacklisted).toBe(false);
    console.log("✓ The Beatles is no longer blacklisted:", restoredAlbum.blacklisted);

    // Step 10: Check status - should show pending again
    console.log("\n=== Step 10: Check status (should be pending again) ===");
    const statusPendingAgainOutput = runMigrateMongo("status");
    expect(statusPendingAgainOutput).toContain("PENDING");
    expect(statusPendingAgainOutput).toContain(migrationFile);
    console.log(statusPendingAgainOutput.trim());

    // Verify changelog is empty
    const changelogAfterDown = await db.collection("changelog").findOne({ fileName: migrationFile });
    expect(changelogAfterDown).toBeNull();
    console.log("✓ Migration removed from changelog");

    console.log("\n=== ✅ Integration test completed successfully! ===");
  }, 120000); // 2 minute timeout for the full test
});
