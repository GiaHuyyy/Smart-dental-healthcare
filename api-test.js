import fs from 'fs';
import fetch from 'node-fetch';

// Cấu hình
const BASE_URL = 'http://localhost:8081/api/v1';
const OUTPUT_FILE = 'api-test-results.md';

// Token giả để bỏ qua xác thực
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwicm9sZSI6ImFkbWluIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Danh sách các API cần test
const apiEndpoints = [
 /*  // Auth APIs - Patient
  // Sử dụng email ngẫu nhiên để tránh lỗi email đã tồn tại
  { method: 'POST', url: '/auth/register', body: { fullName: 'Bệnh Nhân Test', email: `patient_test${Date.now()}@example.com`, password: 'Test@123', role: 'patient', phone: '0987654321', dateOfBirth: '1990-01-01', gender: 'male', address: '123 Đường Test' }, description: 'Đăng ký tài khoản bệnh nhân', requiresAuth: false, saveEmail: true, saveAs: 'PATIENT_EMAIL' },
  // Kích hoạt tài khoản bệnh nhân
  { method: 'PATCH', url: '/users/activate-for-test', body: { email: 'PATIENT_EMAIL' }, description: 'Kích hoạt tài khoản bệnh nhân cho test', requiresAuth: false, useSavedEmail: true, savedEmailKey: 'PATIENT_EMAIL' },
  // Đăng nhập với tài khoản bệnh nhân
  { method: 'POST', url: '/auth/login', body: { username: 'PATIENT_EMAIL', password: 'Test@123', role: 'patient' }, description: 'Đăng nhập với tài khoản bệnh nhân', saveToken: true, requiresAuth: false, useSavedEmail: true, savedEmailKey: 'PATIENT_EMAIL' },
  
  // Auth APIs - Doctor
  // Đăng ký tài khoản bác sĩ
  { method: 'POST', url: '/auth/register', body: { fullName: 'Bác Sĩ Test', email: `doctor_test${Date.now()}@example.com`, password: 'Doctor@123', role: 'doctor', phone: '0987654322', dateOfBirth: '1985-01-01', gender: 'female', address: '456 Đường Bác Sĩ', specialty: 'Nha khoa tổng quát', licenseNumber: 'DDS12345' }, description: 'Đăng ký tài khoản bác sĩ', requiresAuth: false, saveEmail: true, saveAs: 'DOCTOR_EMAIL' },
  // Kích hoạt tài khoản bác sĩ
  { method: 'PATCH', url: '/users/activate-for-test', body: { email: 'DOCTOR_EMAIL' }, description: 'Kích hoạt tài khoản bác sĩ cho test', requiresAuth: false, useSavedEmail: true, savedEmailKey: 'DOCTOR_EMAIL' },
  // Đăng nhập với tài khoản bác sĩ
  { method: 'POST', url: '/auth/login', body: { username: 'DOCTOR_EMAIL', password: 'Doctor@123', role: 'doctor' }, description: 'Đăng nhập với tài khoản bác sĩ', saveToken: true, requiresAuth: false, useSavedEmail: true, savedEmailKey: 'DOCTOR_EMAIL' },
  
  // Auth APIs - Admin
  // Đăng ký tài khoản admin mới để đăng nhập với email động
  { method: 'POST', url: '/auth/register', body: { fullName: 'Admin Test', email: `admin_test${Date.now()}@example.com`, password: 'Admin@123', role: 'admin', phone: '0987654323', dateOfBirth: '1990-01-01', gender: 'male', address: '123 Đường Admin' }, description: 'Đăng ký tài khoản admin', requiresAuth: false, saveUserId: true, saveEmail: true },
  // Cập nhật trực tiếp trạng thái kích hoạt tài khoản trong database
  { method: 'PATCH', url: '/users/activate-for-test', body: { email: 'SAVED_EMAIL' }, description: 'Kích hoạt tài khoản admin cho test', requiresAuth: false, useSavedEmail: true },
  // Sử dụng tài khoản vừa đăng ký và kích hoạt để đăng nhập
  { method: 'POST', url: '/auth/login', body: { username: 'SAVED_EMAIL', password: 'Admin@123', role: 'admin' }, description: 'Đăng nhập với tài khoản admin', saveToken: true, requiresAuth: false, useSavedEmail: true },
  { method: 'GET', url: '/auth/profile', description: 'Lấy thông tin profile người dùng', requiresAuth: true },
   */
  
  // Users APIs
  // { method: 'GET', url: '/users', description: 'Lấy danh sách người dùng', requiresAuth: true },
  // { method: 'GET', url: '/users/doctors', description: 'Lấy danh sách bác sĩ', requiresAuth: true },
  // { method: 'GET', url: '/users/patients', description: 'Lấy danh sách bệnh nhân', requiresAuth: true },
  
  // Appointments APIs
  { method: 'GET', url: '/appointments', description: 'Lấy danh sách lịch hẹn', requiresAuth: true },
  { method: 'POST', url: '/appointments', body: { patientId: '68a4294faee99e31432653fd', doctorId: '68a45f205e91c64efc53005b', appointmentDate: '2028-08-15T00:00:00.000Z', startTime: '10:00', endTime: '10:30', appointmentType: 'Khám tổng quát', notes: 'Ghi chú test', duration: 30 }, description: 'Tạo lịch hẹn mới', requiresAuth: true },
  { method: 'GET', url: '/appointments/doctor/68a45f205e91c64efc53005b', description: 'Lấy danh sách lịch hẹn của bác sĩ', requiresAuth: true },
  { method: 'GET', url: '/appointments/patient/68a4294faee99e31432653fd', description: 'Lấy danh sách lịch hẹn của bệnh nhân', requiresAuth: true },
  
  // Medical Records APIs
  // { method: 'GET', url: '/medical-records', description: 'Lấy danh sách hồ sơ bệnh án', requiresAuth: true },
  // { method: 'POST', url: '/medical-records', body: { patientId: '65f2e7d4e52b8b9d1e8b4567', doctorId: '65f2e7d4e52b8b9d1e8b4568', recordDate: '2023-08-15', chiefComplaint: 'Đau răng', diagnosis: 'Viêm nướu', notes: 'Ghi chú test' }, description: 'Tạo hồ sơ bệnh án mới', requiresAuth: true },
  // { method: 'GET', url: '/medical-records/doctor/65f2e7d4e52b8b9d1e8b4568', description: 'Lấy danh sách hồ sơ bệnh án của bác sĩ', requiresAuth: true },
  // { method: 'GET', url: '/medical-records/patient/65f2e7d4e52b8b9d1e8b4567', description: 'Lấy danh sách hồ sơ bệnh án của bệnh nhân', requiresAuth: true },
  
  // Notifications APIs
  // { method: 'GET', url: '/notifications', description: 'Lấy danh sách thông báo', requiresAuth: true },
  // { method: 'POST', url: '/notifications', body: { title: 'Thông báo mới', message: 'Nội dung thông báo test', userId: '65f2e7d4e52b8b9d1e8b4567', isRead: false, type: 'appointment' }, description: 'Tạo thông báo mới', requiresAuth: true },
  // { method: 'GET', url: '/notifications/user/65f2e7d4e52b8b9d1e8b4567', description: 'Lấy danh sách thông báo của người dùng', requiresAuth: true },
  // { method: 'PATCH', url: '/notifications/65f2e7d4e52b8b9d1e8b4569/read', description: 'Đánh dấu thông báo đã đọc', requiresAuth: true },
  // { method: 'PATCH', url: '/notifications/user/65f2e7d4e52b8b9d1e8b4567/read-all', description: 'Đánh dấu tất cả thông báo của người dùng đã đọc', requiresAuth: true },
  
  // Payments APIs
  // { method: 'GET', url: '/payments', description: 'Lấy danh sách thanh toán', requiresAuth: true },
  // { method: 'POST', url: '/payments', body: { patientId: '65f2e7d4e52b8b9d1e8b4567', doctorId: '65f2e7d4e52b8b9d1e8b4568', amount: 500000, status: 'pending', type: 'appointment', paymentMethod: 'cash' }, description: 'Tạo thanh toán mới', requiresAuth: true },
  // { method: 'GET', url: '/payments/patient/65f2e7d4e52b8b9d1e8b4567', description: 'Lấy danh sách thanh toán của bệnh nhân', requiresAuth: true },
  // { method: 'GET', url: '/payments/doctor/65f2e7d4e52b8b9d1e8b4568', description: 'Lấy danh sách thanh toán của bác sĩ', requiresAuth: true },
  // // Sử dụng ID từ kết quả tạo thanh toán mới thay vì ID cố định
  // { method: 'PATCH', url: '/payments/68a403d1a97df7ab4a85eb73', body: { _id: '68a403d1a97df7ab4a85eb73', status: 'completed' }, description: 'Cập nhật trạng thái thanh toán', requiresAuth: true },
  
  // Reviews APIs
  // { method: 'GET', url: '/reviews', description: 'Lấy danh sách đánh giá', requiresAuth: true },
  // { method: 'POST', url: '/reviews', body: { patientId: '65f2e7d4e52b8b9d1e8b4567', doctorId: '65f2e7d4e52b8b9d1e8b4568', rating: 5, comment: 'Bác sĩ rất tận tâm và chuyên nghiệp' }, description: 'Tạo đánh giá mới', requiresAuth: true },
  // { method: 'GET', url: '/reviews/doctor/65f2e7d4e52b8b9d1e8b4568', description: 'Lấy danh sách đánh giá của bác sĩ', requiresAuth: true },
  // { method: 'GET', url: '/reviews/patient/65f2e7d4e52b8b9d1e8b4567', description: 'Lấy danh sách đánh giá của bệnh nhân', requiresAuth: true },
  // { method: 'GET', url: '/reviews/doctor/65f2e7d4e52b8b9d1e8b4568/rating', description: 'Lấy điểm đánh giá trung bình của bác sĩ', requiresAuth: true },
  
  // Reports APIs
  // { method: 'GET', url: '/reports', description: 'Lấy danh sách báo cáo', requiresAuth: true },
  // { method: 'POST', url: '/reports', body: { userId: '65f2e7d4e52b8b9d1e8b4567', title: 'Báo cáo lỗi', content: 'Mô tả chi tiết về lỗi gặp phải' }, description: 'Tạo báo cáo mới', requiresAuth: true },
  // { method: 'GET', url: '/reports/user/65f2e7d4e52b8b9d1e8b4567', description: 'Lấy danh sách báo cáo của người dùng', requiresAuth: true },
  // { method: 'GET', url: '/reports/assignee/65f2e7d4e52b8b9d1e8b4568', description: 'Lấy danh sách báo cáo được giao cho người dùng', requiresAuth: true },
  // Sử dụng ID báo cáo có thực trong hệ thống
  // { method: 'PATCH', url: '/reports/68a4017fa97df7ab4a85ea8f/assign/65f2e7d4e52b8b9d1e8b4568', description: 'Giao báo cáo cho người dùng', requiresAuth: true },
  // { method: 'PATCH', url: '/reports/68a4017fa97df7ab4a85ea8f/resolve', body: { resolution: 'Đã xử lý lỗi thành công' }, description: 'Giải quyết báo cáo', requiresAuth: true },
];

