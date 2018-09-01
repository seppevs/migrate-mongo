'use strict';
const Migration = require('migrate-mongo');
const migration = new Migration();

migration.up((db, next) => {
    // TODO write your migration here
    next();
});

migration.down((db, next) => {
    // TODO write the statements to rollback your migration (if possible)
    next();
});

module.exports = migration;