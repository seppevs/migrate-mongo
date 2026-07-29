// Constants
const COLLECTION_INTERCEPTED_METHODS = [
  'insertOne',
  'insertMany',
  'replaceOne',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
];

/**
 * Truncates a dotted field path at the first positional segment
 * ("$", "$[]", or "$[<identifier>]"), so array operators always resolve
 * to the root array field rather than a single element. Restoring the
 * whole array field is what lets us invert $push/$pull/$pop/$addToSet/
 * $pullAll without interpreting what each one actually did.
 */
function truncateArrayPath(path) {
  const segments = String(path).split('.');
  const positionalIndex = segments.findIndex(segment => segment.startsWith('$'));
  return positionalIndex === -1 ? path : segments.slice(0, positionalIndex).join('.');
}

/**
 * Returns the set of top-level dotted field paths a MongoDB update
 * modifier document will touch, regardless of which operator(s) are used.
 *
 * This works generically for every field/array update operator
 * ($set, $unset, $inc, $mul, $min, $max, $currentDate, $bit, $addToSet,
 * $pop, $pull, $push, $pullAll, positional $/$[]/$[<id>]) because for all
 * of them, the operator's sub-document keys ARE the affected field paths -
 * we never need to know what value each operator produces, only where it
 * writes.
 *
 * $rename is a special case: its keys are source paths and its *values*
 * are destination paths, both of which need a pre-image.
 *
 * $setOnInsert is skipped entirely: it only ever applies when an upsert
 * inserts a brand-new document, which is inverted separately as a delete
 * (see INVERSE_OPERATIONS.updateOne/updateMany), so no pre-image is needed.
 */
function getModifiedFieldPaths(updateArg) {
  if (Array.isArray(updateArg)) {
    throw new Error(
      'Auto-rollback cannot invert aggregation-pipeline style updates ' +
      '(an array of stage documents), because the fields they modify ' +
      'cannot be determined without executing the pipeline.'
    );
  }

  const paths = new Set();

  for (const operator of Object.keys(updateArg ?? {})) {
    if (!operator.startsWith('$')) continue;
    if (operator === '$setOnInsert') continue;

    if (operator === '$rename') {
      for (const [fromPath, toPath] of Object.entries(updateArg.$rename)) {
        paths.add(truncateArrayPath(fromPath));
        paths.add(truncateArrayPath(toPath));
      }
      continue;
    }

    const operatorFields = updateArg[operator];
    if (!operatorFields || typeof operatorFields !== 'object') continue;

    for (const fieldPath of Object.keys(operatorFields)) {
      paths.add(truncateArrayPath(fieldPath));
    }
  }

  return [...paths];
}

/** Reads a dotted path (e.g. "address.city") out of a plain object. */
function getNestedValue(obj, path) {
  return path.split('.').reduce(
    (current, segment) => (current === null || current === undefined ? undefined : current[segment]),
    obj
  );
}

/** True if a dotted path actually exists on obj (as opposed to just being undefined). */
function hasNestedValue(obj, path) {
  let current = obj;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || !(segment in current)) return false;
    current = current[segment];
  }
  return true;
}

/**
 * Builds the {$set, $unset} operation that restores `modifiedPaths` on
 * `beforeDoc` back to their pre-update values. Fields that didn't exist
 * pre-update are $unset rather than $set back to undefined.
 */
function buildInverseUpdate(beforeDoc, modifiedPaths) {
  const setFields = {};
  const unsetFields = {};

  for (const path of modifiedPaths) {
    if (hasNestedValue(beforeDoc, path)) {
      setFields[path] = getNestedValue(beforeDoc, path);
    } else {
      unsetFields[path] = "";
    }
  }

  const inverseUpdate = {};
  if (Object.keys(setFields).length) inverseUpdate.$set = setFields;
  if (Object.keys(unsetFields).length) inverseUpdate.$unset = unsetFields;
  return inverseUpdate;
}

