'use strict';

// This is where you can configure migrate-mongo
module.exports = {

  // The mongodb collection where the applied changes are stored:
  changelogCollectionName: 'changelog',

  mongodb: {
    url: 'mongodb://localhost:27017' // the connection url to mongodb
  }
};