# migrate-mongo
A database migration tool for MongoDB in Node. 

✨ [![Build Status](http://img.shields.io/travis/seppevs/migrate-mongo.svg?style=flat)](https://travis-ci.org/seppevs/migrate-mongo) [![Coverage Status](https://coveralls.io/repos/github/seppevs/migrate-mongo/badge.svg?branch=master)](https://coveralls.io/r/seppevs/migrate-mongo) [![NPM](http://img.shields.io/npm/v/migrate-mongo.svg?style=flat)](https://www.npmjs.org/package/migrate-mongo) [![Downloads](http://img.shields.io/npm/dm/migrate-mongo.svg?style=flat)](https://www.npmjs.org/package/migrate-mongo) [![Dependencies](https://david-dm.org/seppevs/migrate-mongo.svg)](https://david-dm.org/seppevs/migrate-mongo) [![Known Vulnerabilities](https://snyk.io/test/github/seppevs/migrate-mongo/badge.svg)](https://snyk.io/test/github/seppevs/migrate-mongo) ✨

## Installation
````bash
$ npm install -g migrate-mongo
````

## CLI Usage
````
$ migrate-mongo
Usage: migrate-mongo [options] [command]


  Commands:

  init                          initialize a new migration project
    create [description]        create a new database migration with the provided description
    create-before [description] create a new database script that always runs before migrations with the provided description
    create-after [description]  create a new database script that always runs after migrations with the provided description
    up [options]                run all unapplied database migrations
    down [options]              undo the last applied database migration
    status [options]            print the changelog of the database

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
````

## Quickstart
### Initialize a new project
Make sure you have [Node.js](https://nodejs.org/en/) 7.6.0 (or higher) installed.  

Create a directory where you want to store your migrations for your mongo database (eg. 'albums' here) and cd into it
````bash
$ mkdir albums-migrations
$ cd albums-migrations
````

Initialize a new migrate-mongo project
````bash
$ migrate-mongo init
Initialization successful. Please edit the generated migrate-mongo-config.js file
````

The above command did two things: 
1. create a sample 'migrate-mongo-config.js' file and 
2. create a 'migrations' directory

Edit the migrate-mongo-config.js file. An object or promise can be returned. Make sure you change the mongodb url: 
````javascript
// In this file you can configure migrate-mongo

module.exports = {
  mongodb: {
    // TODO Change (or review) the url to your MongoDB:
    url: "mongodb://localhost:27017",

    // TODO Change this to your database name:
    databaseName: "YOURDATABASENAME",

    options: {
      useNewUrlParser: true // removes a deprecation warning when connecting
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: "migrations",

  // The before dir, can be an relative or absolute path. Only edit this when really necessary.
  beforeDir: "before",

  // The before dir, can be an relative or absolute path. Only edit this when really necessary.
  afterDir: "after",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog"
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
module.exports = {
  up(db) {
    // TODO write your migration here. Return a Promise (and/or use async & await).
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  down(db) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
````

Edit this content so it actually performs changes to your database. Don't forget to write the down part as well.
The ````db```` object contains [the official MongoDB db object](https://www.npmjs.com/package/mongodb)

There are 3 options to implement the `up` and `down` functions of your migration: 
1. Return a Promises
2. Use async-await 
3. Call a callback (deprecated)

Always make sure the implementation matches the function signature:
* `function up(db) { /* */ }` should return `Promise`
* `function async up(db) { /* */ }` should contain `await` keyword(s) and return `Promise`
* `function up(db, next) { /* */ }` should callback `next`

#### Example 1: Return a Promise
````javascript
module.exports = {
  up(db) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  down(db) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
````

#### Example 2: Use async & await
Async & await is especially useful if you want to perform multiple operations against your MongoDB in one migration.

````javascript
module.exports = {
  async up(db) {
    await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    await db.collection('albums').updateOne({artist: 'The Doors'}, {$set: {stars: 5}});
  },

  async down(db) {
    await db.collection('albums').updateOne({artist: 'The Doors'}, {$set: {stars: 0}});
    await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  },
};
````

#### Example 3: Call a callback (deprecated)
Callbacks are supported for backwards compatibility.
New migration scripts should be written using Promises and/or async & await. It's easier to read and write.

````javascript
module.exports = {
  up(db, callback) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}}, callback);
  },

  down(db, callback) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}}, callback);
  }
};
````

### Creating a new 'before' or 'after' script
To create a new database before or after script, just run ````migrate-mongo create-before [description]```` or
````migrate-mongo create-after [description]````. As the names imply, these scripts get 
run each time either before or after the database migration is run. 
These scripts are good for tasks like ensuring indexes on each migration run.

For example:
````bash
$ migrate-mongo create-after blacklist_the_beatles_idx
Created: after/20160608155948-blacklist_the_beatles_idx.js
````

A new migration file is created in the 'before' or 'after' directory.
Always scripts only contain an 'up' as they are not a migration.
````javascript
module.exports = {
  up(db) {
    // TODO write your migration here. Return a Promise (and/or use async & await).
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
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
By default, migrate-mongo will look for a ````migrate-mongo-config.js```` config file in of the current directory.

### Example:

````bash
$ migrate-mongo status -f '~/configs/albums-migrations.js'
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````

## API Usage

```javascript
const {
  init,
  create,
  database,
  config,
  up,
  down,
  status
} = require('migrate-mongo');
```

### `init() → Promise`

Initialize a new migrate-mongo project
```javascript
await init();
```

The above command did two things: 
1. create a sample `migrate-mongo-config.js` file and 
2. create a `migrations` directory

Edit the `migrate-mongo-config.js` file. Make sure you change the mongodb url.

### `create(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create('blacklist_the_beatles');
console.log('Created:', fileName);
```

A new migration file is created in the `migrations` directory.

### `create-before(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create-before('blacklist_the_beatles_before');
console.log('Created:', fileName);
```

A new always-before file is created in the `before` directory.

### `create-after(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create-before('blacklist_the_beatles_after');
console.log('Created:', fileName);
```

A new always-after file is created in the `after` directory.

### `database.connect() → Promise<MongoDb>`

Connect to a mongo database using the connection settings from the `migrate-mongo-config.js` file.

```javascript
const db = await database.connect();
```

### `config.read() → Promise<JSON>`

Read connection settings from the `migrate-mongo-config.js` file.

```javascript
const mongoConnectionSettings = await config.read();
```

### `up(MongoDb) → Promise<Array<fileName>>`

Apply all pending migrations

```javascript
const db = await database.connect();
const migrated = await up(db);
migrated.forEach(fileName => console.log('Migrated:', fileName));
```

If an an error occurred, the promise will reject and won't continue with the rest of the pending migrations.

### `down(MongoDb) → Promise<Array<fileName>>`

Revert (only) the last applied migration

```javascript
const db = await database.connect();
const migratedDown = await down(db);
migratedDown.forEach(fileName => console.log('Migrated Down:', fileName));
```

### `status(MongoDb) → Promise<Array<{ fileName, appliedAt }>>`

Check which migrations are applied (or not.

```javascript
const db = await database.connect();
const migrationStatus = await status(db);
migrationStatus.forEach(({ fileName, appliedAt }) => console.log(fileName, ':', appliedAt));
```

### `db.close() → Promise`
Close the database connection

```javascript
const db = await database.connect();
await db.close()
```