// Biến lưu token từ đăng nhập
let AUTH_TOKEN = MOCK_TOKEN;

// Biến lưu user ID từ đăng ký
let USER_ID = null;

// Biến lưu email đã đăng ký
let SAVED_EMAIL = null;
let PATIENT_EMAIL = null;
let DOCTOR_EMAIL = null;

// Object để lưu trữ các email theo key
const SAVED_EMAILS = {
  PATIENT_EMAIL: '',
  DOCTOR_EMAIL: '',
  SAVED_EMAIL: ''
};

// Hàm gọi API
async function callApi(endpoint) {
  const { method, url, body, description, saveToken, requiresAuth, saveUserId, saveEmail, useSavedEmail } = endpoint;
  const fullUrl = `${BASE_URL}${url}`;
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Thêm token xác thực nếu API yêu cầu hoặc mặc định
    if (requiresAuth || !('requiresAuth' in endpoint)) {
      options.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }
    
    // Thay thế USER_ID trong URL nếu cần
    let processedUrl = fullUrl;
    if (USER_ID && processedUrl.includes('USER_ID')) {
      processedUrl = processedUrl.replace('USER_ID', USER_ID);
    }
    
    // Xử lý body request
    let processedBody = body ? {...body} : null;
    
    // Thay thế email trong body nếu cần
    if (useSavedEmail && processedBody) {
      // Sử dụng savedEmailKey nếu có, nếu không thì dùng SAVED_EMAIL
      const emailKey = endpoint.savedEmailKey || 'SAVED_EMAIL';
      
      // Lấy email từ biến toàn cục hoặc object SAVED_EMAILS
      let emailToUse;
      if (emailKey === 'PATIENT_EMAIL') {
        emailToUse = PATIENT_EMAIL || SAVED_EMAILS.PATIENT_EMAIL;
      } else if (emailKey === 'DOCTOR_EMAIL') {
        emailToUse = DOCTOR_EMAIL || SAVED_EMAILS.DOCTOR_EMAIL;
      } else {
        emailToUse = SAVED_EMAIL || SAVED_EMAILS.SAVED_EMAIL;
      }
      
      if (emailToUse) {
        // Thay thế email hoặc username tùy thuộc vào trường nào tồn tại
        if (processedBody.email) {
          console.log('Thay thế email:', processedBody.email, '->', emailToUse);
          processedBody.email = emailToUse;
        }
        if (processedBody.username) {
          console.log('Thay thế username:', processedBody.username, '->', emailToUse);
          processedBody.username = emailToUse;
        }
      } else {
        console.log(`Cảnh báo: Không tìm thấy email cho key ${emailKey}`);
      }
    }
    
    // Chỉ thêm body vào request nếu không phải là GET hoặc HEAD
    if (processedBody && method !== 'GET' && method !== 'HEAD') {
      options.body = JSON.stringify(processedBody);
    }
    
    const response = await fetch(processedUrl, options);
    const data = await response.json();
    
    // Lưu user ID nếu endpoint yêu cầu
    if (saveUserId && data._id) {
      USER_ID = data._id;
    }
    
    // Lưu email nếu endpoint yêu cầu
    if (saveEmail && response.ok && processedBody && processedBody.email) {
      // Nếu có saveAs, lưu email vào biến tương ứng và object SAVED_EMAILS
      if (endpoint.saveAs) {
        // Lưu vào biến toàn cục tương ứng
        if (endpoint.saveAs === 'PATIENT_EMAIL') {
          PATIENT_EMAIL = processedBody.email;
        } else if (endpoint.saveAs === 'DOCTOR_EMAIL') {
          DOCTOR_EMAIL = processedBody.email;
        } else {
          // Trường hợp khác, gán trực tiếp nếu biến tồn tại
          try {
            eval(`${endpoint.saveAs} = "${processedBody.email}"`);
          } catch (e) {
            console.log(`Không thể gán giá trị cho biến ${endpoint.saveAs}:`, e.message);
          }
        }
        
        // Lưu vào object để dễ truy cập
        SAVED_EMAILS[endpoint.saveAs] = processedBody.email;
        console.log(`Đã lưu email đăng ký vào ${endpoint.saveAs}:`, processedBody.email);
      } else {
        // Mặc định lưu vào SAVED_EMAIL
        SAVED_EMAIL = processedBody.email;
        SAVED_EMAILS.SAVED_EMAIL = processedBody.email;
        console.log('Đã lưu email đăng ký vào SAVED_EMAIL:', SAVED_EMAIL);
      }
    }
    
    // Nếu API đánh dấu saveToken và đăng nhập thành công, lưu token để sử dụng cho các API tiếp theo
    if (saveToken && response.ok) {
      if (data.access_token) {
        AUTH_TOKEN = data.access_token;
      } else if (data.data && data.data.access_token) {
        AUTH_TOKEN = data.data.access_token;
      }
      console.log('Đã lưu token đăng nhập:', AUTH_TOKEN);
    }
    
    return {
      endpoint,
      status: response.status,
      success: response.ok,
      data,
    };
  } catch (error) {
    return {
      endpoint,
      status: 'Error',
      success: false,
      error: error.message,
    };
  }
}

