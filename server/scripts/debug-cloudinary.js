const axios = require('axios');
require('dotenv').config();

console.log('🔍 Debug Cloudinary API...\n');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('📋 Thông tin cấu hình:');
console.log(`   Cloud Name: "${cloudName}"`);
console.log(`   API Key: ${apiKey}`);
console.log(`   API Secret: ${apiSecret}`);

if (!cloudName || !apiKey || !apiSecret) {
  console.log('\n❌ Thiếu thông tin cấu hình!');
  process.exit(1);
}

// Test 1: Ping API
async function testPing() {
  console.log('\n🧪 Test 1: Ping API');
  try {
    const response = await axios.get(`https://res.cloudinary.com/${cloudName}/image/list`, {
      params: {
        max_results: 1,
        api_key: apiKey,
        timestamp: Math.floor(Date.now() / 1000),
        signature: 'test' // Sẽ thất bại nhưng cho biết cloud name có tồn tại không
      }
    });
    console.log('   ✅ Response:', response.status);
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.statusText);
    console.log('   📝 Message:', error.response?.data?.error?.message || error.message);
  }
}

// Test 2: Account API
async function testAccount() {
  console.log('\n🧪 Test 2: Account API');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await axios.get(`https://api.cloudinary.com/v1_1/${cloudName}/account`, {
      params: {
        api_key: apiKey,
        timestamp: timestamp
      },
      auth: {
        username: apiKey,
        password: apiSecret
      }
    });
    console.log('   ✅ Account info:', response.data.cloud_name);
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.statusText);
    console.log('   📝 Message:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('   💡 Lỗi 401: Thông tin đăng nhập không chính xác');
    } else if (error.response?.status === 404) {
      console.log('   💡 Lỗi 404: Cloud name không tồn tại');
    }
  }
}

// Test 3: Upload API
async function testUpload() {
  console.log('\n🧪 Test 3: Upload API');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      file: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      public_id: 'test_image',
      timestamp: timestamp
    }, {
      params: {
        api_key: apiKey,
        timestamp: timestamp
      },
      auth: {
        username: apiKey,
        password: apiSecret
      }
    });
    console.log('   ✅ Upload successful:', response.data.public_id);
  } catch (error) {
    console.log('   ❌ Error:', error.response?.status, error.response?.statusText);
    console.log('   📝 Message:', error.response?.data?.error?.message || error.message);
  }
}

// Test 4: Check if cloud name exists
async function testCloudNameExists() {
  console.log('\n🧪 Test 4: Check Cloud Name');
  try {
    const response = await axios.get(`https://res.cloudinary.com/${cloudName}/image/upload/v1/sample.jpg`);
    console.log('   ✅ Cloud name exists, response:', response.status);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ❌ Cloud name does not exist (404)');
    } else {
      console.log('   ❌ Error:', error.response?.status, error.response?.statusText);
    }
  }
}

async function runAllTests() {
  await testCloudNameExists();
  await testPing();
  await testAccount();
  await testUpload();
  
  console.log('\n📊 Tóm tắt:');
  console.log('💡 Nếu tất cả test đều thất bại, có thể:');
  console.log('   1. API Key hoặc API Secret không đúng');
  console.log('   2. Tài khoản Cloudinary chưa được kích hoạt');
  console.log('   3. Cần tạo tài khoản Cloudinary mới');
  console.log('   4. Cloud name không tồn tại');
  
  console.log('\n🔗 Để tạo tài khoản mới:');
  console.log('   1. Truy cập https://cloudinary.com');
  console.log('   2. Đăng ký tài khoản miễn phí');
  console.log('   3. Lấy thông tin từ Dashboard');
  console.log('   4. Cập nhật file .env');
}

runAllTests().catch(console.error);
