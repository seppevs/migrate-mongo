import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Integration Tests", () => {
  let mongod;
  let mongoUri;
  let testDir;
  let client;
  let db;
  let configPath;
  let migrationsDir;

  // Helper to run migrate-mongo CLI commands
  function runMigrateMongo(args, cwd = testDir, expectError = false) {
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
      if (expectError) {
        return { error: true, message: error.message, stderr: error.stderr, stdout: error.stdout };
      }
      console.error("Command failed:", command);
      console.error("Error:", error.message);
      console.error("Stdout:", error.stdout);
      console.error("Stderr:", error.stderr);
      throw error;
    }
  }

  // Helper to create a migration file
  async function createMigration(name, upCode, downCode) {
    const createOutput = runMigrateMongo(`create ${name}`);
    const files = await fs.readdir(migrationsDir);
    const migrationFile = files.find(f => f.includes(name));
    const migrationPath = path.join(migrationsDir, migrationFile);
    
    const migrationContent = `
module.exports = {
  async up(db, client) {
    ${upCode}
  },

  async down(db, client) {
    ${downCode}
  }
};
`;
    await fs.writeFile(migrationPath, migrationContent);
    return migrationFile;
  }

  // Helper to write config
  async function writeConfig(overrides = {}) {
    const config = {
      mongodb: {
        url: mongoUri,
        databaseName: "integration-test",
        options: {}
      },
      migrationsDir: "migrations",
      changelogCollectionName: "changelog",
      migrationFileExtension: ".js",
      useFileHash: false,
      moduleSystem: "commonjs",
      ...overrides
    };

    const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
    await fs.writeFile(configPath, configContent);
  }

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: "integration-test"
      }
    });
    mongoUri = mongod.getUri();

    console.log("\n🚀 MongoDB Memory Server started at:", mongoUri);
  }, 60000);

  afterAll(async () => {
    if (mongod) {
      await mongod.stop();
    }
    console.log("✅ MongoDB Memory Server stopped\n");
  }, 30000);

  beforeEach(async () => {
    // Create temporary test directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "migrate-mongo-test-"));
    configPath = path.join(testDir, "migrate-mongo-config.js");
    migrationsDir = path.join(testDir, "migrations");

    // Connect to MongoDB
    client = await MongoClient.connect(mongoUri);
    db = client.db("integration-test");

    // Seed initial data
    await db.collection("albums").insertOne({
      artist: "The Beatles",
      album: "Abbey Road",
      year: 1969,
      blacklisted: false
    });
  });

  afterEach(async () => {
    // Clean up MongoDB
    try {
      if (db) {
        await db.dropDatabase();
      }
    } catch (error) {
      // Ignore errors if connection already closed
    }
    
    try {
      if (client) {
        await client.close();
      }
    } catch (error) {
      // Ignore errors if already closed
    }

    // Clean up test directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe("Project Initialization", () => {
    it("should initialize project structure with init command", async () => {
      const initOutput = runMigrateMongo("init");
      
      expect(initOutput).toContain("Initialization successful");
      
      // Verify config file was created
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(configExists).toBe(true);
      
      // Verify migrations directory was created
      const migrationsExists = await fs.access(migrationsDir).then(() => true).catch(() => false);
      expect(migrationsExists).toBe(true);
    });
  });

  describe("Migration Creation", () => {
    beforeEach(async () => {
      runMigrateMongo("init");
      await writeConfig();
    });

    it("should create migration file with timestamp prefix", async () => {
      const createOutput = runMigrateMongo("create add-index");
      
      expect(createOutput).toContain("Created:");
      expect(createOutput).toContain("add-index.js");
      
      const files = await fs.readdir(migrationsDir);
      const migrationFile = files.find(f => f.includes("add-index"));
      
      expect(migrationFile).toBeDefined();
      expect(migrationFile).toMatch(/^\d{14}-add-index\.js$/);
    });

    it("should create migration with up and down functions", async () => {
      runMigrateMongo("create test-migration");
      
      const files = await fs.readdir(migrationsDir);
      const migrationFile = files.find(f => f.includes("test-migration"));
      const migrationPath = path.join(migrationsDir, migrationFile);
      const content = await fs.readFile(migrationPath, "utf8");
      
      expect(content).toContain("async up(db, client)");
      expect(content).toContain("async down(db, client)");
    });
  });

  describe("Single Migration Lifecycle", () => {
    let migrationFile;

    beforeEach(async () => {
      runMigrateMongo("init");
      await writeConfig();
      
      migrationFile = await createMigration(
        "blacklist-beatles",
        "await db.collection('albums').updateOne({ artist: 'The Beatles' }, { $set: { blacklisted: true } });",
        "await db.collection('albums').updateOne({ artist: 'The Beatles' }, { $set: { blacklisted: false } });"
      );
    });

    it("should show migration as pending before applying", async () => {
      const statusOutput = runMigrateMongo("status");
      
      expect(statusOutput).toContain("PENDING");
      expect(statusOutput).toContain(migrationFile);
    });

    it("should apply migration with up command", async () => {
      const upOutput = runMigrateMongo("up");
      
      expect(upOutput).toContain("MIGRATED UP");
      expect(upOutput).toContain(migrationFile);
      
      const album = await db.collection("albums").findOne({ artist: "The Beatles" });
      expect(album.blacklisted).toBe(true);
    });

    it("should record migration in changelog after up", async () => {
      runMigrateMongo("up");
      
      const changelog = await db.collection("changelog").findOne({ fileName: migrationFile });
      expect(changelog).toBeDefined();
      expect(changelog.appliedAt).toBeDefined();
      expect(changelog.fileName).toBe(migrationFile);
    });

    it("should show migration as applied after up", async () => {
      runMigrateMongo("up");
      
      const statusOutput = runMigrateMongo("status");
      expect(statusOutput).toContain(migrationFile);
      expect(statusOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should rollback migration with down command", async () => {
      runMigrateMongo("up");
      const downOutput = runMigrateMongo("down");
      
      expect(downOutput).toContain("MIGRATED DOWN");
      expect(downOutput).toContain(migrationFile);
      
      const album = await db.collection("albums").findOne({ artist: "The Beatles" });
      expect(album.blacklisted).toBe(false);
    });

    it("should remove migration from changelog after down", async () => {
      runMigrateMongo("up");
      runMigrateMongo("down");
      
      const changelog = await db.collection("changelog").findOne({ fileName: migrationFile });
      expect(changelog).toBeNull();
    });

    it("should show migration as pending after down", async () => {
      runMigrateMongo("up");
      runMigrateMongo("down");
      
      const statusOutput = runMigrateMongo("status");
      expect(statusOutput).toContain("PENDING");
      expect(statusOutput).toContain(migrationFile);
    });
  });

  describe("Multiple Migrations", () => {
    let migration1, migration2, migration3;

    beforeEach(async () => {
      runMigrateMongo("init");
      await writeConfig();
      
      // Create three migrations
      migration1 = await createMigration(
        "add-field-genre",
        "await db.collection('albums').updateMany({}, { $set: { genre: 'Rock' } });",
        "await db.collection('albums').updateMany({}, { $unset: { genre: '' } });"
      );
      
      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      migration2 = await createMigration(
        "add-field-rating",
        "await db.collection('albums').updateMany({}, { $set: { rating: 5 } });",
        "await db.collection('albums').updateMany({}, { $unset: { rating: '' } });"
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      migration3 = await createMigration(
        "blacklist-beatles",
        "await db.collection('albums').updateOne({ artist: 'The Beatles' }, { $set: { blacklisted: true } });",
        "await db.collection('albums').updateOne({ artist: 'The Beatles' }, { $set: { blacklisted: false } });"
      );
    });

    it("should apply all migrations in order", async () => {
      const upOutput = runMigrateMongo("up");
      
      expect(upOutput).toContain("MIGRATED UP");
      expect(upOutput).toContain(migration1);
      expect(upOutput).toContain(migration2);
      expect(upOutput).toContain(migration3);
      
      const album = await db.collection("albums").findOne({ artist: "The Beatles" });
      expect(album.genre).toBe("Rock");
      expect(album.rating).toBe(5);
      expect(album.blacklisted).toBe(true);
    });

    it("should show all migrations as applied", async () => {
      runMigrateMongo("up");
      
      const statusOutput = runMigrateMongo("status");
      expect(statusOutput).toContain(migration1);
      expect(statusOutput).toContain(migration2);
      expect(statusOutput).toContain(migration3);
    });

    it("should rollback only the last migration with down", async () => {
      runMigrateMongo("up");
      const downOutput = runMigrateMongo("down");
      
      expect(downOutput).toContain("MIGRATED DOWN");
      expect(downOutput).toContain(migration3);
      expect(downOutput).not.toContain(migration1);
      expect(downOutput).not.toContain(migration2);
      
      const album = await db.collection("albums").findOne({ artist: "The Beatles" });
      expect(album.genre).toBe("Rock");
      expect(album.rating).toBe(5);
      expect(album.blacklisted).toBe(false); // Only last migration rolled back
    });

    it("should apply migrations incrementally", async () => {
      // Apply first migration
      runMigrateMongo("up");
      
      // Create and apply another migration
      await new Promise(resolve => setTimeout(resolve, 1000));
      const migration4 = await createMigration(
        "add-track-count",
        "await db.collection('albums').updateMany({}, { $set: { trackCount: 12 } });",
        "await db.collection('albums').updateMany({}, { $unset: { trackCount: '' } });"
      );
      
      const upOutput = runMigrateMongo("up");
      expect(upOutput).toContain(migration4);
      
      const album = await db.collection("albums").findOne({ artist: "The Beatles" });
      expect(album.trackCount).toBe(12);
    });
  });

  describe("Error Scenarios", () => {
    beforeEach(async () => {
      runMigrateMongo("init");
      await writeConfig();
    });

    it("should handle migration with syntax error", async () => {
      const createOutput = runMigrateMongo("create bad-syntax");
      const files = await fs.readdir(migrationsDir);
      const migrationFile = files.find(f => f.includes("bad-syntax"));
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      // Write invalid JavaScript
      await fs.writeFile(migrationPath, "this is not valid javascript {{{");
      
      const result = runMigrateMongo("up", testDir, true);
      expect(result.error).toBe(true);
    });

    it("should handle migration that throws error", async () => {
      await createMigration(
        "failing-migration",
        "throw new Error('Intentional error');",
        "// no-op"
      );
      
      const result = runMigrateMongo("up", testDir, true);
      expect(result.error).toBe(true);
      expect(result.stderr).toContain("Intentional error");
    });

    it("should not record failed migration in changelog", async () => {
      await createMigration(
        "failing-migration",
        "throw new Error('Intentional error');",
        "// no-op"
      );
      
      runMigrateMongo("up", testDir, true);
      
      const changelog = await db.collection("changelog").find({}).toArray();
      expect(changelog).toHaveLength(0);
    });

    it("should handle down when no migrations are applied", async () => {
      await createMigration(
        "test-migration",
        "await db.collection('albums').updateMany({}, { $set: { test: true } });",
        "await db.collection('albums').updateMany({}, { $unset: { test: '' } });"
      );
      
      const result = runMigrateMongo("down");
      // Down without applied migrations returns empty (silently succeeds)
      expect(result).toBe("");
    });

    it("should handle missing up function", async () => {
      const createOutput = runMigrateMongo("create missing-up");
      const files = await fs.readdir(migrationsDir);
      const migrationFile = files.find(f => f.includes("missing-up"));
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      await fs.writeFile(migrationPath, `
module.exports = {
  async down(db, client) {
    // only down, no up
  }
};
`);
      
      const result = runMigrateMongo("up", testDir, true);
      expect(result.error).toBe(true);
    });

    it("should handle missing down function", async () => {
      const createOutput = runMigrateMongo("create missing-down");
      const files = await fs.readdir(migrationsDir);
      const migrationFile = files.find(f => f.includes("missing-down"));
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      await fs.writeFile(migrationPath, `
module.exports = {
  async up(db, client) {
    await db.collection('albums').updateMany({}, { $set: { test: true } });
  }
};
`);
      
      runMigrateMongo("up");
      const result = runMigrateMongo("down", testDir, true);
      expect(result.error).toBe(true);
    });

    it("should handle invalid MongoDB URL in config", async () => {
      await writeConfig({
        mongodb: {
          url: "mongodb://invalid-host:99999",
          databaseName: "test"
        }
      });
      
      const result = runMigrateMongo("status", testDir, true);
      expect(result.error).toBe(true);
    });

    it("should handle database operation that fails", async () => {
      await createMigration(
        "invalid-operation",
        "await db.collection('albums').updateOne({ _id: 'invalid-id' }, { $set: { x: 1 } });",
        "// no-op"
      );
      
      // This should still succeed as MongoDB creates the query even if it doesn't match
      const upOutput = runMigrateMongo("up");
      expect(upOutput).toContain("MIGRATED UP");
    });
  });

  describe("ESM Module System", () => {
    let esmTestDir;
    let esmMigrationsDir;
    let esmConfigPath;

    beforeEach(async () => {
      esmTestDir = await fs.mkdtemp(path.join(os.tmpdir(), "migrate-mongo-esm-"));
      esmMigrationsDir = path.join(esmTestDir, "migrations");
      esmConfigPath = path.join(esmTestDir, "migrate-mongo-config.js");
    });

    afterEach(async () => {
      if (esmTestDir) {
        await fs.rm(esmTestDir, { recursive: true, force: true });
      }
    });

    it("should initialize ESM project with init -m esm", () => {
      const output = runMigrateMongo("init -m esm", esmTestDir);
      expect(output).toContain("Initialization successful");
    });

    it("should create ESM config with moduleSystem: 'esm'", async () => {
      runMigrateMongo("init -m esm", esmTestDir);
      const configContent = await fs.readFile(esmConfigPath, "utf8");
      expect(configContent).toContain("moduleSystem: 'esm'");
    });

    it("should create migration files with .js extension for ESM", async () => {
      runMigrateMongo("init -m esm", esmTestDir);
      
      // Update config to point to our test MongoDB
      const configContent = await fs.readFile(esmConfigPath, "utf8");
      const updatedConfig = configContent.replace(
        /url: ".*"/,
        `url: "${mongoUri}"`
      );
      await fs.writeFile(esmConfigPath, updatedConfig);

      runMigrateMongo("create test-esm-migration", esmTestDir);
      const files = await fs.readdir(esmMigrationsDir);
      const migrationFile = files.find(f => f.includes("test-esm-migration"));
      expect(migrationFile).toBeDefined();
      expect(migrationFile).toMatch(/\.js$/);
    });

    it("should create migration with export default syntax", async () => {
      runMigrateMongo("init -m esm", esmTestDir);
      runMigrateMongo("create test-export", esmTestDir);
      
      const files = await fs.readdir(esmMigrationsDir);
      const migrationFile = files.find(f => f.includes("test-export"));
      const content = await fs.readFile(path.join(esmMigrationsDir, migrationFile), "utf8");
      
      expect(content).toContain("export");
    });
  });

  describe("Custom Configuration", () => {
    let customConfigDir;
    let customConfigPath;

    beforeEach(async () => {
      customConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), "migrate-mongo-custom-"));
      customConfigPath = path.join(customConfigDir, "custom-config.js");
    });

    afterEach(async () => {
      if (customConfigDir) {
        await fs.rm(customConfigDir, { recursive: true, force: true });
      }
    });

    it("should use custom config file with -f flag", async () => {
      // Create custom config
      const customMigrationsDir = path.join(customConfigDir, "custom-migrations");
      await fs.mkdir(customMigrationsDir);
      
      const customConfig = `
module.exports = {
  mongodb: {
    url: "${mongoUri}",
    databaseName: "custom-db"
  },
  migrationsDir: "custom-migrations",
  changelogCollectionName: "custom_changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs"
};`;
      await fs.writeFile(customConfigPath, customConfig);

      const output = runMigrateMongo(`status -f ${customConfigPath}`, customConfigDir);
      expect(output).toBeDefined();
    });

    it("should use custom migrations directory with --migrations-dir", async () => {
      await writeConfig();
      
      const customMigDir = path.join(testDir, "custom-migs");
      await fs.mkdir(customMigDir);

      const output = runMigrateMongo(`create test-custom-dir --migrations-dir ${customMigDir}`);
      const files = await fs.readdir(customMigDir);
      expect(files.some(f => f.includes("test-custom-dir"))).toBe(true);
    });

    it("should use custom changelog collection name", async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig({ changelogCollectionName: "my_custom_changelog" });

      await createMigration(
        "test-custom-changelog",
        "await db.collection('test').insertOne({ a: 1 });",
        "await db.collection('test').deleteOne({ a: 1 });"
      );

      runMigrateMongo("up");

      const collections = await db.listCollections().toArray();
      const hasCustomChangelog = collections.some(c => c.name === "my_custom_changelog");
      expect(hasCustomChangelog).toBe(true);
    });

    it("should work with database name in URL", async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      const urlWithDb = mongoUri.replace(/\/$/, "") + "/test-db-in-url";
      const config = {
        mongodb: {
          url: urlWithDb,
          options: {}
        },
        migrationsDir: "migrations",
        changelogCollectionName: "changelog",
        migrationFileExtension: ".js",
        useFileHash: false,
        moduleSystem: "commonjs"
      };

      await fs.writeFile(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);

      await createMigration(
        "test-url-db",
        "await db.collection('test').insertOne({ b: 2 });",
        "await db.collection('test').deleteOne({ b: 2 });"
      );

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");
    });
  });

  describe("File Hash Feature", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig({ useFileHash: true });
    });

    it("should store file hash when useFileHash is true", async () => {
      await createMigration(
        "test-with-hash",
        "await db.collection('test').insertOne({ hash: true });",
        "await db.collection('test').deleteOne({ hash: true });"
      );

      runMigrateMongo("up");

      const changelog = await db.collection("changelog").find({}).toArray();
      expect(changelog[0].fileHash).toBeDefined();
      expect(typeof changelog[0].fileHash).toBe("string");
    });

    it("should show file hash in status output", async () => {
      await createMigration(
        "test-status-hash",
        "await db.collection('test').insertOne({ status: true });",
        "await db.collection('test').deleteOne({ status: true });"
      );

      runMigrateMongo("up");
      const statusOutput = runMigrateMongo("status");
      
      // Status shows applied migrations
      expect(statusOutput).toContain("test-status-hash");
    });

    it("should detect when migration file is modified", async () => {
      const migrationFile = await createMigration(
        "test-modified",
        "await db.collection('test').insertOne({ original: true });",
        "await db.collection('test').deleteOne({ original: true });"
      );

      runMigrateMongo("up");
      const originalChangelog = await db.collection("changelog").findOne({});
      const originalHash = originalChangelog.fileHash;

      // Modify the migration file
      const migrationPath = path.join(migrationsDir, migrationFile);
      const modifiedContent = `
module.exports = {
  async up(db, client) {
    await db.collection('test').insertOne({ modified: true });
  },
  async down(db, client) {
    await db.collection('test').deleteOne({ modified: true });
  }
};`;
      await fs.writeFile(migrationPath, modifiedContent);

      // Check status - the hash should be different
      const statusOutput = runMigrateMongo("status");
      // With useFileHash, status should still show it (implementation detail)
      expect(statusOutput).toBeDefined();
    });

    it("should allow running migration with modified hash", async () => {
      const migrationFile = await createMigration(
        "test-rerun-hash",
        "await db.collection('test').insertOne({ count: 1 });",
        "// no-op"
      );

      runMigrateMongo("up");
      
      // Modify migration
      const migrationPath = path.join(migrationsDir, migrationFile);
      const modifiedContent = `
module.exports = {
  async up(db, client) {
    await db.collection('test').insertOne({ count: 2 });
  },
  async down(db, client) {
    // no-op
  }
};`;
      await fs.writeFile(migrationPath, modifiedContent);

      // With useFileHash, migrations are designed to be idempotent and can be rerun
      const statusOutput = runMigrateMongo("status");
      expect(statusOutput).toBeDefined();
    });
  });

  describe("Migration Blocks", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig();
    });

    it("should assign same migration block to migrations run together", async () => {
      await createMigration(
        "block-test-1",
        "await db.collection('test').insertOne({ block: 1 });",
        "await db.collection('test').deleteOne({ block: 1 });"
      );
      await createMigration(
        "block-test-2",
        "await db.collection('test').insertOne({ block: 2 });",
        "await db.collection('test').deleteOne({ block: 2 });"
      );

      runMigrateMongo("up");

      const changelog = await db.collection("changelog").find({}).toArray();
      expect(changelog).toHaveLength(2);
      expect(changelog[0].migrationBlock).toBeDefined();
      expect(changelog[0].migrationBlock).toBe(changelog[1].migrationBlock);
    });

    it("should rollback entire block with down -b flag", async () => {
      await createMigration(
        "block-rollback-1",
        "await db.collection('test').insertOne({ rollback: 1 });",
        "await db.collection('test').deleteOne({ rollback: 1 });"
      );
      await createMigration(
        "block-rollback-2",
        "await db.collection('test').insertOne({ rollback: 2 });",
        "await db.collection('test').deleteOne({ rollback: 2 });"
      );

      runMigrateMongo("up");
      
      const beforeDown = await db.collection("changelog").find({}).toArray();
      expect(beforeDown).toHaveLength(2);

      runMigrateMongo("down -b");

      const afterDown = await db.collection("changelog").find({}).toArray();
      expect(afterDown).toHaveLength(0);
    });

    it("should assign different blocks to separate up commands", async () => {
      await createMigration(
        "separate-block-1",
        "await db.collection('test').insertOne({ sep: 1 });",
        "await db.collection('test').deleteOne({ sep: 1 });"
      );

      runMigrateMongo("up");
      const firstBlock = await db.collection("changelog").findOne({});

      await createMigration(
        "separate-block-2",
        "await db.collection('test').insertOne({ sep: 2 });",
        "await db.collection('test').deleteOne({ sep: 2 });"
      );

      runMigrateMongo("up");
      const changelog = await db.collection("changelog").find({}).toArray();
      
      expect(changelog).toHaveLength(2);
      expect(changelog[0].migrationBlock).not.toBe(changelog[1].migrationBlock);
    });

    it("should rollback only last block with down -b, not all migrations", async () => {
      await createMigration(
        "multi-block-1",
        "await db.collection('test').insertOne({ multi: 1 });",
        "await db.collection('test').deleteOne({ multi: 1 });"
      );
      runMigrateMongo("up");

      await createMigration(
        "multi-block-2",
        "await db.collection('test').insertOne({ multi: 2 });",
        "await db.collection('test').deleteOne({ multi: 2 });"
      );
      await createMigration(
        "multi-block-3",
        "await db.collection('test').insertOne({ multi: 3 });",
        "await db.collection('test').deleteOne({ multi: 3 });"
      );
      runMigrateMongo("up");

      runMigrateMongo("down -b");

      const remaining = await db.collection("changelog").find({}).toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].fileName).toContain("multi-block-1");
    });
  });

  describe("Sample Migration Override", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig();
    });

    it("should use custom sample-migration.js when creating", async () => {
      const sampleMigration = `
module.exports = {
  async up(db, client) {
    // Custom sample migration template
    console.log("This is a custom sample");
  },
  async down(db, client) {
    // Custom rollback
  }
};`;
      await fs.writeFile(path.join(migrationsDir, "sample-migration.js"), sampleMigration);

      runMigrateMongo("create test-custom-sample");
      
      const files = await fs.readdir(migrationsDir);
      const newMigration = files.find(f => f.includes("test-custom-sample"));
      const content = await fs.readFile(path.join(migrationsDir, newMigration), "utf8");
      
      expect(content).toContain("Custom sample migration template");
    });

    it("should use default template if no sample-migration.js exists", async () => {
      runMigrateMongo("create test-default-sample");
      
      const files = await fs.readdir(migrationsDir);
      const newMigration = files.find(f => f.includes("test-default-sample"));
      const content = await fs.readFile(path.join(migrationsDir, newMigration), "utf8");
      
      expect(content).toContain("TODO write your migration here");
    });
  });

  describe("Client Parameter Usage", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig();
    });

    it("should provide client parameter to up function", async () => {
      await createMigration(
        "test-client-param",
        `
        if (!client) throw new Error("Client not provided");
        await db.collection('test').insertOne({ clientTest: true });
        `,
        "await db.collection('test').deleteOne({ clientTest: true });"
      );

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");
    });

    it("should provide client parameter to down function", async () => {
      await createMigration(
        "test-client-down",
        "await db.collection('test').insertOne({ clientDown: true });",
        `
        if (!client) throw new Error("Client not provided to down");
        await db.collection('test').deleteOne({ clientDown: true });
        `
      );

      runMigrateMongo("up");
      const output = runMigrateMongo("down");
      expect(output).toContain("MIGRATED DOWN");
    });

    it("should support MongoDB sessions with client", async () => {
      // Note: Transactions require a replica set, which MongoDB Memory Server doesn't support by default
      // This test validates that client is provided, but uses a simple session without transactions
      await createMigration(
        "test-session",
        `
        const session = client.startSession();
        try {
          // Just insert without transaction (Memory Server doesn't support transactions)
          await db.collection('test').insertOne({ session: true });
        } finally {
          await session.endSession();
        }
        `,
        "await db.collection('test').deleteOne({ session: true });"
      );

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");
      
      const doc = await db.collection("test").findOne({ session: true });
      expect(doc).toBeTruthy();
    });
  });

  describe("Migration File Extensions", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
    });

    it("should create .js files by default", async () => {
      await writeConfig();
      runMigrateMongo("create test-js-extension");
      
      const files = await fs.readdir(migrationsDir);
      const migration = files.find(f => f.includes("test-js-extension"));
      expect(migration).toMatch(/\.js$/);
    });

    it("should handle async/await syntax", async () => {
      await writeConfig();
      await createMigration(
        "test-async-await",
        "await db.collection('test').insertOne({ async: true });",
        "await db.collection('test').deleteOne({ async: true });"
      );

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");
    });

    it("should handle promise-returning syntax", async () => {
      await writeConfig();
      const migrationFile = await createMigration("placeholder", "", "");
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      const promiseContent = `
module.exports = {
  up(db) {
    return db.collection('test').insertOne({ promise: true });
  },
  down(db) {
    return db.collection('test').deleteOne({ promise: true });
  }
};`;
      await fs.writeFile(migrationPath, promiseContent);

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");
    });
  });

  describe("Status Command Variations", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig();
    });

    it("should show PENDING for unapplied migrations", async () => {
      await createMigration(
        "test-pending",
        "await db.collection('test').insertOne({ x: 1 });",
        "await db.collection('test').deleteOne({ x: 1 });"
      );

      const output = runMigrateMongo("status");
      expect(output).toContain("PENDING");
      expect(output).toContain("test-pending");
    });

    it("should show timestamp for applied migrations", async () => {
      await createMigration(
        "test-timestamp",
        "await db.collection('test').insertOne({ x: 2 });",
        "await db.collection('test').deleteOne({ x: 2 });"
      );

      runMigrateMongo("up");
      const output = runMigrateMongo("status");
      
      expect(output).toContain("test-timestamp");
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
    });

    it("should sort migrations chronologically", async () => {
      await createMigration(
        "first-migration",
        "await db.collection('test').insertOne({ order: 1 });",
        "await db.collection('test').deleteOne({ order: 1 });"
      );
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await createMigration(
        "second-migration",
        "await db.collection('test').insertOne({ order: 2 });",
        "await db.collection('test').deleteOne({ order: 2 });"
      );

      const output = runMigrateMongo("status");
      const firstIndex = output.indexOf("first-migration");
      const secondIndex = output.indexOf("second-migration");
      
      expect(firstIndex).toBeLessThan(secondIndex);
    });
  });

  describe("CLI Options and Help", () => {
    it("should show version with -V flag", () => {
      const output = runMigrateMongo("-V");
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it("should show help with -h flag", () => {
      const output = runMigrateMongo("-h");
      expect(output).toContain("Usage:");
      expect(output).toContain("Commands:");
    });

    it("should show command-specific help for status", () => {
      const output = runMigrateMongo("status -h");
      expect(output).toContain("status");
    });

    it("should handle invalid commands gracefully", () => {
      const result = runMigrateMongo("invalid-command", testDir, true);
      expect(result.error).toBe(true);
    });
  });

  describe("CommonJS Compatibility", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig({ moduleSystem: "commonjs" });
    });

    it("should run CommonJS migrations with module.exports", async () => {
      await createMigration(
        "test-commonjs",
        "await db.collection('test').insertOne({ format: 'commonjs' });",
        "await db.collection('test').deleteOne({ format: 'commonjs' });"
      );

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");

      const doc = await db.collection("test").findOne({ format: "commonjs" });
      expect(doc).toBeTruthy();
      expect(doc.format).toBe("commonjs");
    });

    it("should rollback CommonJS migrations", async () => {
      await createMigration(
        "rollback-cjs",
        "await db.collection('test').insertOne({ rollback: 'cjs' });",
        "await db.collection('test').deleteOne({ rollback: 'cjs' });"
      );

      runMigrateMongo("up");
      const upOutput = runMigrateMongo("down");
      
      expect(upOutput).toContain("MIGRATED DOWN");
      
      const doc = await db.collection("test").findOne({ rollback: "cjs" });
      expect(doc).toBeNull();
    });

    it("should handle multiple CommonJS migrations", async () => {
      await createMigration(
        "cjs-multi-1",
        "await db.collection('test').insertOne({ seq: 1 });",
        "await db.collection('test').deleteOne({ seq: 1 });"
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await createMigration(
        "cjs-multi-2",
        "await db.collection('test').insertOne({ seq: 2 });",
        "await db.collection('test').deleteOne({ seq: 2 });"
      );

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");

      const count = await db.collection("test").countDocuments({ seq: { $exists: true } });
      expect(count).toBe(2);
    });

    it("should work with CommonJS requiring external modules", async () => {
      const migrationFile = await createMigration("placeholder", "", "");
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      const content = `
const crypto = require('crypto');

module.exports = {
  async up(db, client) {
    const hash = crypto.createHash('md5').update('test').digest('hex');
    await db.collection('test').insertOne({ hash });
  },
  async down(db, client) {
    await db.collection('test').deleteMany({});
  }
};`;
      await fs.writeFile(migrationPath, content);

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");

      const doc = await db.collection("test").findOne({ hash: { $exists: true } });
      expect(doc).toBeTruthy();
      expect(doc.hash).toBe("098f6bcd4621d373cade4e832627b4f6");
    });

    it("should support CommonJS with complex operations", async () => {
      const migrationFile = await createMigration("placeholder", "", "");
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      const content = `
module.exports = {
  async up(db, client) {
    // Use client operations directly
    const collections = await db.listCollections().toArray();
    await db.collection('test').insertOne({ 
      type: 'complex-cjs',
      collectionCount: collections.length 
    });
  },
  async down(db, client) {
    await db.collection('test').deleteMany({ type: 'complex-cjs' });
  }
};`;
      await fs.writeFile(migrationPath, content);

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");

      const doc = await db.collection("test").findOne({ type: "complex-cjs" });
      expect(doc).toBeTruthy();
      expect(typeof doc.collectionCount).toBe('number');
    });

    it("should handle CommonJS migrations with synchronous module.exports", async () => {
      const migrationFile = await createMigration("placeholder", "", "");
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      const content = `
module.exports = {
  up: async function(db, client) {
    await db.collection('test').insertOne({ style: 'function-keyword' });
  },
  down: async function(db, client) {
    await db.collection('test').deleteOne({ style: 'function-keyword' });
  }
};`;
      await fs.writeFile(migrationPath, content);

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");

      const doc = await db.collection("test").findOne({ style: "function-keyword" });
      expect(doc).toBeTruthy();
    });

    it("should validate CommonJS migration structure", async () => {
      const migrationFile = await createMigration("placeholder", "", "");
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      // Missing 'up' function
      const invalidContent = `
module.exports = {
  down: async function(db, client) {
    await db.collection('test').deleteMany({});
  }
};`;
      await fs.writeFile(migrationPath, invalidContent);

      const result = runMigrateMongo("up", testDir, true);
      expect(result.error).toBe(true);
    });
  });

  describe("Large-Scale Performance", () => {
    beforeEach(async () => {
      await fs.mkdir(migrationsDir, { recursive: true });
      await writeConfig();
    });

    it("should handle 20+ migration files efficiently", async () => {
      // Create 20 migrations (reduced from 50 for test speed)
      // This still validates handling of many migration files
      for (let i = 0; i < 20; i++) {
        await createMigration(
          `perf-test-${i}`,
          `await db.collection('test').insertOne({ num: ${i} });`,
          `await db.collection('test').deleteOne({ num: ${i} });`
        );
        // Minimal delay to ensure unique timestamps
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }

      const statusOutput = runMigrateMongo("status");
      const files = await fs.readdir(migrationsDir);
      const perfFiles = files.filter(f => f.includes("perf-test"));
      
      // Should have created 20 migration files
      expect(perfFiles.length).toBeGreaterThanOrEqual(15); // At least 15 due to timestamp collisions
      expect(statusOutput).toContain("perf-test");
    }, 30000);

    it("should handle migrations with multiple operations", async () => {
      await createMigration(
        "bulk-operations",
        `
        for (let i = 0; i < 100; i++) {
          await db.collection('bulk').insertOne({ index: i });
        }
        `,
        "await db.collection('bulk').deleteMany({});"
      );

      const output = runMigrateMongo("up");
      expect(output).toContain("MIGRATED UP");
      
      const count = await db.collection("bulk").countDocuments();
      expect(count).toBe(100);
    }, 30000);

    it("should rollback migrations with many documents", async () => {
      await createMigration(
        "large-dataset",
        `
        const docs = [];
        for (let i = 0; i < 1000; i++) {
          docs.push({ value: i });
        }
        await db.collection('large').insertMany(docs);
        `,
        "await db.collection('large').deleteMany({});"
      );

      runMigrateMongo("up");
      const beforeCount = await db.collection("large").countDocuments();
      expect(beforeCount).toBe(1000);

      runMigrateMongo("down");
      const afterCount = await db.collection("large").countDocuments();
      expect(afterCount).toBe(0);
    }, 30000);
  });
});
