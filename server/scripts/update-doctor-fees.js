const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_dental_healthcare';

// Define fees by specialty (in VND)
const feesBySpecialty = {
  'Nha khoa': 200000,
  'Nha khoa tổng quát': 200000,
  'Nha khoa thẩm mỹ': 300000,
  'Chỉnh nha': 350000,
  'Implant': 500000,
  'Nha chu': 250000,
  'Nội nha': 280000,
  'Răng sứ': 400000,
  'Răng trẻ em': 180000,
};

async function updateDoctorFees() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const UserModel = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const doctors = await UserModel.find({ role: 'doctor' });
    console.log(`📋 Found ${doctors.length} doctors to update\n`);
    
    for (const doctor of doctors) {
      const specialty = doctor.specialty || 'Nha khoa';
      const consultationFee = feesBySpecialty[specialty] || 200000;
      
      // Random rating between 4.0 and 5.0
      const rating = parseFloat((4.0 + Math.random()).toFixed(1));
      
      // Random experience between 3 and 20 years
      const experienceYears = Math.floor(Math.random() * 18) + 3;
      
      await UserModel.updateOne(
        { _id: doctor._id },
        {
          $set: {
            consultationFee,
            rating,
            experienceYears,
            specialization: specialty,
          },
        }
      );
      
      console.log(`✅ Updated ${doctor.fullName}:`);
      console.log(`   💰 Fee: ${consultationFee.toLocaleString('vi-VN')}₫`);
      console.log(`   ⭐ Rating: ${rating}`);
      console.log(`   📅 Experience: ${experienceYears} years`);
      console.log(`   🏥 Specialty: ${specialty}\n`);
    }
    
    console.log('✨ All doctors updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

updateDoctorFees();





