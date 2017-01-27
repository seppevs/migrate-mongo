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
    up                    run all unapplied database migrations
    down                  undo the last applied database migration
    status                print the changelog of the database

  Options:

    -h, --help  output usage information
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

The above command did two things: 1) create a sample config.js file and 2) create a 'migrations' directory

Edit the config.js dir, it contains some default values you can edit:
````javascript
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
````

### Creating a migration
To create a new migration, just run the ````migrate-mongo create [description]```` command.

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

This action accepts an (optional) ````-f```` or ````--file```` option to provide a custom config file path:

````bash
$ migrate-mongo status -f '~/configs/albums-migrations.js'
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````

Default, it will look for a ````config.js```` config file in of the current directory.

### Migrate your database UP
This command will apply ALL pending migrations
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

This action accepts an (optional) ````-f```` or ````--file```` option to provide a custom config file path.
Default, it will look for a ````config.js```` config file in of the current directory.

### Migrate down
With this command we will revert (only) the last applied migration

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

This action accepts an (optional) ````-f```` or ````--file```` option to provide a custom config file path.
Default, it will look for a ````config.js```` config file in of the current directory.
