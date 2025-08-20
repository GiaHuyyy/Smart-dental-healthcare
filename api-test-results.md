# Kết quả kiểm thử API

Thời gian kiểm thử: 8/20/2025, 2:52:48 PM

## Tổng quan

- Tổng số API: 32
- Thành công: 31
- Thất bại: 1

## Chi tiết kết quả

### Users

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /users | GET | Lấy danh sách người dùng | 200 | ✅ Thành công |
| /users/doctors | GET | Lấy danh sách bác sĩ | 200 | ✅ Thành công |
| /users/patients | GET | Lấy danh sách bệnh nhân | 200 | ✅ Thành công |

### Appointments

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /appointments | GET | Lấy danh sách lịch hẹn | 200 | ✅ Thành công |
| /appointments | POST | Tạo lịch hẹn mới | 400 | ❌ Thất bại |
| /appointments/doctor/68a45f205e91c64efc53005b | GET | Lấy danh sách lịch hẹn của bác sĩ | 200 | ✅ Thành công |
| /appointments/patient/68a4294faee99e31432653fd | GET | Lấy danh sách lịch hẹn của bệnh nhân | 200 | ✅ Thành công |

### Medical-records

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /medical-records | GET | Lấy danh sách hồ sơ bệnh án | 200 | ✅ Thành công |
| /medical-records | POST | Tạo hồ sơ bệnh án mới | 201 | ✅ Thành công |
| /medical-records/doctor/65f2e7d4e52b8b9d1e8b4568 | GET | Lấy danh sách hồ sơ bệnh án của bác sĩ | 200 | ✅ Thành công |
| /medical-records/patient/65f2e7d4e52b8b9d1e8b4567 | GET | Lấy danh sách hồ sơ bệnh án của bệnh nhân | 200 | ✅ Thành công |

### Notifications

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /notifications | GET | Lấy danh sách thông báo | 200 | ✅ Thành công |
| /notifications | POST | Tạo thông báo mới | 201 | ✅ Thành công |
| /notifications/user/65f2e7d4e52b8b9d1e8b4567 | GET | Lấy danh sách thông báo của người dùng | 200 | ✅ Thành công |
| /notifications/65f2e7d4e52b8b9d1e8b4569/read | PATCH | Đánh dấu thông báo đã đọc | 200 | ✅ Thành công |
| /notifications/user/65f2e7d4e52b8b9d1e8b4567/read-all | PATCH | Đánh dấu tất cả thông báo của người dùng đã đọc | 200 | ✅ Thành công |

### Payments

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /payments | GET | Lấy danh sách thanh toán | 200 | ✅ Thành công |
| /payments | POST | Tạo thanh toán mới | 201 | ✅ Thành công |
| /payments/patient/65f2e7d4e52b8b9d1e8b4567 | GET | Lấy danh sách thanh toán của bệnh nhân | 200 | ✅ Thành công |
| /payments/doctor/65f2e7d4e52b8b9d1e8b4568 | GET | Lấy danh sách thanh toán của bác sĩ | 200 | ✅ Thành công |
| /payments/68a403d1a97df7ab4a85eb73 | PATCH | Cập nhật trạng thái thanh toán | 200 | ✅ Thành công |

### Reviews

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /reviews | GET | Lấy danh sách đánh giá | 200 | ✅ Thành công |
| /reviews | POST | Tạo đánh giá mới | 201 | ✅ Thành công |
| /reviews/doctor/65f2e7d4e52b8b9d1e8b4568 | GET | Lấy danh sách đánh giá của bác sĩ | 200 | ✅ Thành công |
| /reviews/patient/65f2e7d4e52b8b9d1e8b4567 | GET | Lấy danh sách đánh giá của bệnh nhân | 200 | ✅ Thành công |
| /reviews/doctor/65f2e7d4e52b8b9d1e8b4568/rating | GET | Lấy điểm đánh giá trung bình của bác sĩ | 200 | ✅ Thành công |

### Reports

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /reports | GET | Lấy danh sách báo cáo | 200 | ✅ Thành công |
| /reports | POST | Tạo báo cáo mới | 201 | ✅ Thành công |
| /reports/user/65f2e7d4e52b8b9d1e8b4567 | GET | Lấy danh sách báo cáo của người dùng | 200 | ✅ Thành công |
| /reports/assignee/65f2e7d4e52b8b9d1e8b4568 | GET | Lấy danh sách báo cáo được giao cho người dùng | 200 | ✅ Thành công |
| /reports/68a4017fa97df7ab4a85ea8f/assign/65f2e7d4e52b8b9d1e8b4568 | PATCH | Giao báo cáo cho người dùng | 200 | ✅ Thành công |
| /reports/68a4017fa97df7ab4a85ea8f/resolve | PATCH | Giải quyết báo cáo | 200 | ✅ Thành công |

## Chi tiết Response

### GET /users

- Mô tả: Lấy danh sách người dùng
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "results": [
    {
      "_id": "68a4294faee99e31432653fd",
      "fullName": "aa",
      "email": "tovugiahuy1@gmail.com",
      "phone": "11",
      "dateOfBirth": "2025-08-06T00:00:00.000Z",
      "gender": "male",
      "address": "aq",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "cd9f6a70-aa18-4d71-b1e0-b8e9fd031077",
      "codeExpired": "2025-08-19T08:35:43.209Z",
      "specialty": "",
      "licenseNumber": "",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:35:43.211Z",
      "updatedAt": "2025-08-19T07:35:43.211Z",
      "__v": 0
    },
    {
      "_id": "68a42974aee99e3143265400",
      "fullName": "bb",
      "email": "tovugiahuy2@gmail.com",
      "phone": "fff",
      "dateOfBirth": "2025-08-12T00:00:00.000Z",
      "gender": "female",
      "address": "gg",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "e9e90069-b94b-4cdd-a137-f8b6612be5e2",
      "codeExpired": "2025-08-19T08:36:20.117Z",
      "specialty": "general",
      "licenseNumber": "v01",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:36:20.119Z",
      "updatedAt": "2025-08-19T07:36:20.119Z",
      "__v": 0
    },
    {
      "_id": "68a42d27530028d58c3a2109",
      "fullName": "Người Dùng Test",
      "email": "test1755589927494@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "961f0862-5136-4256-8652-6d6243108264",
      "codeExpired": "2025-08-19T08:52:07.779Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:52:07.794Z",
      "updatedAt": "2025-08-19T07:52:07.794Z",
      "__v": 0
    },
    {
      "_id": "68a42dd1530028d58c3a2151",
      "fullName": "Người Dùng Test",
      "email": "test1755590097006@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "d8826c36-456a-46dc-a860-ff90f2605c50",
      "codeExpired": "2025-08-19T08:54:57.232Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:54:57.234Z",
      "updatedAt": "2025-08-19T07:54:57.234Z",
      "__v": 0
    },
    {
      "_id": "68a42dd4530028d58c3a2154",
      "fullName": "Admin Test",
      "email": "admin_test1755590097007@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Admin",
      "role": "admin",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:55:00.229Z",
      "updatedAt": "2025-08-19T07:55:03.025Z",
      "__v": 0
    },
    {
      "_id": "68a42e1e530028d58c3a2169",
      "fullName": "Người Dùng Test",
      "email": "test1755590174371@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": false,
      "codeId": "b64accef-57af-4564-bf58-814fc7394247",
      "codeExpired": "2025-08-19T08:56:14.594Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:56:14.595Z",
      "updatedAt": "2025-08-19T07:56:14.595Z",
      "__v": 0
    },
    {
      "_id": "68a42e21530028d58c3a216c",
      "fullName": "Admin Test",
      "email": "admin_test1755590174371@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Admin",
      "role": "admin",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:56:17.658Z",
      "updatedAt": "2025-08-19T07:56:20.518Z",
      "__v": 0
    },
    {
      "_id": "68a42e79530028d58c3a2181",
      "fullName": "Người Dùng Test",
      "email": "test1755590265145@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": false,
      "codeId": "d13b6f77-7371-490c-bd58-79de9d0db154",
      "codeExpired": "2025-08-19T08:57:45.367Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:57:45.368Z",
      "updatedAt": "2025-08-19T07:57:45.368Z",
      "__v": 0
    },
    {
      "_id": "68a42e7c530028d58c3a2184",
      "fullName": "Admin Test",
      "email": "admin_test1755590265145@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Admin",
      "role": "admin",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:57:48.306Z",
      "updatedAt": "2025-08-19T07:57:51.164Z",
      "__v": 0
    },
    {
      "_id": "68a42f9b530028d58c3a21cb",
      "fullName": "Người Dùng Test",
      "email": "test1755590555652@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": false,
      "codeId": "2ad7caed-ba1b-4c10-8348-c9d8fd01d71d",
      "codeExpired": "2025-08-19T09:02:35.885Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:02:35.886Z",
      "updatedAt": "2025-08-19T08:02:35.886Z",
      "__v": 0
    }
  ],
  "totalPages": 4
}
```

---

### GET /users/doctors

- Mô tả: Lấy danh sách bác sĩ
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "68a478131d6e2985ac3d921a",
      "fullName": "Bác Sĩ Test",
      "email": "doctor_test1755609103052@example.com",
      "phone": "0987654322",
      "dateOfBirth": "1985-01-01T00:00:00.000Z",
      "gender": "female",
      "address": "456 Đường Bác Sĩ",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "Nha khoa tổng quát",
      "licenseNumber": "DDS12345",
      "agreeTerms": true,
      "createdAt": "2025-08-19T13:11:47.053Z",
      "updatedAt": "2025-08-19T13:11:49.947Z",
      "__v": 0
    },
    {
      "_id": "68a45f205e91c64efc53005b",
      "fullName": "Trần Chí Bảo",
      "email": "baotran.060103@gmail.com",
      "phone": "0337061506",
      "dateOfBirth": "2025-08-19T00:00:00.000Z",
      "gender": "male",
      "address": "Lâm Đông",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "general",
      "licenseNumber": "BS-337061506",
      "agreeTerms": true,
      "createdAt": "2025-08-19T11:25:20.303Z",
      "updatedAt": "2025-08-19T11:25:41.760Z",
      "__v": 0
    },
    {
      "_id": "68a45b56a1eb2df192822e93",
      "fullName": "Bác Sĩ Test",
      "email": "doctor_test1755601746865@example.com",
      "phone": "0987654322",
      "dateOfBirth": "1985-01-01T00:00:00.000Z",
      "gender": "female",
      "address": "456 Đường Bác Sĩ",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "Nha khoa tổng quát",
      "licenseNumber": "DDS12345",
      "agreeTerms": true,
      "createdAt": "2025-08-19T11:09:10.390Z",
      "updatedAt": "2025-08-19T11:09:14.126Z",
      "__v": 0
    },
    {
      "_id": "68a45afba1eb2df192822e35",
      "fullName": "Bác Sĩ Test",
      "email": "doctor_test1755601655769@example.com",
      "phone": "0987654322",
      "dateOfBirth": "1985-01-01T00:00:00.000Z",
      "gender": "female",
      "address": "456 Đường Bác Sĩ",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "Nha khoa tổng quát",
      "licenseNumber": "DDS12345",
      "agreeTerms": true,
      "createdAt": "2025-08-19T11:07:39.448Z",
      "updatedAt": "2025-08-19T11:07:42.572Z",
      "__v": 0
    },
    {
      "_id": "68a45834a1eb2df192822d3c",
      "fullName": "Bác Sĩ Test",
      "email": "doctor_test1755600945188@example.com",
      "phone": "0987654322",
      "dateOfBirth": "1985-01-01T00:00:00.000Z",
      "gender": "female",
      "address": "456 Đường Bác Sĩ",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "Nha khoa tổng quát",
      "licenseNumber": "DDS12345",
      "agreeTerms": true,
      "createdAt": "2025-08-19T10:55:48.975Z",
      "updatedAt": "2025-08-19T10:55:51.774Z",
      "__v": 0
    },
    {
      "_id": "68a43179530028d58c3a22c0",
      "fullName": "Bác Sĩ Test",
      "email": "doctor_test1755591029820@example.com",
      "phone": "0987654322",
      "dateOfBirth": "1985-01-01T00:00:00.000Z",
      "gender": "female",
      "address": "456 Đường Bác Sĩ",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "Nha khoa tổng quát",
      "licenseNumber": "DDS12345",
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:10:33.406Z",
      "updatedAt": "2025-08-19T08:10:36.307Z",
      "__v": 0
    },
    {
      "_id": "68a430f1530028d58c3a226c",
      "fullName": "Bác Sĩ Test",
      "email": "doctor_test1755590893476@example.com",
      "phone": "0987654322",
      "dateOfBirth": "1985-01-01T00:00:00.000Z",
      "gender": "female",
      "address": "456 Đường Bác Sĩ",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "Nha khoa tổng quát",
      "licenseNumber": "DDS12345",
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:08:17.071Z",
      "updatedAt": "2025-08-19T08:08:19.843Z",
      "__v": 0
    },
    {
      "_id": "68a43027530028d58c3a221a",
      "fullName": "Bác Sĩ Test",
      "email": "doctor_test1755590691972@example.com",
      "phone": "0987654322",
      "dateOfBirth": "1985-01-01T00:00:00.000Z",
      "gender": "female",
      "address": "456 Đường Bác Sĩ",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "specialty": "Nha khoa tổng quát",
      "licenseNumber": "DDS12345",
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:04:55.337Z",
      "updatedAt": "2025-08-19T08:04:58.318Z",
      "__v": 0
    },
    {
      "_id": "68a42974aee99e3143265400",
      "fullName": "bb",
      "email": "tovugiahuy2@gmail.com",
      "phone": "fff",
      "dateOfBirth": "2025-08-12T00:00:00.000Z",
      "gender": "female",
      "address": "gg",
      "role": "doctor",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "e9e90069-b94b-4cdd-a137-f8b6612be5e2",
      "codeExpired": "2025-08-19T08:36:20.117Z",
      "specialty": "general",
      "licenseNumber": "v01",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:36:20.119Z",
      "updatedAt": "2025-08-19T07:36:20.119Z",
      "__v": 0
    }
  ],
  "message": "Lấy danh sách bác sĩ thành công"
}
```

