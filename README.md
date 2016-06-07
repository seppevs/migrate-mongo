# migrate-mongo
A migration framework for Mongodb in Node

## Installation
````bash
$ npm install -g migrate-node
````

## Quickstart
### Initialize a new project
Create a directory where you want to store your migrations for your mongo database (eg. 'animals' here) and cd into it
````bash
$ mkdir animals-migrations
$ cd animals-migrations
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
    url: 'mongodb://localhost:27017' // the connection url to mongodb
  }
};
````

### Creating a migration
Run this command
````bash
$ migrate-mongo create populate_with_known_animals
Created: migrations/20160607214038-populate_with_known_animals.js
````

A new migration file is created:
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
The ````db```` object contains [the official mongodb db object](https://www.npmjs.com/package/mongodb)

An example:


### Getting help
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


