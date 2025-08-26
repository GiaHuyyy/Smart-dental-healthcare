const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

console.log('🧪 Test Cloudinary với các cloud name khác nhau...\n');

const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Danh sách các cloud name có thể thử
const possibleCloudNames = [
  'smart-dental-healthcare',  // Cloud name hiện tại
  'smartdental',              // Rút gọn
  'dentalhealth',             // Rút gọn khác
  'smartdentalhealth',        // Không có dấu gạch
  'dental',                   // Ngắn gọn
  'smart',                    // Rất ngắn
  'healthcare',               // Từ khóa
  'dentalcare',               // Kết hợp
];

console.log('🔍 Thử các cloud name có thể:');
possibleCloudNames.forEach((cloudName, index) => {
  console.log(`   ${index + 1}. ${cloudName}`);
});

console.log('\n🔗 Bắt đầu test...\n');

async function testCloudName(cloudName) {
  return new Promise((resolve) => {
    console.log(`🧪 Testing: "${cloudName}"`);
    
    // Cấu hình tạm thời
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // Test ping
    cloudinary.api.ping()
      .then(result => {
        console.log(`   ✅ SUCCESS: "${cloudName}" - ${result.status}`);
        resolve({ success: true, cloudName, result });
      })
      .catch(error => {
        console.log(`   ❌ FAILED: "${cloudName}" - ${error.message || 'Unknown error'}`);
        resolve({ success: false, cloudName, error: error.message });
      });
  });
}

async function runTests() {
  const results = [];
  
  for (const cloudName of possibleCloudNames) {
    const result = await testCloudName(cloudName);
    results.push(result);
    
    // Dừng 1 giây giữa các test
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Kết quả test:');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('\n✅ Cloud names hoạt động:');
    successful.forEach(result => {
      console.log(`   - "${result.cloudName}"`);
    });
    
    console.log('\n💡 Sử dụng cloud name đầu tiên thành công:');
    console.log(`   CLOUDINARY_CLOUD_NAME=${successful[0].cloudName}`);
  } else {
    console.log('\n❌ Không có cloud name nào hoạt động!');
    console.log('💡 Có thể do:');
    console.log('   - API Key hoặc API Secret không đúng');
    console.log('   - Tài khoản Cloudinary chưa được kích hoạt');
    console.log('   - Cần tạo tài khoản Cloudinary mới');
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Cloud names không hoạt động:');
    failed.forEach(result => {
      console.log(`   - "${result.cloudName}": ${result.error}`);
    });
  }
}

runTests().catch(console.error);
