// In this file you can configure migrate-mongo

const config = {
  mongodb: {
    // TODO Change (or review) the url to your MongoDB:
    url: "mongodb://localhost:27017",

    // TODO Change this to your database name:
    databaseName: "YOURDATABASENAME",

    options: {
      useNewUrlParser: true, // removes a deprecation warning when connecting
      useUnifiedTopology: true, // removes a deprecating warning when connecting
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  },

  // optional context function that is called before each migration, of which the object is passed as the third parameter to the up/down call
  // migrationFile: The name of the migration
  // operation: 'up' | 'down'
  // returns: object
  context: async ({ migrationFile, operation }) => { return {} },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog",

  // Field in collection to store migration name
  nameField: 'fileName',

  // Prefix for migration name
  namePrefix: '',

  // Whether name should include file extension
  nameWithoutExtension: false,

  // Field in collection to store migration applied date
  dateField: 'appliedAt',

  // The mongodb collection where the lock will be created.
  lockCollectionName: "changelog_lock",

  // The value in seconds for the TTL index that will be used for the lock. Value of 0 will disable the feature.
  lockTtl: 0,

  // The file extension to create migrations and search for in migration dir 
  migrationFileExtension: ".js",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false
};

// Return the config as a promise
module.exports = config;
