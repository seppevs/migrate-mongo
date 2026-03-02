import config from '../env/config.js';

async function getLockCollection(db) {
    const { lockCollectionName, lockTtl } = await config.read();
    if (!lockCollectionName || lockTtl <= 0) {
        return null;
    }

    const lockCollection = db.collection(lockCollectionName);
    await lockCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: lockTtl });
    return lockCollection;
}

async function acquire(db) {
    const lockCollection = await getLockCollection(db);
    if (!lockCollection) {
        return true;
    }
    try {
        const result = await lockCollection.updateOne(
            { _id: 'lock' },
            { $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
        );
        return result.upsertedCount === 1;
    } catch (err) {
        if (err.code === 11000) return false;
        throw err;
    }
}

async function clear(db) {
    const lockCollection = await getLockCollection(db);
    if (lockCollection) {
        await lockCollection.deleteOne({ _id: 'lock' });
    }
}

export { acquire, clear };
export default { acquire, clear };
