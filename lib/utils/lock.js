const config = require('../env/config');

async function getLockCollection(db) {
    const { lockCollectionName, lockTtl } = await config.read();
    if (!lockCollectionName || lockTtl <= 0) {
        return null;
    }

    const lockCollection = db.collection(lockCollectionName);
    lockCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: lockTtl });
    return lockCollection;
}

async function exist(db) {
    const lockCollection = await getLockCollection(db);
    if (!lockCollection) {
        return false;
    }
    const foundLocks = await lockCollection.find({}).toArray();

    return foundLocks.length > 0;
}

async function activate(db) {
    const lockCollection = await getLockCollection(db);
    if (lockCollection) {
        await lockCollection.insertOne({ createdAt: new Date() });
    }
}

async function clear(db) {
    const lockCollection = await getLockCollection(db);
    if (lockCollection) {
        await lockCollection.deleteMany({});
    }
}

module.exports = {
    exist,
    activate,
    clear,
}
