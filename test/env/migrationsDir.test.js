jest.mock("fs/promises", () => ({
  stat: jest.fn(),
  cp: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

const path = require("path");
const fs = require("fs/promises");
const config = require("../../lib/env/config");
const moduleLoader = require("../../lib/utils/module-loader");
const migrationsDir = require("../../lib/env/migrationsDir");

describe("migrationsDir", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(config, 'read').mockReturnValue({
      migrationsDir: "migrations",
      migrationFileExtension: ".js"
    });
  });

  describe("resolve()", () => {
    it("should use the configured relative migrations dir when a config file is available", async () => {
      jest.spyOn(config, 'read').mockReturnValue({
        migrationsDir: "custom-migrations-dir"
      });
      expect(await migrationsDir.resolve()).toBe(
        path.join(process.cwd(), "custom-migrations-dir")
      );
    });

    it("should use the configured absolute migrations dir when a config file is available", async () => {
      jest.spyOn(config, 'read').mockReturnValue({
        migrationsDir: "/absolute/path/to/my/custom-migrations-dir"
      });
      expect(await migrationsDir.resolve()).toBe(
        "/absolute/path/to/my/custom-migrations-dir"
      );
    });

    it("should use the default migrations directory when no migrationsDir is specified in the config file", async () => {
      jest.spyOn(config, 'read').mockReturnValue({});
      expect(await migrationsDir.resolve()).toBe(
        path.join(process.cwd(), "migrations")
      );
    });

    it("should use the default migrations directory when unable to read the config file", async () => {
      jest.spyOn(config, 'read').mockImplementation(() => { throw new Error("Cannot read config file"); });
      expect(await migrationsDir.resolve()).toBe(
        path.join(process.cwd(), "migrations")
      );
    });
  });

  describe("shouldExist()", () => {
    it("should not reject with an error if the migrations dir exists", async () => {
      fs.stat.mockResolvedValue({});
      await migrationsDir.shouldExist();
    });

    it("should yield an error if the migrations dir does not exist", async () => {
      const migrationsPath = path.join(process.cwd(), "migrations");
      fs.stat.mockRejectedValue(new Error("It does not exist"));
      await expect(migrationsDir.shouldExist()).rejects.toThrow(
        `migrations directory does not exist: ${migrationsPath}`
      );
    });
  });

  describe("shouldNotExist()", () => {
    it("should not yield an error if the migrations dir does not exist", async () => {
      const error = new Error("File does not exist");
      error.code = "ENOENT";
      fs.stat.mockRejectedValue(error);
      await migrationsDir.shouldNotExist();
    });

    it("should yield an error if the migrations dir exists", async () => {
      const migrationsPath = path.join(process.cwd(), "migrations");
      fs.stat.mockResolvedValue({});
      await expect(migrationsDir.shouldNotExist()).rejects.toThrow(
        `migrations directory already exists: ${migrationsPath}`
      );
    });
  });

  describe("getFileNames()", () => {
    it("should read the directory and yield the result", async () => {
      fs.readdir.mockResolvedValue(["file1.js", "file2.js"]);
      const files = await migrationsDir.getFileNames();
      expect(files).toEqual(["file1.js", "file2.js"]);
    });

    it("should list only files with configured extension", async () => {
      jest.spyOn(config, 'read').mockReturnValue({
        migrationFileExtension: ".ts"
      });
      fs.readdir.mockResolvedValue(["file1.ts", "file2.ts", "file1.js", "file2.js", ".keep"]);
      const files = await migrationsDir.getFileNames();
      expect(files).toEqual(["file1.ts", "file2.ts"]);
    });

    it("should yield errors that occurred while reading the dir", async () => {
      fs.readdir.mockRejectedValue(new Error("Could not read"));
      await expect(migrationsDir.getFileNames()).rejects.toThrow("Could not read");
    });

    it("should be sorted in alphabetical order", async () => {
      fs.readdir.mockResolvedValue([
        "20201014172343-test.js",
        "20201014172356-test3.js",
        "20201014172354-test2.js",
        "20201014172345-test1.js"
      ]);
      const files = await migrationsDir.getFileNames();
      expect(files).toEqual([
        "20201014172343-test.js",
        "20201014172345-test1.js",
        "20201014172354-test2.js",
        "20201014172356-test3.js"
      ]);
    });
  });

  describe("loadMigration()", () => {
    it("should attempt to load the fileName in the migrations directory", async () => {
      const pathToMigration = path.join(
        process.cwd(),
        "migrations",
        "someFile.js"
      );
      await expect(migrationsDir.loadMigration("someFile.js")).rejects.toThrow(`Cannot find module '${pathToMigration}'`);
    });

    it("should use CommonJS default", async () => {
      jest.spyOn(moduleLoader, 'require').mockReturnValue({ up: jest.fn(), down: jest.fn() });
      jest.spyOn(moduleLoader, 'import');
      await migrationsDir.loadMigration("someFile.js");
      expect(moduleLoader.require).toHaveBeenCalled();
      expect(moduleLoader.import).not.toHaveBeenCalled();
    });

    it("should fall back to using 'import' if Node requires the use of ESM (default export)", async () => {
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ESM';
      jest.spyOn(moduleLoader, 'require').mockImplementation(() => { throw error; });
      jest.spyOn(moduleLoader, 'import').mockResolvedValue({ default: () => jest.fn() });
      await migrationsDir.loadMigration("someFile.js");
      expect(moduleLoader.import).toHaveBeenCalled();
    });

    it("should fall back to using 'import' if Node requires the use of ESM (no default export)", async () => {
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ESM';
      jest.spyOn(moduleLoader, 'require').mockImplementation(() => { throw error; });
      jest.spyOn(moduleLoader, 'import').mockResolvedValue({ up: jest.fn(), down: jest.fn() });
      await migrationsDir.loadMigration("someFile.js");
      expect(moduleLoader.import).toHaveBeenCalled();
    });

    it("should fall back to using 'import' if Node requires the use of ESM (top-level await)", async () => {
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ASYNC_MODULE';
      jest.spyOn(moduleLoader, 'require').mockImplementation(() => { throw error; });
      jest.spyOn(moduleLoader, 'import').mockResolvedValue({ up: jest.fn(), down: jest.fn() });
      await migrationsDir.loadMigration("someFile.js");
      expect(moduleLoader.import).toHaveBeenCalled();
    });
  });

  describe("resolveMigrationFileExtension()", () => {
    it("should provide the value if specified", async () => {
      jest.spyOn(config, 'read').mockReturnValue({
        migrationFileExtension: ".ts"
      });
      const ext = await migrationsDir.resolveMigrationFileExtension();
      expect(ext).toBe(".ts");
    });
    it("should error if the extension does not start with dot", async () => {
      jest.spyOn(config, 'read').mockReturnValue({
        migrationFileExtension: "js"
      });
      await expect(migrationsDir.resolveMigrationFileExtension()).rejects.toThrow("migrationFileExtension must start with dot");
    });
    it("should use the default if not specified", async() => {
      jest.spyOn(config, 'read').mockReturnValue({
        migrationFileExtension: undefined
      });
      const ext = await migrationsDir.resolveMigrationFileExtension();
      expect(ext).toBe(".js");
    });
    it("should use the default if config file not found", async() => {
      jest.spyOn(config, 'read').mockImplementation(() => { throw new Error(); });
      const ext = await migrationsDir.resolveMigrationFileExtension();
      expect(ext).toBe(".js");
    });
  });

  describe("doesSampleMigrationExist()", () => {
    it("should return true if sample migration exists", async () => {
      fs.stat.mockResolvedValue({});
      const result = await migrationsDir.doesSampleMigrationExist();
      expect(result).toBe(true);
    });

    it("should return false if sample migration doesn't exists", async () => {
      fs.stat.mockRejectedValue(new Error("It does not exist"));
      const result = await migrationsDir.doesSampleMigrationExist();
      expect(result).toBe(false);
    });
  });

  describe("loadFileHash()", () => {
    it("should return a hash based on the file contents", async () => {
      fs.readFile.mockResolvedValue("some string to hash");
      const result = await migrationsDir.loadFileHash('somefile.js');
      expect(result).toBe("ea83a45637a9af470a994d2c9722273ef07d47aec0660a1d10afe6e9586801ac");
    })
  })
});
