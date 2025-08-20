import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

async function dropIndex() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_dental_healthcare';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Kết nối MongoDB thành công');

    const db = client.db();
    const appointmentsCollection = db.collection('appointments');

    // Lấy danh sách các index hiện tại
    const indexes = await appointmentsCollection.indexes();
    console.log('Danh sách các index hiện tại:', indexes);

    // Tìm và xóa index doctorId_1_appointmentDate_1_appointmentTime_1
    for (const index of indexes) {
      if (index.name === 'doctorId_1_appointmentDate_1_appointmentTime_1') {
        await appointmentsCollection.dropIndex(index.name);
        console.log(`Đã xóa index ${index.name}`);
      }
    }

    console.log('Hoàn thành');
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await client.close();
  }
}

dropIndex();