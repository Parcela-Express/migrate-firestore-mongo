const _ = require("lodash");
const arrayChunks = require('array.chunk');
const pEachSeries = require("p-each-series");

const status = require("./status");
const config = require("../env/config");
const migrationsDir = require("../env/migrationsDir");

module.exports = async (firestoreConnection, mongoConnection) => {
  const statusItems = await status(mongoConnection.db);
  const pendingItems = _.filter(statusItems, { appliedAt: "PENDING" });
  const migrated = [];

  const migrateItem = async item => {
    try {
      const migration = await migrationsDir.loadMigration(item.fileName);
      const search = migration.search;
      const insert = migration.insert;
      const raw = migration.raw;

      if (raw) {
        console.log(`\nRun "${item.fileName}" raw import \n`);

        await raw(firestoreConnection, mongoConnection.db);
      } else {
        const stream = await search(firestoreConnection);

        const data = [];

        process.stdout.write(`\nLoading "${item.fileName}" search `);

        const searchWaitLoop = setInterval(() => process.stdout.write('.'), 500);

        let count = 0;

        const streamPromise = new Promise(resolve => {
          const onCloseStream = () => {
            clearInterval(searchWaitLoop);          
            resolve({ data, count });
          }

          stream.on("data", function(snapshot) {
            let parsedSnapshot;

            try {
              parsedSnapshot = JSON.parse(snapshot);
            } catch (e) {
              parsedSnapshot = snapshot;
            }
            let snapshotData = parsedSnapshot.data;

            if (typeof parsedSnapshot.data === 'function') {
              snapshotData = parsedSnapshot.data();
            }
            const id = parsedSnapshot.id;

            delete snapshotData.id;

            const chunk = { _id: id, ...snapshotData };            

            data.push(chunk);

            count++;
          });
          stream.on("end", () => {
            onCloseStream();
          });
          stream.on("close", () => {
            onCloseStream();
          });
        });

        await streamPromise;

        process.stdout.write(' OK');
        process.stdout.write(`\nInsert "${item.fileName}" data `);

        const insertWaitLoop = setInterval(() => process.stdout.write('.'), 500);

        const dataChunks = arrayChunks(data, 1000);

        for (const chunkedData of dataChunks) {
          try {
            await insert(chunkedData, mongoConnection.db);
          } catch (e) {}
        }
        process.stdout.write(' OK');
        clearInterval(insertWaitLoop);
      }      
    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.fileName}: ${err.message}`
      );
      error.stack = err.stack;
      error.migrated = migrated;
      throw error;
    }
    const { importsCollectionName, useFileHash } = await config.read();
    const { fileName, fileHash } = item;

    const importsCollection = mongoConnection.db.collection(importsCollectionName);
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
