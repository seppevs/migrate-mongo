# migrate-mongo
A database migration tool for MongoDB in Node.

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

  up: function (db, next) {
    // TODO write your migration here
    next();
  },

  down: function (db, next) {
    // TODO write the statements to rollback your migration (if possible)
    next()
  }

};
````

Edit this content so it actually performs changes to your database. Don't forget to write the down part as well.
The ````db```` object contains [the official MongoDB db object](https://www.npmjs.com/package/mongodb)

An example:
````javascript
'use strict';

module.exports = {

  up: function (db, next) {
    db.collection('albums').update({artist: 'The Beatles'}, {$set: {blacklisted: true}}, next);
  },

  down: function (db, next) {
    db.collection('albums').update({artist: 'The Beatles'}, {$set: {blacklisted: false}}, next);
  }
};
````

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
