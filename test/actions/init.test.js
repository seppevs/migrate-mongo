import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

import path from "path";
import fs from "fs/promises";
import migrationsDir from "../../lib/env/migrationsDir.js";
import config from "../../lib/env/config.js";
import init from "../../lib/actions/init.js";

describe("init", () => {
  let cpSpy, mkdirSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    global.options = { module: 'commonjs' };
    vi.spyOn(migrationsDir, 'shouldNotExist').mockResolvedValue();
    vi.spyOn(config, 'shouldNotExist').mockResolvedValue();
    cpSpy = vi.spyOn(fs, 'cp').mockResolvedValue();
    mkdirSpy = vi.spyOn(fs, 'mkdir').mockResolvedValue();
  });

  it("should check if the migrations directory already exists", async () => {
    await init();
    expect(migrationsDir.shouldNotExist).toHaveBeenCalled();
  });

  it("should not continue and yield an error if the migrations directory already exists", async () => {
    vi.spyOn(migrationsDir, 'shouldNotExist').mockRejectedValue(new Error("Dir exists"));
    
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
    vi.spyOn(config, 'shouldNotExist').mockResolvedValue(new Error("Config exists"));
    
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
    expect(fs.cp).toHaveBeenCalledTimes(1);
    expect(cpSpy).toHaveBeenCalledWith(
      path.join(__dirname, "../../samples/commonjs/migrate-mongo-config.js"),
      path.join(process.cwd(), "migrate-mongo-config.js")
    );
  });

  it("should copy the sample config file to the current working directory (ESM)", async () => {
    global.options.module = 'esm';
    await init();
    expect(fs.cp).toHaveBeenCalledTimes(1);
    expect(cpSpy).toHaveBeenCalledWith(
      path.join(__dirname, "../../samples/esm/migrate-mongo-config.js"),
      path.join(process.cwd(), "migrate-mongo-config.js")
    );
  });

  it("should yield errors that occurred when copying the sample config", async () => {
    vi.spyOn(fs, 'cp').mockRejectedValue(new Error("No space left on device"));
    await expect(init()).rejects.toThrow("No space left on device");
  });

  it("should create a migrations directory in the current working directory", async () => {
    await init();

    expect(fs.mkdir).toHaveBeenCalledTimes(1);
    expect(mkdirSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), "migrations"),
      { recursive: true }
    );
  });

  it("should yield errors that occurred when creating the migrations directory", async () => {
    vi.spyOn(fs, 'mkdir').mockRejectedValue(new Error("I cannot do that"));
    
    try {
      await init();
    } catch (err) {
      expect(err.message).toBe("I cannot do that");
    }
  });
});
