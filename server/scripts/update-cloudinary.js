const fs = require('fs');
const path = require('path');

console.log('🔧 Cập nhật thông tin Cloudinary...\n');

// Thông tin Cloudinary mới
const newCloudName = 'dipsm3wow';
const newApiKey = process.argv[2];
const newApiSecret = process.argv[3];

if (!newApiKey || !newApiSecret) {
  console.log('❌ Vui lòng cung cấp API Key và API Secret:');
  console.log('   node scripts/update-cloudinary.js <api_key> <api_secret>');
  console.log('');
  console.log('💡 Ví dụ:');
  console.log('   node scripts/update-cloudinary.js 123456789012345 abcdefghijklmnopqrstuvwxyz123');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env');

try {
  // Đọc file .env hiện tại
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('📋 Thông tin cũ:');
  const oldCloudNameMatch = envContent.match(/CLOUDINARY_CLOUD_NAME=(.+)/);
  const oldApiKeyMatch = envContent.match(/CLOUDINARY_API_KEY=(.+)/);
  const oldApiSecretMatch = envContent.match(/CLOUDINARY_API_SECRET=(.+)/);
  
  if (oldCloudNameMatch) console.log(`   Cloud Name: ${oldCloudNameMatch[1]}`);
  if (oldApiKeyMatch) console.log(`   API Key: ${oldApiKeyMatch[1].substring(0, 8)}...${oldApiKeyMatch[1].substring(oldApiKeyMatch[1].length - 4)}`);
  if (oldApiSecretMatch) console.log(`   API Secret: ${oldApiSecretMatch[1].substring(0, 8)}...${oldApiSecretMatch[1].substring(oldApiSecretMatch[1].length - 4)}`);
  
  // Cập nhật thông tin Cloudinary
  envContent = envContent.replace(/CLOUDINARY_CLOUD_NAME=.+/g, `CLOUDINARY_CLOUD_NAME=${newCloudName}`);
  envContent = envContent.replace(/CLOUDINARY_API_KEY=.+/g, `CLOUDINARY_API_KEY=${newApiKey}`);
  envContent = envContent.replace(/CLOUDINARY_API_SECRET=.+/g, `CLOUDINARY_API_SECRET=${newApiSecret}`);
  
  // Ghi file .env mới
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Cập nhật thành công!');
  console.log('📋 Thông tin mới:');
  console.log(`   Cloud Name: ${newCloudName}`);
  console.log(`   API Key: ${newApiKey.substring(0, 8)}...${newApiKey.substring(newApiKey.length - 4)}`);
  console.log(`   API Secret: ${newApiSecret.substring(0, 8)}...${newApiSecret.substring(newApiSecret.length - 4)}`);
  
  console.log('\n🧪 Kiểm tra cấu hình:');
  console.log('   npm run check:cloudinary');
  
} catch (error) {
  console.error('❌ Lỗi khi cập nhật file .env:', error.message);
  process.exit(1);
}
