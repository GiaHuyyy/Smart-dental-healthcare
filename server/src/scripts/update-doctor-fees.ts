import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { User } from '../modules/users/schemas/user.schemas';

async function updateDoctorFees() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Get User model directly
  const userModel = app.get<Model<User>>('UserModel');
  
  try {
    console.log('🔧 Starting to update doctor consultation fees...');
    
    // Define consultation fees by specialty (in VND)
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
    
    // Update all doctors
    const doctors = await userModel.find({ role: 'doctor' });
    
    console.log(`📋 Found ${doctors.length} doctors to update`);
    
    for (const doctor of doctors) {
      const specialty = doctor.specialty || 'Nha khoa';
      const consultationFee = feesBySpecialty[specialty] || 200000;
      
      // Random rating between 4.0 and 5.0
      const rating = parseFloat((4.0 + Math.random()).toFixed(1));
      
      // Random experience between 3 and 20 years
      const experienceYears = Math.floor(Math.random() * 18) + 3;
      
      await userModel.updateOne(
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
      
      console.log(`✅ Updated ${doctor.fullName}: ${consultationFee.toLocaleString('vi-VN')}₫, Rating: ${rating}, Experience: ${experienceYears} years`);
    }
    
    console.log('\n✨ All doctors updated successfully!');
  } catch (error) {
    console.error('❌ Error updating doctors:', error);
  } finally {
    await app.close();
  }
}

updateDoctorFees();

