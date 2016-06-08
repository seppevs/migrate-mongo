'use strict';

// This is where you can configure migrate-mongo
module.exports = {

  // The mongodb collection where the applied changes are stored:
  changelogCollectionName: 'changelog',

  mongodb: {
    // TODO edit this connection url to your MongoDB database:
    url: 'mongodb://localhost:27017/YOURDATABASENAME' 
  }
};