---

### GET /users/patients

- Mô tả: Lấy danh sách bệnh nhân
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "68a4780f1d6e2985ac3d9211",
      "fullName": "Bệnh Nhân Test",
      "email": "patient_test1755609103052@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T13:11:43.329Z",
      "updatedAt": "2025-08-19T13:11:46.589Z",
      "__v": 0
    },
    {
      "_id": "68a45b53a1eb2df192822e8d",
      "fullName": "Bệnh Nhân Test",
      "email": "patient_test1755601746865@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T11:09:07.105Z",
      "updatedAt": "2025-08-19T11:09:09.964Z",
      "__v": 0
    },
    {
      "_id": "68a45af7a1eb2df192822e2f",
      "fullName": "Bệnh Nhân Test",
      "email": "patient_test1755601655769@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T11:07:35.991Z",
      "updatedAt": "2025-08-19T11:07:39.031Z",
      "__v": 0
    },
    {
      "_id": "68a45831a1eb2df192822d36",
      "fullName": "Bệnh Nhân Test",
      "email": "patient_test1755600945188@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T10:55:45.459Z",
      "updatedAt": "2025-08-19T10:55:48.530Z",
      "__v": 0
    },
    {
      "_id": "68a43176530028d58c3a22ba",
      "fullName": "Bệnh Nhân Test",
      "email": "patient_test1755591029820@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:10:30.047Z",
      "updatedAt": "2025-08-19T08:10:32.985Z",
      "__v": 0
    },
    {
      "_id": "68a430ed530028d58c3a2266",
      "fullName": "Bệnh Nhân Test",
      "email": "patient_test1755590893476@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:08:13.704Z",
      "updatedAt": "2025-08-19T08:08:16.649Z",
      "__v": 0
    },
    {
      "_id": "68a43024530028d58c3a2215",
      "fullName": "Bệnh Nhân Test",
      "email": "patient_test1755590691972@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": null,
      "codeExpired": null,
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:04:52.196Z",
      "updatedAt": "2025-08-19T08:04:55.097Z",
      "__v": 0
    },
    {
      "_id": "68a42f9b530028d58c3a21cb",
      "fullName": "Người Dùng Test",
      "email": "test1755590555652@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": false,
      "codeId": "2ad7caed-ba1b-4c10-8348-c9d8fd01d71d",
      "codeExpired": "2025-08-19T09:02:35.885Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T08:02:35.886Z",
      "updatedAt": "2025-08-19T08:02:35.886Z",
      "__v": 0
    },
    {
      "_id": "68a42e79530028d58c3a2181",
      "fullName": "Người Dùng Test",
      "email": "test1755590265145@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": false,
      "codeId": "d13b6f77-7371-490c-bd58-79de9d0db154",
      "codeExpired": "2025-08-19T08:57:45.367Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:57:45.368Z",
      "updatedAt": "2025-08-19T07:57:45.368Z",
      "__v": 0
    },
    {
      "_id": "68a42e1e530028d58c3a2169",
      "fullName": "Người Dùng Test",
      "email": "test1755590174371@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": false,
      "codeId": "b64accef-57af-4564-bf58-814fc7394247",
      "codeExpired": "2025-08-19T08:56:14.594Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:56:14.595Z",
      "updatedAt": "2025-08-19T07:56:14.595Z",
      "__v": 0
    },
    {
      "_id": "68a42dd1530028d58c3a2151",
      "fullName": "Người Dùng Test",
      "email": "test1755590097006@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "d8826c36-456a-46dc-a860-ff90f2605c50",
      "codeExpired": "2025-08-19T08:54:57.232Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:54:57.234Z",
      "updatedAt": "2025-08-19T07:54:57.234Z",
      "__v": 0
    },
    {
      "_id": "68a42d27530028d58c3a2109",
      "fullName": "Người Dùng Test",
      "email": "test1755589927494@example.com",
      "phone": "0987654321",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "address": "123 Đường Test",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "961f0862-5136-4256-8652-6d6243108264",
      "codeExpired": "2025-08-19T08:52:07.779Z",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:52:07.794Z",
      "updatedAt": "2025-08-19T07:52:07.794Z",
      "__v": 0
    },
    {
      "_id": "68a4294faee99e31432653fd",
      "fullName": "aa",
      "email": "tovugiahuy1@gmail.com",
      "phone": "11",
      "dateOfBirth": "2025-08-06T00:00:00.000Z",
      "gender": "male",
      "address": "aq",
      "role": "patient",
      "accountType": "LOCAL",
      "isActive": true,
      "codeId": "cd9f6a70-aa18-4d71-b1e0-b8e9fd031077",
      "codeExpired": "2025-08-19T08:35:43.209Z",
      "specialty": "",
      "licenseNumber": "",
      "agreeTerms": true,
      "createdAt": "2025-08-19T07:35:43.211Z",
      "updatedAt": "2025-08-19T07:35:43.211Z",
      "__v": 0
    }
  ],
  "message": "Lấy danh sách bệnh nhân thành công"
}
```

---

### GET /appointments

- Mô tả: Lấy danh sách lịch hẹn
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
[
  {
    "_id": "68a4781a1d6e2985ac3d922b",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "appointmentDate": "2028-08-15T00:00:00.000Z",
    "startTime": "18:00",
    "endTime": "18:30",
    "duration": 30,
    "appointmentType": "Khám tổng quát",
    "notes": "Ghi chú test",
    "status": "pending",
    "isRescheduled": false,
    "createdAt": "2025-08-19T13:11:54.052Z",
    "updatedAt": "2025-08-19T13:11:54.052Z",
    "__v": 0
  },
  {
    "_id": "68a486b1b1161c140563dee5",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "appointmentDate": "2025-08-26T00:00:00.000Z",
    "startTime": "10:00",
    "endTime": "10:30",
    "duration": 30,
    "appointmentType": "Khám tổng quát",
    "notes": "Ghi chú test từ script Node.js",
    "status": "pending",
    "isRescheduled": false,
    "createdAt": "2025-08-19T14:14:09.690Z",
    "updatedAt": "2025-08-19T14:14:09.690Z",
    "__v": 0
  },
  {
    "_id": "68a4987c6a2852427214b5fe",
    "patientId": "68a4294faee99e31432653fd",
    "doctorId": "68a45f205e91c64efc53005b",
    "appointmentDate": "2028-08-15T00:00:00.000Z",
    "startTime": "18:00",
    "endTime": "18:30",
    "duration": 30,
    "appointmentType": "Khám tổng quát",
    "notes": "Ghi chú test",
    "status": "pending",
    "isRescheduled": false,
    "createdAt": "2025-08-19T15:30:04.831Z",
    "updatedAt": "2025-08-19T15:30:04.831Z",
    "__v": 0
  }
]
```

