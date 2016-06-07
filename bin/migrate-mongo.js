#! /usr/bin/env node

var program = require('commander');
var _ = require('lodash');
var migrateMongo = require('../lib/migrate-mongo');

program
  .command('init')
  .description('initialize a new migration project')
  .action(function () {
    migrateMongo.init(function (err) {
      if (err) return handleError(err);
      console.log('Initialization successful. Please edit the generated config.js file')
    });
  });

program
  .command('create [description]')
  .description('create a new database migration with the provided description')
  .action(function (description) {
    migrateMongo.create(description, function (err, filename) {
      if (err) return handleError(err);
      console.log('Created: ' + filename);
    });
  });

program
  .command('up')
  .description('run all unapplied database migrations')
  .action(function () {
    migrateMongo.up(function (err) {
      if (err) return handleError(err);
    });
  });

program
  .command('down')
  .description('undo the last applied database migration')
  .action(function () {
    migrateMongo.down(function (err) {
      if (err) return handleError(err);
    });
  });

program
  .command('status')
  .description('print the changelog of the database')
  .action(function () {
    migrateMongo.status(function (err) {
      if (err) return handleError(err);
    });
  });

program.parse(process.argv);

if(_.isEmpty(program.args)) {
  program.outputHelp();
}

function handleError(err) {
  console.error('ERROR: ' + err.message);
  process.exit(1);
}