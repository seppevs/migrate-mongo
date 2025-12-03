jest.mock("fs-extra");

const path = require("path");
const fs = require("fs-extra");
const config = require("../../lib/env/config");
const migrationsDir = require("../../lib/env/migrationsDir");
const create = require("../../lib/actions/create");

describe("create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(migrationsDir, 'shouldExist').mockResolvedValue();
    jest.spyOn(migrationsDir, 'resolveMigrationFileExtension').mockReturnValue('.js');
    jest.spyOn(migrationsDir, 'doesSampleMigrationExist').mockResolvedValue(false);
    jest.spyOn(config, 'shouldExist').mockResolvedValue();
    jest.spyOn(config, 'read').mockResolvedValue({
      moduleSystem: 'commonjs',
    });
    fs.copy.mockResolvedValue();
  });

  it("should yield an error when called without a description", async () => {
    await expect(create(null)).rejects.toThrow("Missing parameter: description");
  });

  it("should check that the migrations directory exists", async () => {
    await create("my_description");
    expect(migrationsDir.shouldExist).toHaveBeenCalled();
  });

  it("should yield an error when the migrations directory does not exist", async () => {
    jest.spyOn(migrationsDir, 'shouldExist').mockRejectedValue(
      new Error("migrations directory does not exist")
    );
    await expect(create("my_description")).rejects.toThrow("migrations directory does not exist");
  });

  it("should not be necessary to have an config present", async () => {
    await create("my_description");
    expect(config.shouldExist).not.toHaveBeenCalled();
  });

  it("should create a new migration file and yield the filename", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    const filename = await create("my_description");
    
    expect(fs.copy).toHaveBeenCalled();
    expect(fs.copy.mock.calls[0][0]).toBe(
      path.join(__dirname, "../../samples/commonjs/migration.js")
    );
    expect(fs.copy.mock.calls[0][1]).toBe(
      path.join(process.cwd(), "migrations", "20160609080700-my_description.js")
    );
    expect(filename).toBe("20160609080700-my_description.js");
    
    jest.useRealTimers();
  });

  it("should create a new migration file and yield the filename with custom extension", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    jest.spyOn(migrationsDir, 'resolveMigrationFileExtension').mockReturnValue('.ts');
    const filename = await create("my_description");
    
    expect(fs.copy).toHaveBeenCalled();
    expect(fs.copy.mock.calls[0][0]).toBe(
      path.join(__dirname, "../../samples/commonjs/migration.js")
    );
    expect(fs.copy.mock.calls[0][1]).toBe(
      path.join(process.cwd(), "migrations", "20160609080700-my_description.ts")
    );
    expect(filename).toBe("20160609080700-my_description.ts");
    
    jest.useRealTimers();
  });

  it("should replace spaces in the description with underscores", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    await create("this description contains spaces");
    
    expect(fs.copy).toHaveBeenCalled();
    expect(fs.copy.mock.calls[0][0]).toBe(
      path.join(__dirname, "../../samples/commonjs/migration.js")
    );
    expect(fs.copy.mock.calls[0][1]).toBe(
      path.join(
        process.cwd(),
        "migrations",
        "20160609080700-this_description_contains_spaces.js"
      )
    );
    
    jest.useRealTimers();
  });

  it("should yield errors that occurred when copying the file", async () => {
    fs.copy.mockRejectedValue(new Error("Copy failed"));
    await expect(create("my_description")).rejects.toThrow("Copy failed");
  });

  it("should use the sample migration file if it exists", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2016-06-09T08:07:00.077Z"));
    
    jest.spyOn(migrationsDir, 'doesSampleMigrationExist').mockResolvedValue(true);
    const filename = await create("my_description");
    
    expect(migrationsDir.doesSampleMigrationExist).toHaveBeenCalled();
    expect(fs.copy).toHaveBeenCalled();
    expect(fs.copy.mock.calls[0][0]).toBe(
      path.join(process.cwd(), "migrations", "sample-migration.js")
    );
    expect(fs.copy.mock.calls[0][1]).toBe(
      path.join(process.cwd(), "migrations", "20160609080700-my_description.js")
    );
    expect(filename).toBe("20160609080700-my_description.js");
    
    jest.useRealTimers();
  });
});
