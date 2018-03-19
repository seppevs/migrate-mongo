# migrate-mongo
A database migration tool for MongoDB in Node.

[![Build Status](http://img.shields.io/travis/seppevs/migrate-mongo.svg?style=flat)](https://travis-ci.org/seppevs/migrate-mongo) [![Coverage Status](https://coveralls.io/repos/github/seppevs/migrate-mongo/badge.svg?branch=master)](https://coveralls.io/r/seppevs/migrate-mongo) [![NPM](http://img.shields.io/npm/v/migrate-mongo.svg?style=flat)](https://www.npmjs.org/package/migrate-mongo) [![Downloads](http://img.shields.io/npm/dm/migrate-mongo.svg?style=flat)](https://www.npmjs.org/package/migrate-mongo)

## Installation
````bash
$ npm install -g migrate-mongo
````

## Usage
````
$ migrate-mongo
Usage: migrate-mongo [options] [command]


  Commands:

    init                  initialize a new migration project
    create [description]  create a new database migration with the provided description
    up [options]          run all unapplied database migrations
    down [options]        undo the last applied database migration
    status [options]      print the changelog of the database

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
````

## Quickstart
### Initialize a new project
Create a directory where you want to store your migrations for your mongo database (eg. 'albums' here) and cd into it
````bash
$ mkdir albums-migrations
$ cd albums-migrations
````

Initialize a new migrate-mongo project
````bash
$ migrate-mongo init
Initialization successful. Please edit the generated config.js file
````

The above command did two things: 
1. create a sample 'config.js' file and 
2. create a 'migrations' directory

Edit the config.js file. Make sure you change the mongodb url:
````javascript
'use strict';

// In this file you can configure migrate-mongo

module.exports = {

  mongodb: {
    
    // TODO Change (or review) the url to your MongoDB:
    url: 'mongodb://localhost:27017',

    // TODO Change this to your database name:
    databaseName: "YOURDATABASENAME",

    // uncomment and edit to specify Mongo client connect options (eg. increase the timeouts)
    // see https://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html
    //
    // options: {
    //   connectTimeoutMS: 3600000, // 1 hour
    //   socketTimeoutMS: 3600000, // 1 hour
    // }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: 'migrations',

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: 'changelog',

};
````

### Creating a new migration script
To create a new database migration script, just run the ````migrate-mongo create [description]```` command.

For example:
````bash
$ migrate-mongo create blacklist_the_beatles
Created: migrations/20160608155948-blacklist_the_beatles.js
````

A new migration file is created in the 'migrations' directory:
````javascript
'use strict';

module.exports = {

  up(db, next) {
    // TODO write your migration here
    next();
  },

  down(db, next) {
    // TODO write the statements to rollback your migration (if possible)
    next();
  }

};
````

Edit this content so it actually performs changes to your database. Don't forget to write the down part as well.
The ````db```` object contains [the official MongoDB db object](https://www.npmjs.com/package/mongodb)

An example:
````javascript
'use strict';

module.exports = {

  up(db, next) {
    db.collection('albums').update({artist: 'The Beatles'}, {$set: {blacklisted: true}}, next);
  },

  down(db, next) {
    db.collection('albums').update({artist: 'The Beatles'}, {$set: {blacklisted: false}}, next);
  }
};
````

The up/down implementation can use either callback-style or return a Promise.

````javascript
'use strict';

module.exports = {

  up(db) {
    return db.collection('albums').update({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  down(db) {
    return db.collection('albums').update({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
````

Make sure the implementation matches the function signature.

* `function up(db) { /* */ }` should return `Promise`
* `function up(db, next) { /* */ }` should callback `next`

### Checking the status of the migrations
At any time, you can check which migrations are applied (or not)

````bash
$ migrate-mongo status
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````


### Migrate up
This command will apply all pending migrations
````bash
$ migrate-mongo up
MIGRATED UP: 20160608155948-blacklist_the_beatles.js
````

If an an error occurred, it will stop and won't continue with the rest of the pending migrations

If we check the status again, we can see the last migration was successfully applied:
````bash
$ migrate-mongo status
┌─────────────────────────────────────────┬──────────────────────────┐
│ Filename                                │ Applied At               │
├─────────────────────────────────────────┼──────────────────────────┤
│ 20160608155948-blacklist_the_beatles.js │ 2016-06-08T20:13:30.415Z │
└─────────────────────────────────────────┴──────────────────────────┘
````

### Migrate down
With this command, migrate-mongo will revert (only) the last applied migration

````bash
$ migrate-mongo down
MIGRATED DOWN: 20160608155948-blacklist_the_beatles.js
````

If we check the status again, we see that the reverted migration is pending again:
````bash
$ migrate-mongo status
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘
````

## Using a custom config file
All actions (except ```init```) accept an optional ````-f```` or ````--file```` option to specify a path to a custom config file.
By default, migrate-mongo will look for a ````config.js```` config file in of the current directory.

### Example:

````bash
$ migrate-mongo status -f '~/configs/albums-migrations.js'
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````
