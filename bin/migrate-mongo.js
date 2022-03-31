#! /usr/bin/env node

const program = require("commander");
const _ = require("lodash");
const Table = require("cli-table3");
const migrateMongo = require("../lib/migrate-mongo");
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
  return migrateMongo.config.read().then(config => {
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
  .option("-m --module <module loading system>", "module loading system (commonjs (DEFAULT) or esm)")
  .action(options => {
    global.options = options;
    migrateMongo
      .init()
      .then(() =>
        console.log(
          `Initialization successful. Please edit the generated \`${migrateMongo.config.getConfigFilename()}\` file`
        )
      )
      .catch(err => handleError(err))
  });

program
  .command("create [description]")
  .description("create a new database migration with the provided description")
  .option("-f --file <file>", "use a custom config file")
  .action((description, options) => {
    global.options = options;
    migrateMongo
      .create(description)
      .then(fileName => 
        migrateMongo.config.read().then(config => {
          console.log(`Created: ${config.migrationsDir}/${fileName}`);
        })
      )
      .catch(err => handleError(err));
  });

program
  .command("up")
  .description("run all pending database migrations")
  .option("-f --file <file>", "use a custom config file")
  .action(options => {
    global.options = options;
    migrateMongo.database
      .connect()
      .then(({db, client}) => migrateMongo.up(db, client))
      .then(migrated => {
        printMigrated(migrated);
        process.exit(0);
      })
      .catch(err => {
        handleError(err);
        printMigrated(err.migrated);
      });
  });

program
  .command("down")
  .description("undo the last applied database migration")
  .option("-f --file <file>", "use a custom config file")
  .action(options => {
    global.options = options;
    migrateMongo.database
      .connect()
      .then(({db, client}) => migrateMongo.down(db, client))
      .then(migrated => {
        migrated.forEach(migratedItem => {
          console.log(`MIGRATED DOWN: ${migratedItem}`);
        });
        process.exit(0);
      })
      .catch(err => {
        handleError(err);
      });
  });

program
  .command("status")
  .description("print the changelog of the database")
  .option("-f --file <file>", "use a custom config file")
  .action(options => {
    global.options = options;
    migrateMongo.database
      .connect()
      .then(({db, client}) => migrateMongo.status(db, client))
      .then(statusItems => printStatusTable(statusItems))
      .then(() => {
        process.exit(0);
      })
      .catch(err => {
        handleError(err);
      });
  });

program.parse(process.argv);

if (_.isEmpty(program.rawArgs)) {
  program.outputHelp();
}