// Hàm tạo báo cáo Markdown
function generateMarkdownReport(results) {
  let markdown = '# Kết quả kiểm thử API\n\n';
  markdown += 'Thời gian kiểm thử: ' + new Date().toLocaleString() + '\n\n';
  
  markdown += '## Tổng quan\n\n';
  const totalApis = results.length;
  const successApis = results.filter(r => r.success).length;
  const failedApis = totalApis - successApis;
  
  markdown += `- Tổng số API: ${totalApis}\n`;
  markdown += `- Thành công: ${successApis}\n`;
  markdown += `- Thất bại: ${failedApis}\n\n`;
  
  markdown += '## Chi tiết kết quả\n\n';
  
  // Nhóm kết quả theo loại API
  const groupedResults = {};
  
  results.forEach(result => {
    const url = result.endpoint.url;
    const category = url.split('/')[1]; // Lấy phần đầu tiên của URL (auth, users, appointments, medical-records)
    
    if (!groupedResults[category]) {
      groupedResults[category] = [];
    }
    
    groupedResults[category].push(result);
  });
  
  // Tạo bảng cho từng nhóm
  Object.keys(groupedResults).forEach(category => {
    markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    markdown += '| API | Phương thức | Mô tả | Trạng thái | Kết quả |\n';
    markdown += '|-----|------------|------|-----------|---------|\n';
    
    groupedResults[category].forEach(result => {
      const { endpoint, status, success } = result;
      const statusEmoji = success ? '✅' : '❌';
      const statusText = success ? 'Thành công' : 'Thất bại';
      
      markdown += `| ${endpoint.url} | ${endpoint.method} | ${endpoint.description} | ${status} | ${statusEmoji} ${statusText} |\n`;
    });
    
    markdown += '\n';
  });
  
  // Chi tiết response
  markdown += '## Chi tiết Response\n\n';
  
  results.forEach(result => {
    const { endpoint, status, success, data, error } = result;
    
    markdown += `### ${endpoint.method} ${endpoint.url}\n\n`;
    markdown += `- Mô tả: ${endpoint.description}\n`;
    markdown += `- Trạng thái: ${status}\n`;
    markdown += `- Kết quả: ${success ? 'Thành công ✅' : 'Thất bại ❌'}\n\n`;
    
    if (endpoint.body) {
      markdown += '**Request Body:**\n\n```json\n';
      markdown += JSON.stringify(endpoint.body, null, 2);
      markdown += '\n```\n\n';
    }
    
    markdown += '**Response:**\n\n```json\n';
    if (error) {
      markdown += JSON.stringify({ error }, null, 2);
    } else {
      markdown += JSON.stringify(data, null, 2);
    }
    markdown += '\n```\n\n';
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

// Hàm chính để chạy test
async function runTests() {
  console.log('Bắt đầu kiểm thử API...');
  
  const results = [];
  
  for (const endpoint of apiEndpoints) {
    console.log(`Đang kiểm thử: ${endpoint.method} ${endpoint.url}`);
    const result = await callApi(endpoint);
    results.push(result);
  }
  
  console.log('Hoàn thành kiểm thử API!');
  
  // Tạo báo cáo
  const report = generateMarkdownReport(results);
  
  // Ghi báo cáo ra file
  fs.writeFileSync(OUTPUT_FILE, report);
  
  console.log(`Đã lưu kết quả vào file ${OUTPUT_FILE}`);
}

// Chạy test
runTests();