#! /usr/bin/env node

var program = require('commander');
var _ = require('lodash');
var migrateMongo = require('../lib/migrate-mongo');
var database = require('../lib/env/database');

var Table = require('cli-table');

program
  .command('init')
  .description('initialize a new migration project')
  .action(function () {
    migrateMongo.init(function (err) {
      if (err) return handleError(err);
      console.log('Initialization successful. Please edit the generated config.js file');
    });
  });

program
  .command('create [description]')
  .description('create a new database migration with the provided description')
  .action(function (description) {
    migrateMongo.create(description, function (err, filename) {
      if (err) return handleError(err);
      console.log('Created: migrations/' + filename);
    });
  });

program
  .command('up')
  .description('run all unapplied database migrations')
  .action(function () {
    database.connect(function (err, db) {
      if (err) return handleError(err);
      migrateMongo.up(db, function (err, migrated) {
        migrated.forEach(function (migratedItem) {
          console.log('MIGRATED UP: ' + migratedItem);
        });

        if (err) return handleError(err);
        process.exit(0);
      });
    });
  });

program
  .command('down')
  .description('undo the last applied database migration')
  .action(function () {
    database.connect(function (err, db) {
      if (err) return handleError(err);
      migrateMongo.down(db, function (err, migrated) {
        migrated.forEach(function (migratedItem) {
          console.log('MIGRATED DOWN: ' + migratedItem);
        });

        if (err) return handleError(err);
        process.exit(0);
      });
    });
  });

program
  .command('status')
  .description('print the changelog of the database')
  .action(function () {
    database.connect(function (err, db) {
      if (err) return handleError(err);
      migrateMongo.status(db, function (err, statusItems) {
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
  var table = new Table({head: ['Filename', 'Applied At']});
  statusItems.forEach(function (item) {
    table.push(_.values(item));
  });
  console.log(table.toString());
}