---

### POST /appointments

- Mô tả: Tạo lịch hẹn mới
- Trạng thái: 400
- Kết quả: Thất bại ❌

**Request Body:**

```json
{
  "patientId": "68a4294faee99e31432653fd",
  "doctorId": "68a45f205e91c64efc53005b",
  "appointmentDate": "2028-08-15T00:00:00.000Z",
  "startTime": "10:00",
  "endTime": "10:30",
  "appointmentType": "Khám tổng quát",
  "notes": "Ghi chú test",
  "duration": 30
}
```

**Response:**

```json
{
  "message": "Bác sĩ đã có lịch hẹn trong khoảng thời gian này",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### GET /appointments/doctor/68a45f205e91c64efc53005b

- Mô tả: Lấy danh sách lịch hẹn của bác sĩ
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
[
  {
    "_id": "68a4987c6a2852427214b5fe",
    "patientId": "68a4294faee99e31432653fd",
    "doctorId": "68a45f205e91c64efc53005b",
    "appointmentDate": "2028-08-15T00:00:00.000Z",
    "startTime": "18:00",
    "endTime": "18:30",
    "duration": 30,
    "appointmentType": "Khám tổng quát",
    "notes": "Ghi chú test",
    "status": "pending",
    "isRescheduled": false,
    "createdAt": "2025-08-19T15:30:04.831Z",
    "updatedAt": "2025-08-19T15:30:04.831Z",
    "__v": 0
  }
]
```

---

### GET /appointments/patient/68a4294faee99e31432653fd

- Mô tả: Lấy danh sách lịch hẹn của bệnh nhân
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
[
  {
    "_id": "68a4987c6a2852427214b5fe",
    "patientId": "68a4294faee99e31432653fd",
    "doctorId": "68a45f205e91c64efc53005b",
    "appointmentDate": "2028-08-15T00:00:00.000Z",
    "startTime": "18:00",
    "endTime": "18:30",
    "duration": 30,
    "appointmentType": "Khám tổng quát",
    "notes": "Ghi chú test",
    "status": "pending",
    "isRescheduled": false,
    "createdAt": "2025-08-19T15:30:04.831Z",
    "updatedAt": "2025-08-19T15:30:04.831Z",
    "__v": 0
  }
]
```

---

### GET /medical-records

- Mô tả: Lấy danh sách hồ sơ bệnh án
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
[
  {
    "_id": "68a40762a97df7ab4a85ed70",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:10:58.949Z",
    "updatedAt": "2025-08-19T05:10:58.949Z",
    "__v": 0
  },
  {
    "_id": "68a407b1a97df7ab4a85edb4",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:12:17.376Z",
    "updatedAt": "2025-08-19T05:12:17.376Z",
    "__v": 0
  },
  {
    "_id": "68a4055aa97df7ab4a85ec66",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:02:18.807Z",
    "updatedAt": "2025-08-19T05:02:18.807Z",
    "__v": 0
  },
  {
    "_id": "68a40720a97df7ab4a85ed2c",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:09:52.609Z",
    "updatedAt": "2025-08-19T05:09:52.609Z",
    "__v": 0
  },
  {
    "_id": "68a405f9a97df7ab4a85eca7",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:04:57.490Z",
    "updatedAt": "2025-08-19T05:04:57.490Z",
    "__v": 0
  },
  {
    "_id": "68a40511a97df7ab4a85ec25",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:01:05.300Z",
    "updatedAt": "2025-08-19T05:01:05.300Z",
    "__v": 0
  },
  {
    "_id": "68a40411a97df7ab4a85eba1",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:56:49.586Z",
    "updatedAt": "2025-08-19T04:56:49.586Z",
    "__v": 0
  },
  {
    "_id": "68a403d0a97df7ab4a85eb60",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:55:44.487Z",
    "updatedAt": "2025-08-19T04:55:44.487Z",
    "__v": 0
  },
  {
    "_id": "68a40484a97df7ab4a85ebe4",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:58:44.333Z",
    "updatedAt": "2025-08-19T04:58:44.333Z",
    "__v": 0
  },
  {
    "_id": "68a40656a97df7ab4a85ece8",
    "patientId": null,
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:06:30.482Z",
    "updatedAt": "2025-08-19T05:06:30.482Z",
    "__v": 0
  }
]
```

---

### POST /medical-records

- Mô tả: Tạo hồ sơ bệnh án mới
- Trạng thái: 201
- Kết quả: Thành công ✅

**Request Body:**

```json
{
  "patientId": "65f2e7d4e52b8b9d1e8b4567",
  "doctorId": "65f2e7d4e52b8b9d1e8b4568",
  "recordDate": "2023-08-15",
  "chiefComplaint": "Đau răng",
  "diagnosis": "Viêm nướu",
  "notes": "Ghi chú test"
}
```

**Response:**

```json
{
  "patientId": "65f2e7d4e52b8b9d1e8b4567",
  "doctorId": "65f2e7d4e52b8b9d1e8b4568",
  "recordDate": "2023-08-15T00:00:00.000Z",
  "chiefComplaint": "Đau răng",
  "diagnosis": "Viêm nướu",
  "medications": [],
  "notes": "Ghi chú test",
  "attachments": [],
  "dentalChart": [],
  "procedures": [],
  "isFollowUpRequired": false,
  "status": "active",
  "_id": "68a57ecd559dcfe17755c960",
  "createdAt": "2025-08-20T07:52:45.829Z",
  "updatedAt": "2025-08-20T07:52:45.829Z",
  "__v": 0
}
```

---

### GET /medical-records/doctor/65f2e7d4e52b8b9d1e8b4568

- Mô tả: Lấy danh sách hồ sơ bệnh án của bác sĩ
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
[
  {
    "_id": "68a40762a97df7ab4a85ed70",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:10:58.949Z",
    "updatedAt": "2025-08-19T05:10:58.949Z",
    "__v": 0
  },
  {
    "_id": "68a407b1a97df7ab4a85edb4",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:12:17.376Z",
    "updatedAt": "2025-08-19T05:12:17.376Z",
    "__v": 0
  },
  {
    "_id": "68a4055aa97df7ab4a85ec66",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:02:18.807Z",
    "updatedAt": "2025-08-19T05:02:18.807Z",
    "__v": 0
  },
  {
    "_id": "68a40720a97df7ab4a85ed2c",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:09:52.609Z",
    "updatedAt": "2025-08-19T05:09:52.609Z",
    "__v": 0
  },
  {
    "_id": "68a405f9a97df7ab4a85eca7",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:04:57.490Z",
    "updatedAt": "2025-08-19T05:04:57.490Z",
    "__v": 0
  },
  {
    "_id": "68a40511a97df7ab4a85ec25",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:01:05.300Z",
    "updatedAt": "2025-08-19T05:01:05.300Z",
    "__v": 0
  },
  {
    "_id": "68a40411a97df7ab4a85eba1",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:56:49.586Z",
    "updatedAt": "2025-08-19T04:56:49.586Z",
    "__v": 0
  },
  {
    "_id": "68a403d0a97df7ab4a85eb60",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:55:44.487Z",
    "updatedAt": "2025-08-19T04:55:44.487Z",
    "__v": 0
  },
  {
    "_id": "68a40484a97df7ab4a85ebe4",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:58:44.333Z",
    "updatedAt": "2025-08-19T04:58:44.333Z",
    "__v": 0
  },
  {
    "_id": "68a40656a97df7ab4a85ece8",
    "patientId": null,
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:06:30.482Z",
    "updatedAt": "2025-08-19T05:06:30.482Z",
    "__v": 0
  }
]
```

---

### GET /medical-records/patient/65f2e7d4e52b8b9d1e8b4567

- Mô tả: Lấy danh sách hồ sơ bệnh án của bệnh nhân
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
[
  {
    "_id": "68a40762a97df7ab4a85ed70",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:10:58.949Z",
    "updatedAt": "2025-08-19T05:10:58.949Z",
    "__v": 0
  },
  {
    "_id": "68a407b1a97df7ab4a85edb4",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:12:17.376Z",
    "updatedAt": "2025-08-19T05:12:17.376Z",
    "__v": 0
  },
  {
    "_id": "68a4055aa97df7ab4a85ec66",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:02:18.807Z",
    "updatedAt": "2025-08-19T05:02:18.807Z",
    "__v": 0
  },
  {
    "_id": "68a40720a97df7ab4a85ed2c",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:09:52.609Z",
    "updatedAt": "2025-08-19T05:09:52.609Z",
    "__v": 0
  },
  {
    "_id": "68a405f9a97df7ab4a85eca7",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:04:57.490Z",
    "updatedAt": "2025-08-19T05:04:57.490Z",
    "__v": 0
  },
  {
    "_id": "68a40511a97df7ab4a85ec25",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:01:05.300Z",
    "updatedAt": "2025-08-19T05:01:05.300Z",
    "__v": 0
  },
  {
    "_id": "68a40411a97df7ab4a85eba1",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:56:49.586Z",
    "updatedAt": "2025-08-19T04:56:49.586Z",
    "__v": 0
  },
  {
    "_id": "68a403d0a97df7ab4a85eb60",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:55:44.487Z",
    "updatedAt": "2025-08-19T04:55:44.487Z",
    "__v": 0
  },
  {
    "_id": "68a40484a97df7ab4a85ebe4",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T04:58:44.333Z",
    "updatedAt": "2025-08-19T04:58:44.333Z",
    "__v": 0
  },
  {
    "_id": "68a40656a97df7ab4a85ece8",
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": null,
    "recordDate": "2023-08-15T00:00:00.000Z",
    "chiefComplaint": "Đau răng",
    "diagnosis": "Viêm nướu",
    "medications": [],
    "notes": "Ghi chú test",
    "attachments": [],
    "dentalChart": [],
    "procedures": [],
    "isFollowUpRequired": false,
    "status": "active",
    "createdAt": "2025-08-19T05:06:30.482Z",
    "updatedAt": "2025-08-19T05:06:30.482Z",
    "__v": 0
  }
]
```

