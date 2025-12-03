import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import date from "../utils/date.js";
import migrationsDir from "../env/migrationsDir.js";
import config from "../env/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (description) => {
  if (!description) {
    throw new Error("Missing parameter: description");
  }
  await migrationsDir.shouldExist();
  const migrationsDirPath = await migrationsDir.resolve();
  const migrationExtension = await migrationsDir.resolveMigrationFileExtension();

  // Check if there is a 'sample-migration.js' file in migrations dir - if there is, use that
  let source;
  if (await migrationsDir.doesSampleMigrationExist()) {
    source = await migrationsDir.resolveSampleMigrationPath();
  } else {
    const configContent = await config.read();
    source = path.join(__dirname, `../../samples/${configContent.moduleSystem}/migration.js`);
  }

  const filename = `${date.nowAsString()}-${description
    .split(" ")
    .join("_")}${migrationExtension}`;
  const destination = path.join(migrationsDirPath, filename);
  await fs.cp(source, destination);
  return filename;
};
