// Test Revenue Creation từ Payment
// Chạy file này trong terminal: node test-revenue-creation.js

const axios = require('axios');

const API_URL = 'http://localhost:8081/api/v1';

// Thay đổi những giá trị này
const TEST_PAYMENT_ID = 'YOUR_PAYMENT_ID_HERE'; // Lấy từ database
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Lấy từ browser dev tools

async function testRevenueCreation() {
  console.log('🧪 ========== TESTING REVENUE CREATION ==========\n');

  try {
    // 1. Test create revenue từ payment
    console.log('1️⃣ Testing createRevenueFromPayment...');
    const response = await axios.post(
      `${API_URL}/payments/${TEST_PAYMENT_ID}/test-revenue`,
      {},
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      const revenue = response.data.data;
      console.log('\n💰 Revenue Created:');
      console.log('  - Revenue ID:', revenue._id);
      console.log('  - Doctor ID:', revenue.doctorId);
      console.log('  - Amount:', revenue.amount);
      console.log('  - Platform Fee:', revenue.platformFee);
      console.log('  - Net Amount:', revenue.netAmount);
      console.log('  - Status:', revenue.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n========================================\n');
}

// Chạy test
testRevenueCreation();
