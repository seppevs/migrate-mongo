import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

import path from "path";
import fs from "fs/promises";
import config from "../../lib/env/config.js";
import migrationsDir from "../../lib/env/migrationsDir.js";
import create from "../../lib/actions/create.js";

describe("create", () => {
  let cpSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.spyOn(migrationsDir, 'shouldExist').mockResolvedValue();
    vi.spyOn(migrationsDir, 'resolveMigrationFileExtension').mockReturnValue('.js');
    vi.spyOn(migrationsDir, 'doesSampleMigrationExist').mockResolvedValue(false);
    vi.spyOn(config, 'shouldExist').mockResolvedValue();
    vi.spyOn(config, 'read').mockResolvedValue({
      moduleSystem: 'commonjs',
    });
    cpSpy = vi.spyOn(fs, 'cp').mockResolvedValue();
  });

  it("should yield an error when called without a description", async () => {
    await expect(create(null)).rejects.toThrow("Missing parameter: description");
  });

  it("should check that the migrations directory exists", async () => {
    await create("my_description");
    expect(migrationsDir.shouldExist).toHaveBeenCalled();
  });

  it("should yield an error when the migrations directory does not exist", async () => {
    vi.spyOn(migrationsDir, 'shouldExist').mockRejectedValue(
      new Error("migrations directory does not exist")
    );
    await expect(create("my_description")).rejects.toThrow("migrations directory does not exist");
  });

  it("should not be necessary to have an config present", async () => {
    await create("my_description");
    expect(config.shouldExist).not.toHaveBeenCalled();
  });

  it("should create a new migration file and yield the filename", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    const filename = await create("my_description");
    
    expect(fs.cp).toHaveBeenCalled();
    expect(cpSpy).toHaveBeenCalledWith(
      path.join(__dirname, "../../samples/commonjs/migration.js"),
      path.join(process.cwd(), "migrations", "20160609080700-my_description.js")
    );
    expect(filename).toBe("20160609080700-my_description.js");
    
    vi.useRealTimers();
  });

  it("should create a new migration file and yield the filename with custom extension", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    vi.spyOn(migrationsDir, 'resolveMigrationFileExtension').mockReturnValue('.ts');
    const filename = await create("my_description");
    
    expect(fs.cp).toHaveBeenCalled();
    expect(cpSpy).toHaveBeenCalledWith(
      path.join(__dirname, "../../samples/commonjs/migration.js"),
      path.join(process.cwd(), "migrations", "20160609080700-my_description.ts")
    );
    expect(filename).toBe("20160609080700-my_description.ts");
    
    vi.useRealTimers();
  });

  it("should replace spaces in the description with underscores", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    await create("this description contains spaces");
    
    expect(fs.cp).toHaveBeenCalled();
    expect(cpSpy).toHaveBeenCalledWith(
      path.join(__dirname, "../../samples/commonjs/migration.js"),
      path.join(
        process.cwd(),
        "migrations",
        "20160609080700-this_description_contains_spaces.js"
      )
    );
    
    vi.useRealTimers();
  });

  it("should yield errors that occurred when copying the file", async () => {
    vi.spyOn(fs, 'cp').mockRejectedValue(new Error("Copy failed"));
    await expect(create("my_description")).rejects.toThrow("Copy failed");
  });

  it("should use the sample migration file if it exists", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    vi.spyOn(migrationsDir, 'doesSampleMigrationExist').mockResolvedValue(true);
    const filename = await create("my_description");
    
    expect(migrationsDir.doesSampleMigrationExist).toHaveBeenCalled();
    expect(fs.cp).toHaveBeenCalled();
    expect(cpSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), "migrations", "sample-migration.js"),
      path.join(process.cwd(), "migrations", "20160609080700-my_description.js")
    );
    expect(filename).toBe("20160609080700-my_description.js");
    
    vi.useRealTimers();
  });
});
