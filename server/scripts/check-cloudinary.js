const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

console.log('🔍 Kiểm tra cấu hình Cloudinary...\n');

// Kiểm tra các biến môi trường
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('📋 Thông tin cấu hình:');
console.log(`   Cloud Name: ${cloudName ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
console.log(`   API Key: ${apiKey ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
console.log(`   API Secret: ${apiSecret ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);

if (!cloudName || !apiKey || !apiSecret) {
  console.log('\n❌ Thiếu thông tin cấu hình Cloudinary!');
  console.log('💡 Vui lòng:');
  console.log('   1. Tạo tài khoản tại https://cloudinary.com');
  console.log('   2. Lấy thông tin từ Dashboard');
  console.log('   3. Cập nhật file .env');
  console.log('   4. Chạy lại script này');
  process.exit(1);
}

// Hiển thị giá trị thực tế (che giấu một phần)
console.log('\n🔍 Giá trị cấu hình:');
console.log(`   Cloud Name: "${cloudName}"`);
console.log(`   API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`   API Secret: ${apiSecret.substring(0, 8)}...${apiSecret.substring(apiSecret.length - 4)}`);

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// Kiểm tra kết nối
console.log('\n🔗 Đang kiểm tra kết nối...');

// Thử ping trước
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Ping thành công!');
    console.log(`   Status: ${result.status}`);
    
    // Thử lấy thông tin tài khoản
    return cloudinary.api.account();
  })
  .then(account => {
    console.log('\n📊 Thông tin tài khoản:');
    console.log(`   Cloud Name: ${account.cloud_name}`);
    console.log(`   Plan: ${account.plan}`);
    console.log(`   Credits: ${account.credits?.used || 0}/${account.credits?.limit || 'unlimited'}`);
    console.log(`   Media Library: ${account.media_library?.limit || 'unlimited'} items`);
    
    console.log('\n🎉 Cấu hình Cloudinary hoàn tất!');
    console.log('💡 Bạn có thể sử dụng tính năng upload ảnh.');
  })
  .catch(error => {
    console.log('\n❌ Lỗi kết nối Cloudinary:');
    
    // Hiển thị lỗi chi tiết
    if (error && typeof error === 'object') {
      console.log(`   Error Message: ${error.message || 'No message'}`);
      console.log(`   Error Name: ${error.name || 'No name'}`);
      console.log(`   Error Code: ${error.http_code || 'No code'}`);
      console.log(`   Error Type: ${error.constructor.name}`);
      
      // Hiển thị toàn bộ object nếu có
      if (Object.keys(error).length > 0) {
        console.log('   Full Error Object:');
        Object.keys(error).forEach(key => {
          console.log(`     ${key}: ${error[key]}`);
        });
      }
    } else {
      console.log(`   Error: ${error}`);
    }
    
    // Phân tích lỗi cụ thể
    if (error && error.message) {
      if (error.message.includes('Invalid cloud_name')) {
        console.log('\n💡 Lỗi Cloud Name:');
        console.log('   - Cloud name không đúng hoặc không tồn tại');
        console.log('   - Vui lòng kiểm tra lại trong Cloudinary Dashboard');
        console.log(`   - Cloud name hiện tại: "${cloudName}"`);
        console.log('   - Cloud name thường ngắn gọn, ví dụ: "mycloud", "demo123"');
      } else if (error.message.includes('Invalid API key')) {
        console.log('\n💡 Lỗi API Key:');
        console.log('   - API key không đúng');
        console.log('   - API key có thể đã bị vô hiệu hóa');
        console.log('   - Vui lòng tạo API key mới trong Dashboard');
      } else if (error.message.includes('Invalid API secret')) {
        console.log('\n💡 Lỗi API Secret:');
        console.log('   - API secret không đúng');
        console.log('   - API secret có thể đã bị thay đổi');
        console.log('   - Vui lòng reset API secret trong Dashboard');
      } else if (error.http_code === 401) {
        console.log('\n💡 Lỗi xác thực (401):');
        console.log('   - Thông tin đăng nhập không chính xác');
        console.log('   - Tài khoản có thể bị khóa');
        console.log('   - Vui lòng kiểm tra lại tất cả thông tin');
      }
    }
    
    // Thông tin debug
    console.log('\n🔍 Thông tin debug:');
    console.log(`   Cloud Name length: ${cloudName.length}`);
    console.log(`   API Key length: ${apiKey.length}`);
    console.log(`   API Secret length: ${apiSecret.length}`);
    console.log(`   Cloud Name contains dash: ${cloudName.includes('-')}`);
    console.log(`   Cloud Name contains underscore: ${cloudName.includes('_')}`);
    
    // Gợi ý sửa lỗi
    console.log('\n💡 Gợi ý sửa lỗi:');
    console.log('   1. Đăng nhập vào https://cloudinary.com/console');
    console.log('   2. Kiểm tra Cloud Name trong Dashboard');
    console.log('   3. Tạo API Key mới nếu cần');
    console.log('   4. Cập nhật file .env với thông tin chính xác');
    console.log('   5. Restart server sau khi cập nhật');
    
    process.exit(1);
  });
