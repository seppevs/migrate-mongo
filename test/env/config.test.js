jest.mock("fs/promises", () => ({
  stat: jest.fn(),
  cp: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

const path = require("path");
const fs = require("fs/promises");
const moduleLoader = require("../../lib/utils/module-loader");
// Don't auto-mock config, we'll use the real implementation
const config = require("../../lib/env/config");

describe("config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset config state between tests
    delete global.options;
    config.set(null);
    // Restore any spies
    jest.restoreAllMocks();
  });

  describe("shouldExist()", () => {

    it('should not yield an error when the config was set manually', async () => {
      fs.stat.mockRejectedValue(new Error("Not found"));
      config.set({ my: 'config'})
      await config.shouldExist();
    });

    it("should not yield an error if the config exists", async () => {
      fs.stat.mockResolvedValue({});
      await config.shouldExist();
    });

    it("should yield an error if the config does not exist", async () => {
      const configPath = path.join(process.cwd(), "migrate-mongo-config.js");
      fs.stat.mockRejectedValue(new Error("It does not exist"));
      await expect(config.shouldExist()).rejects.toThrow(
        `config file does not exist: ${configPath}`
      );
    });
  });

  describe("shouldNotExist()", () => {

    it('should not yield an error when the config was set manually', async () => {
      fs.stat.mockRejectedValue(new Error("Not found"));
      config.set({ my: 'config'})
      await config.shouldNotExist();
    });

    it("should not yield an error if the config does not exist", async () => {
      const error = new Error("File does not exist");
      error.code = "ENOENT";
      fs.stat.mockRejectedValue(error);
      await config.shouldNotExist();
    });

    it("should yield an error if the config exists", async () => {
      const configPath = path.join(process.cwd(), "migrate-mongo-config.js");
      fs.stat.mockResolvedValue({});
      await expect(config.shouldNotExist()).rejects.toThrow(
        `config file already exists: ${configPath}`
      );
    });
  });

  describe("getConfigFilename()", () => {
    it("should return the config file name", () => {
      expect(config.getConfigFilename()).toBe("migrate-mongo-config.js");
    });
  });

  describe("read()", () => {

    it('should resolve with the custom config content when config content was set manually', async () => {
      const expected = { my: 'custom-config'};
      config.set(expected);
      const actual = await config.read();
      expect(actual).toEqual(expected);
    });

    it("should attempt to read the config file", async () => {
      const configPath = path.join(process.cwd(), "migrate-mongo-config.js");
      await expect(config.read()).rejects.toThrow(`Cannot find module '${configPath}'`);
    });

    it("should be possible to read a custom, absolute config file path", async () => {
      global.options = { file: "/some/absolute/path/to/a-config-file.js" };
      await expect(config.read()).rejects.toThrow(`Cannot find module '${global.options.file}'`);
    });

    it("should be possible to read a custom, relative config file path", async () => {
      global.options = { file: "./a/relative/path/to/a-config-file.js" };
      const configPath = path.join(process.cwd(), global.options.file);
      await expect(config.read()).rejects.toThrow(`Cannot find module '${configPath}'`);
    });

    it("should fall back to using 'import' if Node requires the use of ESM", async () => {
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ESM';
      jest.spyOn(moduleLoader, 'require').mockImplementation(() => { throw error; });
      jest.spyOn(moduleLoader, 'import').mockResolvedValue({});
      await config.read();
      expect(moduleLoader.import).toHaveBeenCalled();
    });

    it("should fall back to using 'import' if Node requires the use of ESM (top-level await)", async () => {
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ASYNC_MODULE';
      jest.spyOn(moduleLoader, 'require').mockImplementation(() => { throw error; });
      jest.spyOn(moduleLoader, 'import').mockResolvedValue({});
      await config.read();
      expect(moduleLoader.import).toHaveBeenCalled();
    });

    it("should handle ESM modules with default export", async () => {
      const expectedConfig = {
        mongodb: {
          url: 'mongodb://localhost:27017',
          databaseName: 'test'
        }
      };
      
      jest.spyOn(moduleLoader, 'require').mockResolvedValue({
        default: expectedConfig
      });
      
      const actual = await config.read();
      expect(actual).toEqual(expectedConfig);
    });

    it("should handle regular CommonJS modules", async () => {
      const expectedConfig = {
        mongodb: {
          url: 'mongodb://localhost:27017',
          databaseName: 'test'
        }
      };
      
      jest.spyOn(moduleLoader, 'require').mockResolvedValue(expectedConfig);
      
      const actual = await config.read();
      expect(actual).toEqual(expectedConfig);
    });

    it("should override migrationsDir when -md option is provided", async () => {
      const originalConfig = {
        mongodb: { url: 'mongodb://localhost:27017' },
        migrationsDir: './migrations'
      };
      const customMigrationsDir = './custom-migrations';
      
      jest.spyOn(moduleLoader, 'require').mockResolvedValue(originalConfig);
      global.options = { migrationsDir: customMigrationsDir };
      
      const actual = await config.read();
      expect(actual.migrationsDir).toBe(customMigrationsDir);
      
      // Clean up
      delete global.options;
    });

    it("should use config file migrationsDir when -md option is not provided", async () => {
      const originalConfig = {
        mongodb: { url: 'mongodb://localhost:27017' },
        migrationsDir: './migrations'
      };
      
      jest.spyOn(moduleLoader, 'require').mockResolvedValue(originalConfig);
      delete global.options;
      
      const actual = await config.read();
      expect(actual.migrationsDir).toBe('./migrations');
    });

    it("should override migrationsDir in ESM modules when -md option is provided", async () => {
      const originalConfig = {
        mongodb: { url: 'mongodb://localhost:27017' },
        migrationsDir: './migrations'
      };
      const customMigrationsDir = './custom-esm-migrations';
      
      const error = new Error('ESM required');
      error.code = 'ERR_REQUIRE_ESM';
      jest.spyOn(moduleLoader, 'require').mockImplementation(() => { throw error; });
      jest.spyOn(moduleLoader, 'import').mockResolvedValue(originalConfig);
      global.options = { migrationsDir: customMigrationsDir };
      
      const actual = await config.read();
      expect(actual.migrationsDir).toBe(customMigrationsDir);
      
      // Clean up
      delete global.options;
    });
  });
});
