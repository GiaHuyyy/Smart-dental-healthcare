const { MongoClient } = require('mongodb');

// Usage: set MONGO_URI env or edit the uri below
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB || 'smart-dental-healthcare';

async function run() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const coll = db.collection('appointments');
    const indexes = await coll.indexes();
    console.log('Existing indexes:');
    indexes.forEach(i => console.log('-', i.name, JSON.stringify(i.key)));

    const target = 'doctorId_1_appointmentDate_1_startTime_1';
    const found = indexes.find(i => i.name === target);
    if (!found) {
      console.log(`Index ${target} not found. Nothing to drop.`);
      return;
    }

    console.log(`Dropping index ${target}...`);
    await coll.dropIndex(target);
    console.log('Dropped. Verify indexes again:');
    const after = await coll.indexes();
    after.forEach(i => console.log('-', i.name, JSON.stringify(i.key)));
  } catch (err) {
    console.error('Failed to drop index:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