/**
 * Creates inverse operations for auto-rollback functionality
 */
const INVERSE_OPERATIONS = {
  async insertOne(collection, filterArg, updateArg, operationResult) {
    if (!operationResult) return [];
    return [{ deleteOne: { filter: { _id: operationResult.insertedId } } }];
  },
  async insertMany(collection, filterArg, updateArg, operationResult) {
    if (!operationResult) return [];
    return [{ deleteMany: { filter: { _id: { $in: Object.values(operationResult.insertedIds) } } } }];
  },
  async replaceOne(collection, filterArg, updateArg, operationResult) {
    if (operationResult) return [];
    const doc = await collection.findOne(filterArg);

    /* istanbul ignore next */
    if (!doc) return [];

    return [{
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc
      }
    }];
  },
  async updateOne(collection, filterArg, updateArg, operationResult) {
    // PRE-OPERATION CALL (operationResult === null, before the write runs):
    // Capture the pre-update value of only the fields this update touches -
    // not the whole document - so we can restore exactly those fields later.
    if (!operationResult) {
      const modifiedPaths = getModifiedFieldPaths(updateArg);
      if (modifiedPaths.length === 0) return [];

      const projection = modifiedPaths.reduce((acc, path) => {
        acc[path] = 1;
        return acc;
      }, {});

      const before = await collection.findOne(filterArg, { projection });

      // No matching document yet. If this turns into an upsert that inserts
      // a brand-new document, the post-operation branch below records a
      // delete instead - there's no pre-image to restore here.
      if (!before) return [];

      const inverseUpdate = buildInverseUpdate(before, modifiedPaths);

      return [{
        updateOne: {
          filter: { _id: before._id },
          update: inverseUpdate
        }
      }];
    }

    // POST-OPERATION CALL (operationResult is the driver's UpdateResult):
    // The only case left is an upsert that created a new document - since
    // there was no pre-image, the inverse of "insert" is "delete".
    if (operationResult.upsertedId) {
      return [{
        deleteOne: { filter: { _id: operationResult.upsertedId } }
      }];
    }

    return [];
  },
  async updateMany(collection, filterArg, updateArg, operationResult) {
    // PRE-OPERATION CALL: same idea as updateOne, but for every matched
    // document. The set of touched field paths is the same for all of them
    // (it's determined by the update document, not by any one doc's data),
    // so we compute it once and snapshot + invert per-document.
    if (!operationResult) {
      const modifiedPaths = getModifiedFieldPaths(updateArg);
      if (modifiedPaths.length === 0) return [];

      const projection = modifiedPaths.reduce((acc, path) => {
        acc[path] = 1;
        return acc;
      }, {});

      const beforeDocs = await collection.find(filterArg, { projection }).toArray();

      return beforeDocs
        .map(doc => {
          const inverseUpdate = buildInverseUpdate(doc, modifiedPaths);

          return {
            updateOne: {
              filter: { _id: doc._id },
              update: inverseUpdate
            }
          };
        });
    }

    // POST-OPERATION CALL: updateMany can upsert at most one new document
    // when no existing document matches the filter - invert it as a delete.
    if (operationResult.upsertedId) {
      return [{
        deleteOne: { filter: { _id: operationResult.upsertedId } }
      }];
    }

    return [];
  },
  async deleteOne(collection, filterArg, updateArg, operationResult) {
    if (operationResult) return [];
    const doc = await collection.findOne(filterArg);

    /* istanbul ignore next */
    if (!doc) return [];

    return [{ insertOne: doc }];
  },
  async deleteMany(collection, filterArg, updateArg, operationResult) {
    if (operationResult) return [];

    const docs = await collection.find(filterArg).toArray();
    return docs.map(doc => ({ insertOne: doc }));
  }
};