---

### GET /notifications

- Mô tả: Lấy danh sách thông báo
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "_id": "68a4017ea97df7ab4a85ea70",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T04:45:50.579Z",
        "updatedAt": "2025-08-19T04:45:50.826Z",
        "__v": 0
      },
      {
        "_id": "68a40232a97df7ab4a85eaad",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T04:48:50.701Z",
        "updatedAt": "2025-08-19T04:48:50.935Z",
        "__v": 0
      },
      {
        "_id": "68a402a9a97df7ab4a85eaeb",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T04:50:49.604Z",
        "updatedAt": "2025-08-19T04:50:49.835Z",
        "__v": 0
      },
      {
        "_id": "68a40322a97df7ab4a85eb2b",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T04:52:50.306Z",
        "updatedAt": "2025-08-19T04:52:50.545Z",
        "__v": 0
      },
      {
        "_id": "68a403d0a97df7ab4a85eb69",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T04:55:44.947Z",
        "updatedAt": "2025-08-19T04:55:45.171Z",
        "__v": 0
      },
      {
        "_id": "68a40412a97df7ab4a85ebaa",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T04:56:50.321Z",
        "updatedAt": "2025-08-19T04:56:50.650Z",
        "__v": 0
      },
      {
        "_id": "68a40484a97df7ab4a85ebed",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T04:58:44.801Z",
        "updatedAt": "2025-08-19T04:58:45.030Z",
        "__v": 0
      },
      {
        "_id": "68a40511a97df7ab4a85ec2e",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T05:01:05.745Z",
        "updatedAt": "2025-08-19T05:01:05.966Z",
        "__v": 0
      },
      {
        "_id": "68a4055ba97df7ab4a85ec6f",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T05:02:19.263Z",
        "updatedAt": "2025-08-19T05:02:19.491Z",
        "__v": 0
      },
      {
        "_id": "68a405f9a97df7ab4a85ecb0",
        "title": "Thông báo mới",
        "message": "Nội dung thông báo test",
        "userId": null,
        "isRead": true,
        "type": "appointment",
        "createdAt": "2025-08-19T05:04:57.931Z",
        "updatedAt": "2025-08-19T05:04:58.152Z",
        "__v": 0
      }
    ],
    "totalItems": 45,
    "totalPages": 5,
    "current": 1,
    "pageSize": 10
  },
  "message": "Lấy danh sách thông báo thành công"
}
```

---

### POST /notifications

- Mô tả: Tạo thông báo mới
- Trạng thái: 201
- Kết quả: Thành công ✅

**Request Body:**

```json
{
  "title": "Thông báo mới",
  "message": "Nội dung thông báo test",
  "userId": "65f2e7d4e52b8b9d1e8b4567",
  "isRead": false,
  "type": "appointment"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "title": "Thông báo mới",
    "message": "Nội dung thông báo test",
    "userId": "65f2e7d4e52b8b9d1e8b4567",
    "isRead": false,
    "type": "appointment",
    "_id": "68a57ece559dcfe17755c969",
    "createdAt": "2025-08-20T07:52:46.369Z",
    "updatedAt": "2025-08-20T07:52:46.369Z",
    "__v": 0
  },
  "message": "Tạo thông báo thành công"
}
```

---

### GET /notifications/user/65f2e7d4e52b8b9d1e8b4567

- Mô tả: Lấy danh sách thông báo của người dùng
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "68a57ece559dcfe17755c969",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": false,
      "type": "appointment",
      "createdAt": "2025-08-20T07:52:46.369Z",
      "updatedAt": "2025-08-20T07:52:46.369Z",
      "__v": 0
    },
    {
      "_id": "68a4781a1d6e2985ac3d923b",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T13:11:54.949Z",
      "updatedAt": "2025-08-19T13:11:55.239Z",
      "__v": 0
    },
    {
      "_id": "68a45b5ea1eb2df192822eb2",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T11:09:18.659Z",
      "updatedAt": "2025-08-19T11:09:18.898Z",
      "__v": 0
    },
    {
      "_id": "68a45b03a1eb2df192822e54",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T11:07:47.365Z",
      "updatedAt": "2025-08-19T11:07:47.606Z",
      "__v": 0
    },
    {
      "_id": "68a4583ca1eb2df192822d5b",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T10:55:56.592Z",
      "updatedAt": "2025-08-19T10:55:56.838Z",
      "__v": 0
    },
    {
      "_id": "68a43181530028d58c3a22e1",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T08:10:41.066Z",
      "updatedAt": "2025-08-19T08:10:41.306Z",
      "__v": 0
    },
    {
      "_id": "68a430f8530028d58c3a228b",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T08:08:24.836Z",
      "updatedAt": "2025-08-19T08:08:25.160Z",
      "__v": 0
    },
    {
      "_id": "68a4302e530028d58c3a2237",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T08:05:02.629Z",
      "updatedAt": "2025-08-19T08:05:02.859Z",
      "__v": 0
    },
    {
      "_id": "68a42fa3530028d58c3a21e6",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T08:02:43.022Z",
      "updatedAt": "2025-08-19T08:02:43.261Z",
      "__v": 0
    },
    {
      "_id": "68a42e80530028d58c3a219c",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:57:52.327Z",
      "updatedAt": "2025-08-19T07:57:52.568Z",
      "__v": 0
    },
    {
      "_id": "68a42e24530028d58c3a2173",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:56:20.716Z",
      "updatedAt": "2025-08-19T07:56:20.839Z",
      "__v": 0
    },
    {
      "_id": "68a42dd7530028d58c3a215b",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:55:03.226Z",
      "updatedAt": "2025-08-19T07:55:03.352Z",
      "__v": 0
    },
    {
      "_id": "68a42d2b530028d58c3a2122",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:52:11.920Z",
      "updatedAt": "2025-08-19T07:52:12.172Z",
      "__v": 0
    },
    {
      "_id": "68a42c88a36d8bd8d80e11ce",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:49:28.710Z",
      "updatedAt": "2025-08-19T07:49:28.956Z",
      "__v": 0
    },
    {
      "_id": "68a42c50a36d8bd8d80e1186",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:48:32.719Z",
      "updatedAt": "2025-08-19T07:48:32.963Z",
      "__v": 0
    },
    {
      "_id": "68a42c01a36d8bd8d80e1141",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:47:13.325Z",
      "updatedAt": "2025-08-19T07:47:13.580Z",
      "__v": 0
    },
    {
      "_id": "68a42b9d0cd2562053706806",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:45:33.987Z",
      "updatedAt": "2025-08-19T07:45:34.217Z",
      "__v": 0
    },
    {
      "_id": "68a42aea0cd25620537067c0",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:42:34.517Z",
      "updatedAt": "2025-08-19T07:42:34.751Z",
      "__v": 0
    },
    {
      "_id": "68a42ac00cd256205370677a",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:41:52.738Z",
      "updatedAt": "2025-08-19T07:41:52.991Z",
      "__v": 0
    },
    {
      "_id": "68a429750cd2562053706734",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:36:21.914Z",
      "updatedAt": "2025-08-19T07:36:22.143Z",
      "__v": 0
    },
    {
      "_id": "68a429440cd25620537066f0",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:35:32.985Z",
      "updatedAt": "2025-08-19T07:35:33.222Z",
      "__v": 0
    },
    {
      "_id": "68a428d30cd25620537066ac",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:33:39.119Z",
      "updatedAt": "2025-08-19T07:33:39.355Z",
      "__v": 0
    },
    {
      "_id": "68a428710cd2562053706653",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:32:01.912Z",
      "updatedAt": "2025-08-19T07:32:02.152Z",
      "__v": 0
    },
    {
      "_id": "68a428700cd2562053706624",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:32:00.509Z",
      "updatedAt": "2025-08-19T07:32:00.747Z",
      "__v": 0
    },
    {
      "_id": "68a427920cd25620537065e0",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T07:28:18.381Z",
      "updatedAt": "2025-08-19T07:28:18.634Z",
      "__v": 0
    },
    {
      "_id": "68a40d9307f78243d8dbc70e",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:37:23.798Z",
      "updatedAt": "2025-08-19T05:37:24.041Z",
      "__v": 0
    },
    {
      "_id": "68a40c0e07f78243d8dbc6ca",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:30:54.639Z",
      "updatedAt": "2025-08-19T05:30:54.892Z",
      "__v": 0
    },
    {
      "_id": "68a40ba1f8c5e668e2a572a9",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:29:05.586Z",
      "updatedAt": "2025-08-19T05:29:05.819Z",
      "__v": 0
    },
    {
      "_id": "68a40b07f8c5e668e2a57265",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:26:31.181Z",
      "updatedAt": "2025-08-19T05:26:31.425Z",
      "__v": 0
    },
    {
      "_id": "68a40ad9c10fed7cf1699a59",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:25:45.565Z",
      "updatedAt": "2025-08-19T05:25:45.805Z",
      "__v": 0
    },
    {
      "_id": "68a40a1e8f7a76918115e646",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:22:38.475Z",
      "updatedAt": "2025-08-19T05:22:38.714Z",
      "__v": 0
    },
    {
      "_id": "68a409438f7a76918115e602",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:18:59.912Z",
      "updatedAt": "2025-08-19T05:19:00.150Z",
      "__v": 0
    },
    {
      "_id": "68a407b1a97df7ab4a85edbd",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:12:17.841Z",
      "updatedAt": "2025-08-19T05:12:18.082Z",
      "__v": 0
    },
    {
      "_id": "68a40763a97df7ab4a85ed79",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:10:59.411Z",
      "updatedAt": "2025-08-19T05:10:59.641Z",
      "__v": 0
    },
    {
      "_id": "68a40721a97df7ab4a85ed35",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:09:53.072Z",
      "updatedAt": "2025-08-19T05:09:53.306Z",
      "__v": 0
    },
    {
      "_id": "68a40656a97df7ab4a85ecf1",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:06:30.946Z",
      "updatedAt": "2025-08-19T05:06:31.186Z",
      "__v": 0
    },
    {
      "_id": "68a405f9a97df7ab4a85ecb0",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:04:57.931Z",
      "updatedAt": "2025-08-19T05:04:58.152Z",
      "__v": 0
    },
    {
      "_id": "68a4055ba97df7ab4a85ec6f",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:02:19.263Z",
      "updatedAt": "2025-08-19T05:02:19.491Z",
      "__v": 0
    },
    {
      "_id": "68a40511a97df7ab4a85ec2e",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T05:01:05.745Z",
      "updatedAt": "2025-08-19T05:01:05.966Z",
      "__v": 0
    },
    {
      "_id": "68a40484a97df7ab4a85ebed",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T04:58:44.801Z",
      "updatedAt": "2025-08-19T04:58:45.030Z",
      "__v": 0
    },
    {
      "_id": "68a40412a97df7ab4a85ebaa",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T04:56:50.321Z",
      "updatedAt": "2025-08-19T04:56:50.650Z",
      "__v": 0
    },
    {
      "_id": "68a403d0a97df7ab4a85eb69",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T04:55:44.947Z",
      "updatedAt": "2025-08-19T04:55:45.171Z",
      "__v": 0
    },
    {
      "_id": "68a40322a97df7ab4a85eb2b",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T04:52:50.306Z",
      "updatedAt": "2025-08-19T04:52:50.545Z",
      "__v": 0
    },
    {
      "_id": "68a402a9a97df7ab4a85eaeb",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T04:50:49.604Z",
      "updatedAt": "2025-08-19T04:50:49.835Z",
      "__v": 0
    },
    {
      "_id": "68a40232a97df7ab4a85eaad",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T04:48:50.701Z",
      "updatedAt": "2025-08-19T04:48:50.935Z",
      "__v": 0
    },
    {
      "_id": "68a4017ea97df7ab4a85ea70",
      "title": "Thông báo mới",
      "message": "Nội dung thông báo test",
      "userId": null,
      "isRead": true,
      "type": "appointment",
      "createdAt": "2025-08-19T04:45:50.579Z",
      "updatedAt": "2025-08-19T04:45:50.826Z",
      "__v": 0
    }
  ],
  "message": "Lấy danh sách thông báo của người dùng thành công"
}
```

