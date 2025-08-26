const { MongoClient } = require('mongodb');

// Usage: set MONGO_URI and MONGO_DB env vars if needed.
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB || 'smart-dental-healthcare';

async function run() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const coll = db.collection('appointments');

    console.log('Counting docs with missing appointmentTime...');
    const query = { $or: [ { appointmentTime: null }, { appointmentTime: '' }, { appointmentTime: { $exists: false } } ] };
    const total = await coll.countDocuments(query);
    console.log('Found', total, 'documents with missing appointmentTime');
    if (!total) {
      console.log('Nothing to do.');
      return;
    }

    // Only set appointmentTime when startTime exists and is non-empty
    const updateResult = await coll.updateMany(
      { $and: [ query, { startTime: { $exists: true, $ne: null, $ne: '' } } ] },
      [ { $set: { appointmentTime: '$startTime' } } ]
    );

    console.log('Matched:', updateResult.matchedCount, 'Modified:', updateResult.modifiedCount);

    // Show a few sample documents after update
    const sample = await coll.find({ appointmentTime: { $ne: null } }).sort({ _id: -1 }).limit(5).toArray();
    console.log('Sample updated docs (last 5):');
    sample.forEach(d => console.log('-', d._id.toString(), d.doctorId?.toString?.(), d.appointmentDate?.toISOString?.(), d.appointmentTime));

    console.log('Backfill completed. Consider dropping legacy index using server/scripts/drop-starttime-index.js if appropriate.');
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
