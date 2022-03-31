<p align="center">
    <img src="/migrate-mongo-logo.png" alt="migrate-mongo database migration tool for Node.js"/>

[![Build Status](https://img.shields.io/travis/seppevs/migrate-mongo.svg?style=flat)](https://travis-ci.org/seppevs/migrate-mongo) [![Coverage Status](https://coveralls.io/repos/github/seppevs/migrate-mongo/badge.svg?branch=master)](https://coveralls.io/r/seppevs/migrate-mongo) [![NPM](https://img.shields.io/npm/v/migrate-mongo.svg?style=flat)](https://www.npmjs.org/package/migrate-mongo) [![Downloads](https://img.shields.io/npm/dm/migrate-mongo.svg?style=flat)](https://www.npmjs.org/package/migrate-mongo) [![Dependencies](https://david-dm.org/seppevs/migrate-mongo.svg)](https://david-dm.org/seppevs/migrate-mongo) [![Known Vulnerabilities](https://snyk.io/test/github/seppevs/migrate-mongo/badge.svg)](https://snyk.io/test/github/seppevs/migrate-mongo)

migrate-mongo is a database migration tool for MongoDB running in Node.js 

</p>
    
## Installation
````bash
$ npm install -g migrate-mongo
````

## CLI Usage
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

## Basic Usage
### Initialize a new project
Make sure you have [Node.js](https://nodejs.org/en/) 10 (or higher) installed.  

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

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog",

  // The file extension to create migrations and search for in migration dir 
  migrationFileExtension: ".js",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determin
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false
};
````

Alternatively, you can also encode your database name in the url (and leave out the `databaseName` property):
````
        url: "mongodb://localhost:27017/YOURDATABASE",
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
  up(db, client) {
    // TODO write your migration here. Return a Promise (and/or use async & await).
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
````

Edit this content so it actually performs changes to your database. Don't forget to write the down part as well.
The ````db```` object contains [the official MongoDB db object](https://www.npmjs.com/package/mongodb)
The ````client```` object is a [MongoClient](https://mongodb.github.io/node-mongodb-native/3.3/api/MongoClient.html) instance (which you can omit if you don't use it).

There are 3 options to implement the `up` and `down` functions of your migration: 
1. Return a Promises
2. Use async-await 
3. Call a callback (DEPRECATED!)

Always make sure the implementation matches the function signature:
* `function up(db, client) { /* */ }` should return `Promise`
* `function async up(db, client) { /* */ }` should contain `await` keyword(s) and return `Promise`
* `function up(db, client, next) { /* */ }` should callback `next`

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

#### Overriding the sample migration
To override the content of the sample migration that will be created by the `create` command, 
create a file **`sample-migration.js`** in the migrations directory.

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

## Advanced Features

### Using a custom config file
All actions (except ```init```) accept an optional ````-f```` or ````--file```` option to specify a path to a custom config file.
By default, migrate-mongo will look for a ````migrate-mongo-config.js```` config file in of the current directory.

#### Example:

````bash
$ migrate-mongo status -f '~/configs/albums-migrations.js'
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````

### Using npm packages in your migration scripts
You can use use Node.js modules (or require other modules) in your migration scripts.
It's even possible to use npm modules, just provide a `package.json` file in the root of your migration project:

````bash
$ cd albums-migrations
$ npm init --yes
````

Now you have a package.json file, and you can install your favorite npm modules that might help you in your migration scripts.
For example, one of the very useful [promise-fun](https://github.com/sindresorhus/promise-fun) npm modules.


### Using ESM (ECMAScript Modules) instead of CommonJS
Since migrate-mongo 7.0.0, it's possible to use ESM instead of CommonJS.

#### Using ESM when initializing a new project
Pass the `-m esm` option to the `init` action:
````bash
$ migrate-mongo init -m esm
````

It's also required to have package.json file in the root of your project with `"type": "module"`.
Create a new package.json file:
````bash
$ npm init --yes
````

Then edit this package.json file, and add:
````bash
"type": "module"
````

When you create migration files with `migrate-mongo create`, they will be prepared for you in ESM style.

Please note that CommonJS is still the default module loading system.

### Using MongoDB's Transactions API
You can make use of the [MongoDB Transaction API](https://docs.mongodb.com/manual/core/transactions/) in your migration scripts.

Note: this requires both:
- MongoDB 4.0 or higher 
- migrate-mongo 7.0.0 or higher

migrate-mongo will call your migration `up` and `down` function with a second argument: `client`.
This `client` argument is an [MongoClient](https://mongodb.github.io/node-mongodb-native/3.3/api/MongoClient.html) instance, it gives you access to the `startSession` function.

Example:

````javascript
module.exports = {
  async up(db, client) {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
            await db.collection('albums').updateOne({artist: 'The Doors'}, {$set: {stars: 5}});
        });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
            await db.collection('albums').updateOne({artist: 'The Doors'}, {$set: {stars: 0}});
        });
    } finally {
      await session.endSession();
    }
  },
};
````

### Using a file hash algorithm to enable re-running updated files
There are use cases where it may make sense to not treat scripts as immutable items.  An example would be a simple collection with lookup values where you just can wipe and recreate the entire collection all at the same time.

```javascript
useFileHash: true
```

Set this config value to will enable tracking a hash of the file contents and will run a file with the same name again as long as the file contents have changes.  Setting this flag changes the behavior for every script and if this is enabled each script needs to be written in a manner where it can be re-run safefly.  A script of the same name and hash will not be executed again, only if the hash changes.

Now the status will also include the file hash in the output

```bash
┌────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┬──────────────────────────┐
│ Filename                               │ Hash                                                             │ Applied At               │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ 20160608155948-blacklist_the_beatles.js│ 7625a0220d552dbeb42e26fdab61d8c7ef54ac3a052254588c267e42e9fa876d │ 2021-03-04T15:40:22.732Z │
└────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┴──────────────────────────┘

```

### Version
To know which version of migrate-mongo you're running, just pass the `version` option:

````bash
$ migrate-mongo version
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

### `database.connect() → Promise<{db: MongoDb, client: MongoClient}>`

Connect to a mongo database using the connection settings from the `migrate-mongo-config.js` file.

```javascript
const { db, client } = await database.connect();
```

### `config.read() → Promise<JSON>`

Read connection settings from the `migrate-mongo-config.js` file.

```javascript
const mongoConnectionSettings = await config.read();
```

### `config.set(yourConfigObject)`

Tell migrate-mongo NOT to use the `migrate-mongo-config.js` file, but instead use the config object passed as the first argument of this function.
When using this feature, please do this at the very beginning of your program.

Example:
```javascript
const { config, up } = require('../lib/migrate-mongo');

const myConfig = {
    mongodb: {
        url: "mongodb://localhost:27017/mydatabase",
        options: { useNewUrlParser: true }
    },
    migrationsDir: "migrations",
    changelogCollectionName: "changelog",
    migrationFileExtension: ".js"
};

config.set(myConfig);

// then, use the API as you normally would, eg:
await up();
```

### `up(MongoDb, MongoClient) → Promise<Array<fileName>>`

Apply all pending migrations

```javascript
const { db, client } = await database.connect();
const migrated = await up(db, client);
migrated.forEach(fileName => console.log('Migrated:', fileName));
```

If an an error occurred, the promise will reject and won't continue with the rest of the pending migrations.

### `down(MongoDb, MongoClient) → Promise<Array<fileName>>`

Revert (only) the last applied migration

```javascript
const { db, client } = await database.connect();
const migratedDown = await down(db, client);
migratedDown.forEach(fileName => console.log('Migrated Down:', fileName));
```

### `status(MongoDb) → Promise<Array<{ fileName, appliedAt }>>`

Check which migrations are applied (or not.

```javascript
const { db } = await database.connect();
const migrationStatus = await status(db);
migrationStatus.forEach(({ fileName, appliedAt }) => console.log(fileName, ':', appliedAt));
```

### `client.close() → Promise`
Close the database connection

```javascript
const { db, client } = await database.connect();
await client.close();
```
