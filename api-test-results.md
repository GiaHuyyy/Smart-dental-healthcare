# Kết quả kiểm thử API

Thời gian kiểm thử: 8/19/2025, 10:31:46 PM

## Tổng quan

- Tổng số API: 4
- Thành công: 3
- Thất bại: 1

## Chi tiết kết quả

### Appointments

| API | Phương thức | Mô tả | Trạng thái | Kết quả |
|-----|------------|------|-----------|---------|
| /appointments | GET | Lấy danh sách lịch hẹn | 200 | ✅ Thành công |
| /appointments | POST | Tạo lịch hẹn mới | 400 | ❌ Thất bại |
| /appointments/doctor/68a45f205e91c64efc53005b | GET | Lấy danh sách lịch hẹn của bác sĩ | 200 | ✅ Thành công |
| /appointments/patient/68a4294faee99e31432653fd | GET | Lấy danh sách lịch hẹn của bệnh nhân | 200 | ✅ Thành công |

## Chi tiết Response

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