---

### PATCH /notifications/65f2e7d4e52b8b9d1e8b4569/read

- Mô tả: Đánh dấu thông báo đã đọc
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": false,
  "message": "Không tìm thấy thông báo"
}
```

---

### PATCH /notifications/user/65f2e7d4e52b8b9d1e8b4567/read-all

- Mô tả: Đánh dấu tất cả thông báo của người dùng đã đọc
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "message": "Đánh dấu tất cả thông báo đã đọc thành công"
}
```

---

### GET /payments

- Mô tả: Lấy danh sách thanh toán
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "_id": "68a40512a97df7ab4a85ec38",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:01:06.194Z",
        "updatedAt": "2025-08-19T05:01:06.194Z",
        "__v": 0
      },
      {
        "_id": "68a4055ba97df7ab4a85ec79",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:02:19.728Z",
        "updatedAt": "2025-08-19T05:02:19.728Z",
        "__v": 0
      },
      {
        "_id": "68a405faa97df7ab4a85ecba",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:04:58.378Z",
        "updatedAt": "2025-08-19T05:04:58.378Z",
        "__v": 0
      },
      {
        "_id": "68a40657a97df7ab4a85ecfb",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:06:31.420Z",
        "updatedAt": "2025-08-19T05:06:31.420Z",
        "__v": 0
      },
      {
        "_id": "68a40721a97df7ab4a85ed3f",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:09:53.545Z",
        "updatedAt": "2025-08-19T05:09:53.545Z",
        "__v": 0
      },
      {
        "_id": "68a40763a97df7ab4a85ed83",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:10:59.877Z",
        "updatedAt": "2025-08-19T05:10:59.877Z",
        "__v": 0
      },
      {
        "_id": "68a407b2a97df7ab4a85edc7",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:12:18.322Z",
        "updatedAt": "2025-08-19T05:12:18.322Z",
        "__v": 0
      },
      {
        "_id": "68a409448f7a76918115e60c",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:19:00.393Z",
        "updatedAt": "2025-08-19T05:19:00.393Z",
        "__v": 0
      },
      {
        "_id": "68a40a1e8f7a76918115e650",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:22:38.957Z",
        "updatedAt": "2025-08-19T05:22:38.957Z",
        "__v": 0
      },
      {
        "_id": "68a40adac10fed7cf1699a63",
        "patientId": null,
        "doctorId": null,
        "amount": 500000,
        "status": "pending",
        "type": "appointment",
        "paymentMethod": "cash",
        "createdAt": "2025-08-19T05:25:46.050Z",
        "updatedAt": "2025-08-19T05:25:46.050Z",
        "__v": 0
      }
    ],
    "totalItems": 38,
    "totalPages": 4,
    "current": 1,
    "pageSize": 10
  },
  "message": "Lấy danh sách thanh toán thành công"
}
```

---

### POST /payments

- Mô tả: Tạo thanh toán mới
- Trạng thái: 201
- Kết quả: Thành công ✅

**Request Body:**

```json
{
  "patientId": "65f2e7d4e52b8b9d1e8b4567",
  "doctorId": "65f2e7d4e52b8b9d1e8b4568",
  "amount": 500000,
  "status": "pending",
  "type": "appointment",
  "paymentMethod": "cash"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "patientId": "65f2e7d4e52b8b9d1e8b4567",
    "doctorId": "65f2e7d4e52b8b9d1e8b4568",
    "amount": 500000,
    "status": "pending",
    "type": "appointment",
    "paymentMethod": "cash",
    "_id": "68a57ece559dcfe17755c973",
    "createdAt": "2025-08-20T07:52:46.895Z",
    "updatedAt": "2025-08-20T07:52:46.895Z",
    "__v": 0
  },
  "message": "Tạo thanh toán thành công"
}
```

---

### GET /payments/patient/65f2e7d4e52b8b9d1e8b4567

- Mô tả: Lấy danh sách thanh toán của bệnh nhân
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "68a57ece559dcfe17755c973",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-20T07:52:46.895Z",
      "updatedAt": "2025-08-20T07:52:46.895Z",
      "__v": 0
    },
    {
      "_id": "68a4781b1d6e2985ac3d9245",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T13:11:55.520Z",
      "updatedAt": "2025-08-19T13:11:55.520Z",
      "__v": 0
    },
    {
      "_id": "68a45b5fa1eb2df192822ebc",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T11:09:19.147Z",
      "updatedAt": "2025-08-19T11:09:19.147Z",
      "__v": 0
    },
    {
      "_id": "68a45b03a1eb2df192822e5e",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T11:07:47.853Z",
      "updatedAt": "2025-08-19T11:07:47.853Z",
      "__v": 0
    },
    {
      "_id": "68a4583da1eb2df192822d65",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T10:55:57.087Z",
      "updatedAt": "2025-08-19T10:55:57.087Z",
      "__v": 0
    },
    {
      "_id": "68a43181530028d58c3a22eb",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:10:41.547Z",
      "updatedAt": "2025-08-19T08:10:41.547Z",
      "__v": 0
    },
    {
      "_id": "68a430f9530028d58c3a2295",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:08:25.480Z",
      "updatedAt": "2025-08-19T08:08:25.480Z",
      "__v": 0
    },
    {
      "_id": "68a4302f530028d58c3a2241",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:05:03.093Z",
      "updatedAt": "2025-08-19T08:05:03.093Z",
      "__v": 0
    },
    {
      "_id": "68a42fa3530028d58c3a21f0",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:02:43.500Z",
      "updatedAt": "2025-08-19T08:02:43.500Z",
      "__v": 0
    },
    {
      "_id": "68a42e80530028d58c3a21a6",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:57:52.810Z",
      "updatedAt": "2025-08-19T07:57:52.810Z",
      "__v": 0
    },
    {
      "_id": "68a42e24530028d58c3a2177",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:56:20.911Z",
      "updatedAt": "2025-08-19T07:56:20.911Z",
      "__v": 0
    },
    {
      "_id": "68a42dd7530028d58c3a215f",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:55:03.424Z",
      "updatedAt": "2025-08-19T07:55:03.424Z",
      "__v": 0
    },
    {
      "_id": "68a42d2c530028d58c3a212c",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:52:12.417Z",
      "updatedAt": "2025-08-19T07:52:12.417Z",
      "__v": 0
    },
    {
      "_id": "68a42c89a36d8bd8d80e11d8",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:49:29.206Z",
      "updatedAt": "2025-08-19T07:49:29.206Z",
      "__v": 0
    },
    {
      "_id": "68a42c51a36d8bd8d80e1190",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:48:33.209Z",
      "updatedAt": "2025-08-19T07:48:33.209Z",
      "__v": 0
    },
    {
      "_id": "68a42c01a36d8bd8d80e114b",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:47:13.849Z",
      "updatedAt": "2025-08-19T07:47:13.849Z",
      "__v": 0
    },
    {
      "_id": "68a42b9e0cd2562053706810",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:45:34.446Z",
      "updatedAt": "2025-08-19T07:45:34.446Z",
      "__v": 0
    },
    {
      "_id": "68a42aea0cd25620537067ca",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:42:34.999Z",
      "updatedAt": "2025-08-19T07:42:34.999Z",
      "__v": 0
    },
    {
      "_id": "68a42ac10cd2562053706784",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:41:53.231Z",
      "updatedAt": "2025-08-19T07:41:53.231Z",
      "__v": 0
    },
    {
      "_id": "68a429760cd256205370673e",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:36:22.378Z",
      "updatedAt": "2025-08-19T07:36:22.378Z",
      "__v": 0
    },
    {
      "_id": "68a429450cd25620537066fa",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:35:33.458Z",
      "updatedAt": "2025-08-19T07:35:33.458Z",
      "__v": 0
    },
    {
      "_id": "68a428d30cd25620537066b6",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:33:39.596Z",
      "updatedAt": "2025-08-19T07:33:39.596Z",
      "__v": 0
    },
    {
      "_id": "68a428720cd256205370666a",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:32:02.397Z",
      "updatedAt": "2025-08-19T07:32:02.397Z",
      "__v": 0
    },
    {
      "_id": "68a428700cd2562053706632",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:32:00.990Z",
      "updatedAt": "2025-08-19T07:32:00.990Z",
      "__v": 0
    },
    {
      "_id": "68a427920cd25620537065ea",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:28:18.887Z",
      "updatedAt": "2025-08-19T07:28:18.887Z",
      "__v": 0
    },
    {
      "_id": "68a40d9407f78243d8dbc718",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:37:24.297Z",
      "updatedAt": "2025-08-19T05:37:24.297Z",
      "__v": 0
    },
    {
      "_id": "68a40c0f07f78243d8dbc6d4",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:30:55.143Z",
      "updatedAt": "2025-08-19T05:30:55.143Z",
      "__v": 0
    },
    {
      "_id": "68a40ba2f8c5e668e2a572b3",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:29:06.055Z",
      "updatedAt": "2025-08-19T05:29:06.055Z",
      "__v": 0
    },
    {
      "_id": "68a40b07f8c5e668e2a5726f",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:26:31.667Z",
      "updatedAt": "2025-08-19T05:26:31.667Z",
      "__v": 0
    },
    {
      "_id": "68a40adac10fed7cf1699a63",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:25:46.050Z",
      "updatedAt": "2025-08-19T05:25:46.050Z",
      "__v": 0
    },
    {
      "_id": "68a40a1e8f7a76918115e650",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:22:38.957Z",
      "updatedAt": "2025-08-19T05:22:38.957Z",
      "__v": 0
    },
    {
      "_id": "68a409448f7a76918115e60c",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:19:00.393Z",
      "updatedAt": "2025-08-19T05:19:00.393Z",
      "__v": 0
    },
    {
      "_id": "68a407b2a97df7ab4a85edc7",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:12:18.322Z",
      "updatedAt": "2025-08-19T05:12:18.322Z",
      "__v": 0
    },
    {
      "_id": "68a40763a97df7ab4a85ed83",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:10:59.877Z",
      "updatedAt": "2025-08-19T05:10:59.877Z",
      "__v": 0
    },
    {
      "_id": "68a40721a97df7ab4a85ed3f",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:09:53.545Z",
      "updatedAt": "2025-08-19T05:09:53.545Z",
      "__v": 0
    },
    {
      "_id": "68a40657a97df7ab4a85ecfb",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:06:31.420Z",
      "updatedAt": "2025-08-19T05:06:31.420Z",
      "__v": 0
    },
    {
      "_id": "68a405faa97df7ab4a85ecba",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:04:58.378Z",
      "updatedAt": "2025-08-19T05:04:58.378Z",
      "__v": 0
    },
    {
      "_id": "68a4055ba97df7ab4a85ec79",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:02:19.728Z",
      "updatedAt": "2025-08-19T05:02:19.728Z",
      "__v": 0
    },
    {
      "_id": "68a40512a97df7ab4a85ec38",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:01:06.194Z",
      "updatedAt": "2025-08-19T05:01:06.194Z",
      "__v": 0
    }
  ],
  "message": "Lấy danh sách thanh toán của bệnh nhân thành công"
}
```

