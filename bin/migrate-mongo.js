#! /usr/bin/env node

const program = require('commander');
const _ = require('lodash');
const Table = require('cli-table');
const migrateMongo = require('../lib/migrate-mongo');
const database = require('../lib/env/database');
const pkgjson = require('../package.json');
const config = require('../lib/env/configFile');

program.version(pkgjson.version);

program
  .command('init')
  .description('initialize a new migration project')
  .action(function () {
    migrateMongo.init((err) => {
      if (err) return handleError(err);
      console.log('Initialization successful. Please edit the generated config.js file');
    });
  });

program
  .command('create [description]')
  .description('create a new database migration with the provided description')
  .option('-f --file <file>', 'use a custom config file')
  .action((description, options) => {
    global.options = options;
    migrateMongo.create(description, (err, filename) => {
      if (err) return handleError(err);
      console.log(`Created: ${config.read().migrationsDir}/${filename}`);
    });
  });

program
  .command('up')
  .description('run all unapplied database migrations')
  .option('-f --file <file>', 'use a custom config file')
  .action((options) => {
    global.options = options;
    database.connect((err, db) => {
      if (err) return handleError(err);
      migrateMongo.up(db, (err, migrated) => {
        migrated.forEach((migratedItem) => console.log(`MIGRATED UP: ${migratedItem}`));
        if (err) return handleError(err);
        process.exit(0);
      });
    });
  });

program
  .command('down')
  .description('undo the last applied database migration')
  .option('-f --file <file>', 'use a custom config file')
  .action((options) => {
    global.options = options;
    database.connect((err, db) => {
      if (err) return handleError(err);
      migrateMongo.down(db, (err, migrated) => {
        migrated.forEach(migratedItem => console.log('MIGRATED DOWN: ' + migratedItem));
        if (err) return handleError(err);
        process.exit(0);
      });
    });
  });

program
  .command('status')
  .description('print the changelog of the database')
  .option('-f --file <file>', 'use a custom config file')
  .action((options) => {
    global.options = options;
    database.connect((err, db) => {
      if (err) return handleError(err);
      migrateMongo.status(db, (err, statusItems) => {
        if (err) return handleError(err);
        printStatusTable(statusItems);
        process.exit(0);
      });
    });
  });


program.parse(process.argv);

if (_.isEmpty(program.args)) {
  program.outputHelp();
}

function handleError(err) {
  console.error('ERROR: ' + err.message);
  process.exit(1);
}

function printStatusTable(statusItems) {
  const table = new Table({ head: ['Filename', 'Applied At'] });
  statusItems.forEach(item => table.push(_.values(item)));
  console.log(table.toString());
}