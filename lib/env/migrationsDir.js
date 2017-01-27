'use strict';

const fs = require('fs-extra');
const path = require('path');

module.exports = {

  shouldExist(done) {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    return fs.stat(migrationsDir, (err) => {
      if (err) return done(new Error('migrations directory does not exist: ' + migrationsDir));
      return done();
    });
  },

  shouldNotExist(done) {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    return fs.stat(migrationsDir, (err) => {
      if (err && err.code === 'ENOENT') return done();
      return done(new Error('migrations directory already exists: ' + migrationsDir));
    });
  },

  getFileNames(done) {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    fs.readdir(migrationsDir, (err, files) => {
      if (err) return done(err);
      return done(null, files.filter((file) => path.extname(file) === '.js'));
    });
  },

  loadMigration(fileName) {
    return require(path.join(process.cwd(), 'migrations', fileName));
  }
};