---

### GET /payments/doctor/65f2e7d4e52b8b9d1e8b4568

- Mô tả: Lấy danh sách thanh toán của bác sĩ
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "68a57ece559dcfe17755c973",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-20T07:52:46.895Z",
      "updatedAt": "2025-08-20T07:52:46.895Z",
      "__v": 0
    },
    {
      "_id": "68a4781b1d6e2985ac3d9245",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T13:11:55.520Z",
      "updatedAt": "2025-08-19T13:11:55.520Z",
      "__v": 0
    },
    {
      "_id": "68a45b5fa1eb2df192822ebc",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T11:09:19.147Z",
      "updatedAt": "2025-08-19T11:09:19.147Z",
      "__v": 0
    },
    {
      "_id": "68a45b03a1eb2df192822e5e",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T11:07:47.853Z",
      "updatedAt": "2025-08-19T11:07:47.853Z",
      "__v": 0
    },
    {
      "_id": "68a4583da1eb2df192822d65",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T10:55:57.087Z",
      "updatedAt": "2025-08-19T10:55:57.087Z",
      "__v": 0
    },
    {
      "_id": "68a43181530028d58c3a22eb",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:10:41.547Z",
      "updatedAt": "2025-08-19T08:10:41.547Z",
      "__v": 0
    },
    {
      "_id": "68a430f9530028d58c3a2295",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:08:25.480Z",
      "updatedAt": "2025-08-19T08:08:25.480Z",
      "__v": 0
    },
    {
      "_id": "68a4302f530028d58c3a2241",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:05:03.093Z",
      "updatedAt": "2025-08-19T08:05:03.093Z",
      "__v": 0
    },
    {
      "_id": "68a42fa3530028d58c3a21f0",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T08:02:43.500Z",
      "updatedAt": "2025-08-19T08:02:43.500Z",
      "__v": 0
    },
    {
      "_id": "68a42e80530028d58c3a21a6",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:57:52.810Z",
      "updatedAt": "2025-08-19T07:57:52.810Z",
      "__v": 0
    },
    {
      "_id": "68a42e24530028d58c3a2177",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:56:20.911Z",
      "updatedAt": "2025-08-19T07:56:20.911Z",
      "__v": 0
    },
    {
      "_id": "68a42dd7530028d58c3a215f",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:55:03.424Z",
      "updatedAt": "2025-08-19T07:55:03.424Z",
      "__v": 0
    },
    {
      "_id": "68a42d2c530028d58c3a212c",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:52:12.417Z",
      "updatedAt": "2025-08-19T07:52:12.417Z",
      "__v": 0
    },
    {
      "_id": "68a42c89a36d8bd8d80e11d8",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:49:29.206Z",
      "updatedAt": "2025-08-19T07:49:29.206Z",
      "__v": 0
    },
    {
      "_id": "68a42c51a36d8bd8d80e1190",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:48:33.209Z",
      "updatedAt": "2025-08-19T07:48:33.209Z",
      "__v": 0
    },
    {
      "_id": "68a42c01a36d8bd8d80e114b",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:47:13.849Z",
      "updatedAt": "2025-08-19T07:47:13.849Z",
      "__v": 0
    },
    {
      "_id": "68a42b9e0cd2562053706810",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:45:34.446Z",
      "updatedAt": "2025-08-19T07:45:34.446Z",
      "__v": 0
    },
    {
      "_id": "68a42aea0cd25620537067ca",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:42:34.999Z",
      "updatedAt": "2025-08-19T07:42:34.999Z",
      "__v": 0
    },
    {
      "_id": "68a42ac10cd2562053706784",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:41:53.231Z",
      "updatedAt": "2025-08-19T07:41:53.231Z",
      "__v": 0
    },
    {
      "_id": "68a429760cd256205370673e",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:36:22.378Z",
      "updatedAt": "2025-08-19T07:36:22.378Z",
      "__v": 0
    },
    {
      "_id": "68a429450cd25620537066fa",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:35:33.458Z",
      "updatedAt": "2025-08-19T07:35:33.458Z",
      "__v": 0
    },
    {
      "_id": "68a428d30cd25620537066b6",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:33:39.596Z",
      "updatedAt": "2025-08-19T07:33:39.596Z",
      "__v": 0
    },
    {
      "_id": "68a428720cd256205370666a",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:32:02.397Z",
      "updatedAt": "2025-08-19T07:32:02.397Z",
      "__v": 0
    },
    {
      "_id": "68a428700cd2562053706632",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:32:00.990Z",
      "updatedAt": "2025-08-19T07:32:00.990Z",
      "__v": 0
    },
    {
      "_id": "68a427920cd25620537065ea",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T07:28:18.887Z",
      "updatedAt": "2025-08-19T07:28:18.887Z",
      "__v": 0
    },
    {
      "_id": "68a40d9407f78243d8dbc718",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:37:24.297Z",
      "updatedAt": "2025-08-19T05:37:24.297Z",
      "__v": 0
    },
    {
      "_id": "68a40c0f07f78243d8dbc6d4",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:30:55.143Z",
      "updatedAt": "2025-08-19T05:30:55.143Z",
      "__v": 0
    },
    {
      "_id": "68a40ba2f8c5e668e2a572b3",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:29:06.055Z",
      "updatedAt": "2025-08-19T05:29:06.055Z",
      "__v": 0
    },
    {
      "_id": "68a40b07f8c5e668e2a5726f",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:26:31.667Z",
      "updatedAt": "2025-08-19T05:26:31.667Z",
      "__v": 0
    },
    {
      "_id": "68a40adac10fed7cf1699a63",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:25:46.050Z",
      "updatedAt": "2025-08-19T05:25:46.050Z",
      "__v": 0
    },
    {
      "_id": "68a40a1e8f7a76918115e650",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:22:38.957Z",
      "updatedAt": "2025-08-19T05:22:38.957Z",
      "__v": 0
    },
    {
      "_id": "68a409448f7a76918115e60c",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:19:00.393Z",
      "updatedAt": "2025-08-19T05:19:00.393Z",
      "__v": 0
    },
    {
      "_id": "68a407b2a97df7ab4a85edc7",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:12:18.322Z",
      "updatedAt": "2025-08-19T05:12:18.322Z",
      "__v": 0
    },
    {
      "_id": "68a40763a97df7ab4a85ed83",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:10:59.877Z",
      "updatedAt": "2025-08-19T05:10:59.877Z",
      "__v": 0
    },
    {
      "_id": "68a40721a97df7ab4a85ed3f",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:09:53.545Z",
      "updatedAt": "2025-08-19T05:09:53.545Z",
      "__v": 0
    },
    {
      "_id": "68a40657a97df7ab4a85ecfb",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:06:31.420Z",
      "updatedAt": "2025-08-19T05:06:31.420Z",
      "__v": 0
    },
    {
      "_id": "68a405faa97df7ab4a85ecba",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:04:58.378Z",
      "updatedAt": "2025-08-19T05:04:58.378Z",
      "__v": 0
    },
    {
      "_id": "68a4055ba97df7ab4a85ec79",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:02:19.728Z",
      "updatedAt": "2025-08-19T05:02:19.728Z",
      "__v": 0
    },
    {
      "_id": "68a40512a97df7ab4a85ec38",
      "patientId": null,
      "doctorId": null,
      "amount": 500000,
      "status": "pending",
      "type": "appointment",
      "paymentMethod": "cash",
      "createdAt": "2025-08-19T05:01:06.194Z",
      "updatedAt": "2025-08-19T05:01:06.194Z",
      "__v": 0
    }
  ],
  "message": "Lấy danh sách thanh toán của bác sĩ thành công"
}
```

---

### PATCH /payments/68a403d1a97df7ab4a85eb73

- Mô tả: Cập nhật trạng thái thanh toán
- Trạng thái: 200
- Kết quả: Thành công ✅

**Request Body:**

```json
{
  "_id": "68a403d1a97df7ab4a85eb73",
  "status": "completed"
}
```

**Response:**

```json
{
  "success": false,
  "message": "Không tìm thấy thanh toán"
}
```

---

### GET /reviews

- Mô tả: Lấy danh sách đánh giá
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "data": [
    {
      "_id": "68a4017fa97df7ab4a85ea84",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:45:51.440Z",
      "updatedAt": "2025-08-19T04:45:51.440Z",
      "__v": 0
    },
    {
      "_id": "68a40233a97df7ab4a85eac3",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:48:51.597Z",
      "updatedAt": "2025-08-19T04:48:51.597Z",
      "__v": 0
    },
    {
      "_id": "68a402aaa97df7ab4a85eb01",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:50:50.496Z",
      "updatedAt": "2025-08-19T04:50:50.496Z",
      "__v": 0
    },
    {
      "_id": "68a40323a97df7ab4a85eb41",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:52:51.198Z",
      "updatedAt": "2025-08-19T04:52:51.198Z",
      "__v": 0
    },
    {
      "_id": "68a403d1a97df7ab4a85eb7f",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:55:45.798Z",
      "updatedAt": "2025-08-19T04:55:45.798Z",
      "__v": 0
    },
    {
      "_id": "68a40413a97df7ab4a85ebc0",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:56:51.546Z",
      "updatedAt": "2025-08-19T04:56:51.546Z",
      "__v": 0
    },
    {
      "_id": "68a40485a97df7ab4a85ec03",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:58:45.680Z",
      "updatedAt": "2025-08-19T04:58:45.680Z",
      "__v": 0
    },
    {
      "_id": "68a40512a97df7ab4a85ec44",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:01:06.615Z",
      "updatedAt": "2025-08-19T05:01:06.615Z",
      "__v": 0
    },
    {
      "_id": "68a4055ca97df7ab4a85ec85",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:02:20.123Z",
      "updatedAt": "2025-08-19T05:02:20.123Z",
      "__v": 0
    },
    {
      "_id": "68a405faa97df7ab4a85ecc6",
      "patientId": null,
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:04:58.786Z",
      "updatedAt": "2025-08-19T05:04:58.786Z",
      "__v": 0
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10
}
```

