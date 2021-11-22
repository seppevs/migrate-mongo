const _ = require("lodash");
const arrayChunks = require('array.chunk');
const pEachSeries = require("p-each-series");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");

module.exports = async (firestoreConnection, mongoConnection) => {
  const statusItems = await status(mongoConnection);
  const pendingItems = _.filter(statusItems, { appliedAt: "PENDING" });
  const migrated = [];

  const migrateItem = async item => {
    try {
      const migration = await migrationsDir.loadMigration(item.fileName);
      const search = migration.search;
      const insert = migration.insert;
      const stream = await search(firestoreConnection);
      const data = [];

      process.stdout.write("\nLoading search ");

      const searchWaitLoop = setInterval(() => process.stdout.write('.'), 500);

      let count = 0;

      const streamPromise = new Promise(resolve => {
        stream.on("data", snapshot => {
          const chunk = { id: snapshot.id, ...snapshot.data() };

          data.push(chunk)

          count++;
        });
        stream.on("end", () => {
          clearInterval(searchWaitLoop);
          process.stdout.write(' OK');
          resolve({ data, count });
        });
      });

      await streamPromise;

      process.stdout.write("\nInsert data ");

      const insertWaitLoop = setInterval(() => process.stdout.write('.'), 500);

      const dataChunks = arrayChunks(data, 10);

      for (const chunkedData of dataChunks) {
        try {
          await insert(chunkedData, mongoConnection.db);
        } catch (e) {}
      }
      process.stdout.write(' OK');
      clearInterval(insertWaitLoop);
    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.fileName}: ${err.message}`
      );
      error.stack = err.stack;
      error.migrated = migrated;
      throw error;
    }

    const { importsCollectionName, useFileHash } = await config.read();
    const importsCollection = mongoConnection.db.collection(importsCollectionName);

    const { fileName, fileHash } = item;
    const appliedAt = new Date();

    try {
      await importsCollection.insertOne(useFileHash === true ? { fileName, fileHash, appliedAt } : { fileName, appliedAt });
    } catch (err) {
      throw new Error(`Could not update changelog: ${err.message}`);
    }
    migrated.push(item.fileName);
  };

  await pEachSeries(pendingItems, migrateItem);

  console.log("\nFinish!");

  return migrated;
};
