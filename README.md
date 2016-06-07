# migrate-mongo
A migration framework for Mongodb in Node

## Usage
````
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

## Features
* Creates migration scripts prefixed with a timestamp
* Stores the changelog in the database