---

### POST /reviews

- Mô tả: Tạo đánh giá mới
- Trạng thái: 201
- Kết quả: Thành công ✅

**Request Body:**

```json
{
  "patientId": "65f2e7d4e52b8b9d1e8b4567",
  "doctorId": "65f2e7d4e52b8b9d1e8b4568",
  "rating": 5,
  "comment": "Bác sĩ rất tận tâm và chuyên nghiệp"
}
```

**Response:**

```json
{
  "patientId": "65f2e7d4e52b8b9d1e8b4567",
  "doctorId": "65f2e7d4e52b8b9d1e8b4568",
  "rating": 5,
  "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
  "isVisible": true,
  "_id": "68a57ecf559dcfe17755c980",
  "createdAt": "2025-08-20T07:52:47.426Z",
  "updatedAt": "2025-08-20T07:52:47.426Z",
  "__v": 0
}
```

---

### GET /reviews/doctor/65f2e7d4e52b8b9d1e8b4568

- Mô tả: Lấy danh sách đánh giá của bác sĩ
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "data": [
    {
      "_id": "68a4017fa97df7ab4a85ea84",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:45:51.440Z",
      "updatedAt": "2025-08-19T04:45:51.440Z",
      "__v": 0
    },
    {
      "_id": "68a40233a97df7ab4a85eac3",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:48:51.597Z",
      "updatedAt": "2025-08-19T04:48:51.597Z",
      "__v": 0
    },
    {
      "_id": "68a402aaa97df7ab4a85eb01",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:50:50.496Z",
      "updatedAt": "2025-08-19T04:50:50.496Z",
      "__v": 0
    },
    {
      "_id": "68a40323a97df7ab4a85eb41",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:52:51.198Z",
      "updatedAt": "2025-08-19T04:52:51.198Z",
      "__v": 0
    },
    {
      "_id": "68a403d1a97df7ab4a85eb7f",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:55:45.798Z",
      "updatedAt": "2025-08-19T04:55:45.798Z",
      "__v": 0
    },
    {
      "_id": "68a40413a97df7ab4a85ebc0",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:56:51.546Z",
      "updatedAt": "2025-08-19T04:56:51.546Z",
      "__v": 0
    },
    {
      "_id": "68a40485a97df7ab4a85ec03",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:58:45.680Z",
      "updatedAt": "2025-08-19T04:58:45.680Z",
      "__v": 0
    },
    {
      "_id": "68a40512a97df7ab4a85ec44",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:01:06.615Z",
      "updatedAt": "2025-08-19T05:01:06.615Z",
      "__v": 0
    },
    {
      "_id": "68a4055ca97df7ab4a85ec85",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:02:20.123Z",
      "updatedAt": "2025-08-19T05:02:20.123Z",
      "__v": 0
    },
    {
      "_id": "68a405faa97df7ab4a85ecc6",
      "patientId": null,
      "doctorId": "65f2e7d4e52b8b9d1e8b4568",
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:04:58.786Z",
      "updatedAt": "2025-08-19T05:04:58.786Z",
      "__v": 0
    }
  ],
  "total": 46,
  "page": 1,
  "limit": 10
}
```

---

### GET /reviews/patient/65f2e7d4e52b8b9d1e8b4567

- Mô tả: Lấy danh sách đánh giá của bệnh nhân
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "data": [
    {
      "_id": "68a4017fa97df7ab4a85ea84",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:45:51.440Z",
      "updatedAt": "2025-08-19T04:45:51.440Z",
      "__v": 0
    },
    {
      "_id": "68a40233a97df7ab4a85eac3",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:48:51.597Z",
      "updatedAt": "2025-08-19T04:48:51.597Z",
      "__v": 0
    },
    {
      "_id": "68a402aaa97df7ab4a85eb01",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:50:50.496Z",
      "updatedAt": "2025-08-19T04:50:50.496Z",
      "__v": 0
    },
    {
      "_id": "68a40323a97df7ab4a85eb41",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:52:51.198Z",
      "updatedAt": "2025-08-19T04:52:51.198Z",
      "__v": 0
    },
    {
      "_id": "68a403d1a97df7ab4a85eb7f",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:55:45.798Z",
      "updatedAt": "2025-08-19T04:55:45.798Z",
      "__v": 0
    },
    {
      "_id": "68a40413a97df7ab4a85ebc0",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:56:51.546Z",
      "updatedAt": "2025-08-19T04:56:51.546Z",
      "__v": 0
    },
    {
      "_id": "68a40485a97df7ab4a85ec03",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T04:58:45.680Z",
      "updatedAt": "2025-08-19T04:58:45.680Z",
      "__v": 0
    },
    {
      "_id": "68a40512a97df7ab4a85ec44",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:01:06.615Z",
      "updatedAt": "2025-08-19T05:01:06.615Z",
      "__v": 0
    },
    {
      "_id": "68a4055ca97df7ab4a85ec85",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:02:20.123Z",
      "updatedAt": "2025-08-19T05:02:20.123Z",
      "__v": 0
    },
    {
      "_id": "68a405faa97df7ab4a85ecc6",
      "patientId": "65f2e7d4e52b8b9d1e8b4567",
      "doctorId": null,
      "rating": 5,
      "comment": "Bác sĩ rất tận tâm và chuyên nghiệp",
      "isVisible": true,
      "createdAt": "2025-08-19T05:04:58.786Z",
      "updatedAt": "2025-08-19T05:04:58.786Z",
      "__v": 0
    }
  ],
  "total": 46,
  "page": 1,
  "limit": 10
}
```

