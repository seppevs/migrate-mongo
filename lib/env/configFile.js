'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const DEFAULT_CONFIG_FILE_NAME = 'config.js';

module.exports = {

  shouldExist(done) {
    const configPath = getConfigPath();
    return fs.stat(configPath, (err) => {
      if (err) return done(new Error('config file does not exist: ' + configPath));
      return done();
    });
  },

  shouldNotExist(done) {
    const configPath = getConfigPath();
    return fs.stat(configPath, (err) => {
      if (err && err.code === 'ENOENT') return done();
      return done(new Error('config file already exists: ' + configPath));
    });
  },

  read() {
    return require(getConfigPath());
  }
};

function getConfigPath() {
  const fileOptionValue = _.get(global.options, 'file');
  if (!fileOptionValue) {
    return path.join(process.cwd(), DEFAULT_CONFIG_FILE_NAME);
  }

  if (path.isAbsolute(fileOptionValue)) {
    return fileOptionValue;
  } else {
    return path.join(process.cwd(), fileOptionValue);
  }
}