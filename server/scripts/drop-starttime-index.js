/**
 * Script to drop the old unique index and create a new partial index
 * that allows booking cancelled time slots.
 *
 * This script:
 * 1. Drops the old unique index on (doctorId, appointmentDate, startTime)
 * 2. Creates a new partial unique index that excludes cancelled appointments
 *
 * Run: node server/scripts/drop-starttime-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/smart_dental_healthcare';

async function dropAndRecreateIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const appointmentsCollection = db.collection('appointments');

    // Get all existing indexes
    console.log('\n📋 Current indexes:');
    const indexes = await appointmentsCollection.indexes();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Drop the old unique index (without partial filter)
    const oldIndexName = 'doctorId_1_appointmentDate_1_startTime_1';
    try {
      console.log(`\n🗑️  Dropping old index: ${oldIndexName}...`);
      await appointmentsCollection.dropIndex(oldIndexName);
      console.log(`✅ Dropped index: ${oldIndexName}`);
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log(
          `ℹ️  Index ${oldIndexName} does not exist (already dropped or never created)`,
        );
      } else {
        throw error;
      }
    }

    // Create new partial unique index
    console.log('\n🔨 Creating new partial unique index...');
    console.log(
      'ℹ️  This index only applies to: pending, confirmed, completed, in-progress',
    );
    console.log(
      'ℹ️  Cancelled appointments are excluded from the unique constraint',
    );
    await appointmentsCollection.createIndex(
      { doctorId: 1, appointmentDate: 1, startTime: 1 },
      {
        unique: true,
        name: 'doctorId_1_appointmentDate_1_startTime_1',
        partialFilterExpression: {
          status: { $in: ['pending', 'confirmed', 'completed', 'in-progress'] },
        },
      },
    );
    console.log('✅ Created new partial unique index');

    // Verify new indexes
    console.log('\n📋 New indexes:');
    const newIndexes = await appointmentsCollection.indexes();
    newIndexes.forEach((index) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
      if (index.partialFilterExpression) {
        console.log(
          `    Partial filter:`,
          JSON.stringify(index.partialFilterExpression),
        );
      }
    });

    console.log('\n✅ Index migration completed successfully!');
    console.log(
      'ℹ️  You can now book appointments at times that were previously cancelled.',
    );
  } catch (error) {
    console.error('❌ Error during index migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
dropAndRecreateIndex();
