module.exports = {
  async search(firestoreConnection) {
    // TODO write firestore migration here. Must be returns a stream
    // Example:
    // await firestoreConnection.collection('users'). db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  async rowInsert(mongoDbConnection) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
