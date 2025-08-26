const fs = require('fs');
const path = require('path');

// Test script để kiểm tra tích hợp Gemini AI
console.log('🧪 Testing Gemini AI Integration...');

// Kiểm tra xem có file ảnh nào trong uploads không
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|gif)$/i.test(file)
  );
  
  if (imageFiles.length > 0) {
    console.log(`📁 Found ${imageFiles.length} image files in uploads directory:`);
    imageFiles.forEach(file => console.log(`  - ${file}`));
    
    // Test với file đầu tiên
    const testFile = imageFiles[0];
    console.log(`\n🚀 Testing with file: ${testFile}`);
    
    // Tạo form data để test
    const FormData = require('form-data');
    const form = new FormData();
    form.append('xray', fs.createReadStream(path.join(uploadsDir, testFile)));
    
    // Test API endpoint
    const axios = require('axios');
    axios.post('http://localhost:3010/analyze', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 120000 // 2 minutes timeout for Gemini AI
    })
    .then(response => {
      console.log('✅ Analysis completed successfully!');
      console.log('📊 Analysis Source:', response.data.metadata?.analysisSource);
      console.log('🔍 Diagnosis:', response.data.diagnosis);
      console.log('📈 Confidence:', response.data.confidence);
      console.log('⚠️ Severity:', response.data.severity);
      console.log('💰 Estimated Cost:', response.data.estimatedCost);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    });
  } else {
    console.log('📁 No image files found in uploads directory');
    console.log('💡 Please upload an X-ray image first to test Gemini AI integration');
  }
} else {
  console.log('📁 Uploads directory not found');
}

console.log('\n🌐 You can also test via web interface: http://localhost:3010');
console.log('🔧 API Endpoint: POST http://localhost:3010/analyze');
console.log('❤️ Health Check: GET http://localhost:3010/analyze/health');