---

### GET /reviews/doctor/65f2e7d4e52b8b9d1e8b4568/rating

- Mô tả: Lấy điểm đánh giá trung bình của bác sĩ
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "averageRating": 5,
  "totalReviews": 46
}
```

---

### GET /reports

- Mô tả: Lấy danh sách báo cáo
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "data": [
    {
      "_id": "68a4017fa97df7ab4a85ea8f",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "resolved",
      "participants": [],
      "createdAt": "2025-08-19T04:45:51.856Z",
      "updatedAt": "2025-08-19T13:11:56.976Z",
      "__v": 0,
      "assignedTo": null,
      "resolution": "Đã xử lý lỗi thành công",
      "resolvedAt": "2025-08-19T13:11:56.976Z"
    },
    {
      "_id": "68a40234a97df7ab4a85eacf",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:48:52.053Z",
      "updatedAt": "2025-08-19T04:48:52.053Z",
      "__v": 0
    },
    {
      "_id": "68a402aaa97df7ab4a85eb0d",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:50:50.946Z",
      "updatedAt": "2025-08-19T04:50:50.946Z",
      "__v": 0
    },
    {
      "_id": "68a40323a97df7ab4a85eb4d",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:52:51.671Z",
      "updatedAt": "2025-08-19T04:52:51.671Z",
      "__v": 0
    },
    {
      "_id": "68a403d2a97df7ab4a85eb8c",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:55:46.244Z",
      "updatedAt": "2025-08-19T04:55:46.244Z",
      "__v": 0
    },
    {
      "_id": "68a40414a97df7ab4a85ebcd",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:56:52.455Z",
      "updatedAt": "2025-08-19T04:56:52.455Z",
      "__v": 0
    },
    {
      "_id": "68a40486a97df7ab4a85ec10",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:58:46.144Z",
      "updatedAt": "2025-08-19T04:58:46.144Z",
      "__v": 0
    },
    {
      "_id": "68a40513a97df7ab4a85ec51",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T05:01:07.061Z",
      "updatedAt": "2025-08-19T05:01:07.061Z",
      "__v": 0
    },
    {
      "_id": "68a4055ca97df7ab4a85ec92",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T05:02:20.574Z",
      "updatedAt": "2025-08-19T05:02:20.574Z",
      "__v": 0
    },
    {
      "_id": "68a405fba97df7ab4a85ecd3",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T05:04:59.231Z",
      "updatedAt": "2025-08-19T05:04:59.231Z",
      "__v": 0
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10
}
```

---

### POST /reports

- Mô tả: Tạo báo cáo mới
- Trạng thái: 201
- Kết quả: Thành công ✅

**Request Body:**

```json
{
  "userId": "65f2e7d4e52b8b9d1e8b4567",
  "title": "Báo cáo lỗi",
  "content": "Mô tả chi tiết về lỗi gặp phải"
}
```

**Response:**

```json
{
  "userId": "65f2e7d4e52b8b9d1e8b4567",
  "title": "Báo cáo lỗi",
  "content": "Mô tả chi tiết về lỗi gặp phải",
  "status": "pending",
  "participants": [],
  "_id": "68a57ecf559dcfe17755c98d",
  "createdAt": "2025-08-20T07:52:47.894Z",
  "updatedAt": "2025-08-20T07:52:47.894Z",
  "__v": 0
}
```

---

### GET /reports/user/65f2e7d4e52b8b9d1e8b4567

- Mô tả: Lấy danh sách báo cáo của người dùng
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "data": [
    {
      "_id": "68a4017fa97df7ab4a85ea8f",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "resolved",
      "participants": [],
      "createdAt": "2025-08-19T04:45:51.856Z",
      "updatedAt": "2025-08-19T13:11:56.976Z",
      "__v": 0,
      "assignedTo": null,
      "resolution": "Đã xử lý lỗi thành công",
      "resolvedAt": "2025-08-19T13:11:56.976Z"
    },
    {
      "_id": "68a40234a97df7ab4a85eacf",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:48:52.053Z",
      "updatedAt": "2025-08-19T04:48:52.053Z",
      "__v": 0
    },
    {
      "_id": "68a402aaa97df7ab4a85eb0d",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:50:50.946Z",
      "updatedAt": "2025-08-19T04:50:50.946Z",
      "__v": 0
    },
    {
      "_id": "68a40323a97df7ab4a85eb4d",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:52:51.671Z",
      "updatedAt": "2025-08-19T04:52:51.671Z",
      "__v": 0
    },
    {
      "_id": "68a403d2a97df7ab4a85eb8c",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:55:46.244Z",
      "updatedAt": "2025-08-19T04:55:46.244Z",
      "__v": 0
    },
    {
      "_id": "68a40414a97df7ab4a85ebcd",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:56:52.455Z",
      "updatedAt": "2025-08-19T04:56:52.455Z",
      "__v": 0
    },
    {
      "_id": "68a40486a97df7ab4a85ec10",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T04:58:46.144Z",
      "updatedAt": "2025-08-19T04:58:46.144Z",
      "__v": 0
    },
    {
      "_id": "68a40513a97df7ab4a85ec51",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T05:01:07.061Z",
      "updatedAt": "2025-08-19T05:01:07.061Z",
      "__v": 0
    },
    {
      "_id": "68a4055ca97df7ab4a85ec92",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T05:02:20.574Z",
      "updatedAt": "2025-08-19T05:02:20.574Z",
      "__v": 0
    },
    {
      "_id": "68a405fba97df7ab4a85ecd3",
      "userId": "65f2e7d4e52b8b9d1e8b4567",
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "pending",
      "participants": [],
      "createdAt": "2025-08-19T05:04:59.231Z",
      "updatedAt": "2025-08-19T05:04:59.231Z",
      "__v": 0
    }
  ],
  "total": 46,
  "page": 1,
  "limit": 10
}
```

---

### GET /reports/assignee/65f2e7d4e52b8b9d1e8b4568

- Mô tả: Lấy danh sách báo cáo được giao cho người dùng
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "data": [
    {
      "_id": "68a4017fa97df7ab4a85ea8f",
      "userId": null,
      "title": "Báo cáo lỗi",
      "content": "Mô tả chi tiết về lỗi gặp phải",
      "status": "resolved",
      "participants": [],
      "createdAt": "2025-08-19T04:45:51.856Z",
      "updatedAt": "2025-08-19T13:11:56.976Z",
      "__v": 0,
      "assignedTo": "65f2e7d4e52b8b9d1e8b4568",
      "resolution": "Đã xử lý lỗi thành công",
      "resolvedAt": "2025-08-19T13:11:56.976Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

### PATCH /reports/68a4017fa97df7ab4a85ea8f/assign/65f2e7d4e52b8b9d1e8b4568

- Mô tả: Giao báo cáo cho người dùng
- Trạng thái: 200
- Kết quả: Thành công ✅

**Response:**

```json
{
  "_id": "68a4017fa97df7ab4a85ea8f",
  "userId": "65f2e7d4e52b8b9d1e8b4567",
  "title": "Báo cáo lỗi",
  "content": "Mô tả chi tiết về lỗi gặp phải",
  "status": "in_progress",
  "participants": [],
  "createdAt": "2025-08-19T04:45:51.856Z",
  "updatedAt": "2025-08-20T07:52:48.203Z",
  "__v": 0,
  "assignedTo": "65f2e7d4e52b8b9d1e8b4568",
  "resolution": "Đã xử lý lỗi thành công",
  "resolvedAt": "2025-08-19T13:11:56.976Z"
}
```

---

### PATCH /reports/68a4017fa97df7ab4a85ea8f/resolve

- Mô tả: Giải quyết báo cáo
- Trạng thái: 200
- Kết quả: Thành công ✅

**Request Body:**

```json
{
  "resolution": "Đã xử lý lỗi thành công"
}
```

**Response:**

```json
{
  "_id": "68a4017fa97df7ab4a85ea8f",
  "userId": "65f2e7d4e52b8b9d1e8b4567",
  "title": "Báo cáo lỗi",
  "content": "Mô tả chi tiết về lỗi gặp phải",
  "status": "resolved",
  "participants": [],
  "createdAt": "2025-08-19T04:45:51.856Z",
  "updatedAt": "2025-08-20T07:52:48.271Z",
  "__v": 0,
  "assignedTo": "65f2e7d4e52b8b9d1e8b4568",
  "resolution": "Đã xử lý lỗi thành công",
  "resolvedAt": "2025-08-20T07:52:48.270Z"
}
```

---

