const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

console.log('🧪 Test Cloudinary với cloud name mới: dipsm3wow\n');

// Thông tin cấu hình hiện tại
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('📋 Thông tin cấu hình hiện tại:');
console.log(`   Cloud Name: "${cloudName}"`);
console.log(`   API Key: ${apiKey ? apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4) : 'Chưa cấu hình'}`);
console.log(`   API Secret: ${apiSecret ? apiSecret.substring(0, 8) + '...' + apiSecret.substring(apiSecret.length - 4) : 'Chưa cấu hình'}`);

if (!cloudName || !apiKey || !apiSecret) {
  console.log('\n❌ Thiếu thông tin cấu hình!');
  console.log('💡 Vui lòng cập nhật thông tin Cloudinary trước.');
  process.exit(1);
}

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

console.log('\n🔗 Đang kiểm tra kết nối...');

// Test ping
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Ping thành công!');
    console.log(`   Status: ${result.status}`);
    
    // Test lấy thông tin tài khoản
    return cloudinary.api.account();
  })
  .then(account => {
    console.log('\n📊 Thông tin tài khoản:');
    console.log(`   Cloud Name: ${account.cloud_name}`);
    console.log(`   Plan: ${account.plan}`);
    console.log(`   Credits: ${account.credits?.used || 0}/${account.credits?.limit || 'unlimited'}`);
    
    console.log('\n🎉 Cấu hình Cloudinary hoạt động!');
    console.log('💡 Bạn có thể sử dụng tính năng upload ảnh.');
    
    // Test upload đơn giản
    console.log('\n🧪 Test upload ảnh...');
    return cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', {
      public_id: 'test_image_' + Date.now(),
      folder: 'smart-dental-healthcare'
    });
  })
  .then(uploadResult => {
    console.log('✅ Upload test thành công!');
    console.log(`   Public ID: ${uploadResult.public_id}`);
    console.log(`   URL: ${uploadResult.secure_url}`);
    
    // Xóa ảnh test
    return cloudinary.uploader.destroy(uploadResult.public_id);
  })
  .then(() => {
    console.log('✅ Xóa ảnh test thành công!');
    console.log('\n🎉 Tất cả test đều thành công!');
    console.log('💡 Cloudinary đã sẵn sàng sử dụng.');
  })
  .catch(error => {
    console.log('\n❌ Lỗi test Cloudinary:');
    console.log(`   Error: ${error.message || error}`);
    
    if (error.message && error.message.includes('Invalid cloud_name')) {
      console.log('\n💡 Lỗi Cloud Name:');
      console.log('   - Cloud name không đúng hoặc không tồn tại');
      console.log('   - Vui lòng kiểm tra lại thông tin cấu hình');
    } else if (error.message && error.message.includes('Invalid API key')) {
      console.log('\n💡 Lỗi API Key:');
      console.log('   - API key không đúng');
      console.log('   - Vui lòng kiểm tra lại thông tin cấu hình');
    } else if (error.message && error.message.includes('Invalid API secret')) {
      console.log('\n💡 Lỗi API Secret:');
      console.log('   - API secret không đúng');
      console.log('   - Vui lòng kiểm tra lại thông tin cấu hình');
    }
    
    process.exit(1);
  });
