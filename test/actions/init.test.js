jest.mock("fs/promises", () => ({
  stat: jest.fn(),
  cp: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

const path = require("path");
const fs = require("fs/promises");
const migrationsDir = require("../../lib/env/migrationsDir");
const config = require("../../lib/env/config");
const init = require("../../lib/actions/init");

describe("init", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    global.options = { module: 'commonjs' };
    jest.spyOn(migrationsDir, 'shouldNotExist').mockResolvedValue();
    jest.spyOn(config, 'shouldNotExist').mockResolvedValue();
    fs.cp.mockResolvedValue();
    fs.mkdir.mockResolvedValue();
  });

  it("should check if the migrations directory already exists", async () => {
    await init();
    expect(migrationsDir.shouldNotExist).toHaveBeenCalled();
  });

  it("should not continue and yield an error if the migrations directory already exists", async () => {
    jest.spyOn(migrationsDir, 'shouldNotExist').mockRejectedValue(new Error("Dir exists"));
    
    try {
      await init();
    } catch (err) {
      expect(err.message).toBe("Dir exists");
      expect(fs.cp).not.toHaveBeenCalled();
      expect(fs.mkdir).not.toHaveBeenCalled();
    }
  });

  it("should check if the config file already exists", async () => {
    await init();
    expect(config.shouldNotExist).toHaveBeenCalled();
  });

  it("should not continue and yield an error if the config file already exists", async () => {
    jest.spyOn(config, 'shouldNotExist').mockResolvedValue(new Error("Config exists"));
    
    try {
      await init();
    } catch (err) {
      expect(err.message).toBe("Config exists");
      expect(fs.cp).not.toHaveBeenCalled();
      expect(fs.mkdir).not.toHaveBeenCalled();
    }
  });

  it("should copy the sample config file to the current working directory", async () => {
    await init();
    expect(fs.cp).toHaveBeenCalled();
    expect(fs.cp).toHaveBeenCalledTimes(1);

    const source = fs.cp.mock.calls[0][0];
    expect(source).toBe(
      path.join(__dirname, "../../samples/commonjs/migrate-mongo-config.js")
    );

    const destination = fs.cp.mock.calls[0][1];
    expect(destination).toBe(
      path.join(process.cwd(), "migrate-mongo-config.js")
    );
  });

  it("should copy the sample config file to the current working directory (ESM)", async () => {
    global.options.module = 'esm';
    await init();
    expect(fs.cp).toHaveBeenCalled();
    expect(fs.cp).toHaveBeenCalledTimes(1);

    const source = fs.cp.mock.calls[0][0];
    expect(source).toBe(
      path.join(__dirname, "../../samples/esm/migrate-mongo-config.js")
    );

    const destination = fs.cp.mock.calls[0][1];
    expect(destination).toBe(
      path.join(process.cwd(), "migrate-mongo-config.js")
    );
  });

  it("should yield errors that occurred when copying the sample config", async () => {
    fs.cp.mockRejectedValue(new Error("No space left on device"));
    await expect(init()).rejects.toThrow("No space left on device");
  });

  it("should create a migrations directory in the current working directory", async () => {
    await init();

    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.mkdir).toHaveBeenCalledTimes(1);
    expect(fs.mkdir.mock.calls[0][0]).toEqual(
      path.join(process.cwd(), "migrations")
    );
  });

  it("should yield errors that occurred when creating the migrations directory", async () => {
    fs.mkdir.mockRejectedValue(new Error("I cannot do that"));
    
    try {
      await init();
    } catch (err) {
      expect(err.message).toBe("I cannot do that");
    }
  });
});
