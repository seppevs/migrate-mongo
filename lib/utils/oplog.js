async function getCurrentTimestamp(client) {
    const localDb = client.db('local');
    const oplog = await localDb.collection('oplog.rs').find({}, { projection: { ts: 1, _id: 0 } }).sort({ $natural: -1 }).limit(1).toArray();
    return oplog[0].ts;
  }

module.exports = {
    getCurrentTimestamp,
}
