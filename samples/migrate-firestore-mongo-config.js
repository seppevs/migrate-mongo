const config = {
  firestore: {
    applicationCredentials: 'YOURFIREBASEAPPLICATIONCREDENTIALS',
    serviceAccount: 'YOURFIREBASESERVICEACCOUNT',
    privateKey: 'YOURFIREBASEPRIVATEKEY'
  },
  mongodb: {    
    url: "mongodb://localhost:27017",
    databaseName: "YOURDATABASENAME",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true      
    }
  },
  migrationsDir: "imports",
  importsCollectionName: "imports",
  migrationFileExtension: ".ts",
  useFileHash: false
};

module.exports = config;