// Creates a wrapped collection method that records inverse operations for rollback
function createWrappedMethod(methodName, collection, originalMethod, db, autoRollbackCollection) {
  return async function (...args) {
    try {
      const filterArg = args[0];
      const updateArg = args[1] ?? null;

      const preOperation = await INVERSE_OPERATIONS[methodName](collection, filterArg, updateArg, null);

      // Original MongoDb operation
      const operationResult = await originalMethod(...args);

      const postOperation = await INVERSE_OPERATIONS[methodName](collection, filterArg, updateArg, operationResult);

      // Combine PreOperation and postRollback operations
      const rollbackOperations = [...preOperation, ...postOperation];

      // Informs the rollback order
      /* istanbul ignore next */
      db.autoRollbackCounter = db.autoRollbackCounter ?? 0;

      const timestamp = new Date();
      const bulkWriteInsertOperations = rollbackOperations.map(operation => ({
        insertOne: {
          timestamp,
          migrationFile: db.migrationFile,
          orderIndex: db.autoRollbackCounter++,
          originalArgs: args,
          collection: collection.collectionName,
          bulkWriteOperation: operation,
        }
      }));

      // Write rollback operations to the auto-rollback collection
      await autoRollbackCollection.bulkWrite(bulkWriteInsertOperations, { ordered: true });

      return operationResult;
    } catch (error) {
      /* istanbul ignore next */
      throw new Error(`Failed to execute ${methodName} with auto-rollback: ${error.message}`);
    }
  };
}

// Wraps a collection to intercept methods for auto-rollback tracking
function wrapDbCollection(collection, db, configContent, excludedCollections) {
  const autoRollbackCollection = db.collection(configContent.autoRollbackCollectionName);

  COLLECTION_INTERCEPTED_METHODS.forEach(methodName => {
    const originalMethod = collection[methodName].bind(collection);
    collection[methodName] = createWrappedMethod(
      methodName,
      collection,
      originalMethod,
      db,
      autoRollbackCollection);
  });

  return collection;
}

export default {
  wrapDbWithAutoRollback(db, configContent, originalCollection) {
    const autoRollbackExcludedCollections = [
      configContent.changelogCollectionName,
      configContent.lockCollectionName,
      configContent.autoRollbackCollectionName
    ];

    // Override the collection method to return wrapped collections
    db.collection = (name, options) => {
      const collection = originalCollection(name, options);

      if (autoRollbackExcludedCollections.includes(collection.collectionName)) {
        return collection;
      }

      // istanbul ignore next
      if (!configContent.autoRollbackCollectionName
        || !db.autoRollbackEnabled) {

        if (db.autoRollbackEnabled) {
          // Auto-rollback is enabled but not properly configured
          throw new Error("Auto-rollback is not enabled in the config file.");
        }
        return collection;
      }

      return wrapDbCollection(collection, db, configContent, autoRollbackExcludedCollections);
    };

    // Performs auto-rollback for the current migration
    db.autoRollback = async () => {

      // istanbul ignore next
      if (configContent.autoRollbackCollectionName === undefined
        || configContent.autoRollbackCollectionName === null) {
        configContent.autoRollbackCollectionName = "auto_rollback_migrations";
      }

      try {
        const autoRollbackCollection = originalCollection(configContent.autoRollbackCollectionName);
        const collectionNames = await autoRollbackCollection.distinct(
          "collection",
          { migrationFile: db.migrationFile }
        );

        for (const collectionName of collectionNames) {
          const targetCollection = originalCollection(collectionName);
          const rollbackEntries = await autoRollbackCollection
            .find({ migrationFile: db.migrationFile, collection: collectionName })
            .sort({ timestamp: -1, orderIndex: -1 })
            .project({ _id: 0, bulkWriteOperation: 1 })
            .toArray();

          const operations = rollbackEntries.map(e => e.bulkWriteOperation);
          await targetCollection.bulkWrite(operations, { ordered: true });
        }

        await autoRollbackCollection.deleteMany({ migrationFile: db.migrationFile });
      } catch (error) {
        /* istanbul ignore next */
        throw new Error(`Auto-rollback failed: ${error.message}`);
      }
    };
  }
};