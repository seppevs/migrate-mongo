#! /usr/bin/env node

const program = require("commander");
const _ = require("lodash");
const Table = require("cli-table3");
const migrateFirestoreMongo = require("../lib/migrate-firestore-mongo");
const pkgjson = require("../package.json");

function printMigrated(migrated = []) {
  migrated.forEach(migratedItem => {
    console.log(`MIGRATED UP: ${migratedItem}`);
  });
}

function handleError(err) {
  console.error(`ERROR: ${err.message}`, err.stack);
  process.exit(1);
}

function printStatusTable(statusItems) {
  return migrateFirestoreMongo.config.read().then(config => {
    const useFileHash = config.useFileHash === true;
    const table = new Table({ head: useFileHash ? ["Filename", "Hash", "Applied At"] : ["Filename", "Applied At"]});
    statusItems.forEach(item => table.push(_.values(item)));
    console.log(table.toString());
  })
  
}

program.version(pkgjson.version);

program
  .command("init")
  .description("initialize a new migration project")
  .action(() =>
    migrateFirestoreMongo
      .init()
      .then(() =>
        console.log(
          `Initialization successful. Please edit the generated \`${migrateFirestoreMongo.config.getConfigFilename()}\` file`
        )
      )
      .catch(err => handleError(err))
  );

program
  .command("create [description]")
  .description("create a new database migration with the provided description")
  .option("-f --file <file>", "use a custom config file")
  .action((description, options) => {
    global.options = options;
    migrateFirestoreMongo
      .create(description)
      .then(fileName => 
        migrateFirestoreMongo.config.read().then(config => {
          console.log(`Created: ${config.migrationsDir}/${fileName}`);
        })
      )
      .catch(err => handleError(err));
  });

program
  .command("import")
  .description("run all pending database imports")
  .option("-f --file <file>", "use a custom config file")
  .action(async (options) => {
    global.options = options;

    try {
      const firestoreConnection = await migrateFirestoreMongo.firestore.connect();
      const mongoConnection = await migrateFirestoreMongo.mongo.connect();

      await migrateFirestoreMongo.importData(firestoreConnection, mongoConnection);

      printMigrated(migrated);      
    } catch (e) {
      handleError(err);
      printMigrated(err.migrated);
    }
    process.exit(0);
  });

program
  .command("status")
  .description("print the changelog of the database")
  .option("-f --file <file>", "use a custom config file")
  .action(async (options) => {
    global.options = options;

    const mongoConnection = await migrateFirestoreMongo.mongo.connect();

    try {
      const statusItems = await migrateFirestoreMongo.status(mongoConnection.db);

      printStatusTable(statusItems)
    } catch (err) {
      handleError(err);
    }
    process.exit(0);  
  });

program.parse(process.argv);

if (_.isEmpty(program.rawArgs)) {
  program.outputHelp();
}
