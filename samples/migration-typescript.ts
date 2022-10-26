import { Db, MongoClient } from 'mongodb';

module.exports = {
  async up(db: Db, client: MongoClient, context) {
    // TODO write your migration here.
    // See https://github.com/theogravity/migrate-mongo-alt/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  async down(db: Db, client: MongoClient, context) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
