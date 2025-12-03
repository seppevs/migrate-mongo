import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

import migrationsDir from "../env/migrationsDir.js";
import config from "../env/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copySampleConfigFile() {
  const moduleSystem = global.options.module === 'esm' ? 'esm' : 'commonjs';
  const source = path.join(__dirname, `../../samples/${moduleSystem}/migrate-mongo-config.js`);
  const destination = path.join(
    process.cwd(),
    config.DEFAULT_CONFIG_FILE_NAME
  );
  await fs.cp(source, destination);
}

async function createMigrationsDirectory() {
  await fs.mkdir(path.join(process.cwd(), "migrations"), { recursive: true });
}

export default async () => {
  await migrationsDir.shouldNotExist();
  await config.shouldNotExist();
  await copySampleConfigFile();
  await createMigrationsDirectory();
};
