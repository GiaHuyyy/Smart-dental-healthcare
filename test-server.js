// Test server connection
const testServer = async () => {
  try {
    console.log('🔍 Testing server connection...');
    
    // Test basic connection
    const response = await fetch('http://localhost:8081/api/v1/medical-records');
    console.log('✅ Server is running!');
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Data received:', data.length, 'records');
    }
    
  } catch (error) {
    console.error('❌ Server connection failed:', error.message);
    console.log('💡 Make sure server is running on port 8081');
    console.log('💡 Run: cd server && npm run start:dev');
  }
};

// Test users endpoints
const testUsers = async () => {
  try {
    console.log('\n🔍 Testing users endpoints...');
    
    // Test patients
    const patientsResponse = await fetch('http://localhost:8081/api/v1/users/patients');
    console.log('Patients endpoint:', patientsResponse.status);
    
    // Test doctors
    const doctorsResponse = await fetch('http://localhost:8081/api/v1/users/doctors');
    console.log('Doctors endpoint:', doctorsResponse.status);
    
  } catch (error) {
    console.error('❌ Users test failed:', error.message);
  }
};

// Run tests
const runTests = async () => {
  console.log('🚀 Starting server tests...\n');
  
  await testServer();
  await testUsers();
  
  console.log('\n✨ Tests completed!');
};

runTests();

