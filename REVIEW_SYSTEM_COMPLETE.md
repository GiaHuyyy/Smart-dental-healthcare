# Review System Enhancement - Complete Implementation

## ✅ HOÀN THÀNH TẤT CẢ CÁC YÊU CẦU

### 📋 Tóm tắt các tính năng đã implement:

1. **✅ Kiểm tra trạng thái đánh giá**

   - Tự động check xem appointment đã được đánh giá chưa
   - Lưu trữ thông tin review trong state `appointmentReviews`

2. **✅ Hiển thị nút thông minh**

   - **Chưa đánh giá**: Hiển thị nút "Đánh giá" (màu vàng, icon star rỗng)
   - **Đã đánh giá**: Hiển thị nút "Xem đánh giá" (màu xanh, icon star đầy)

3. **✅ Navigation đến trang bác sĩ**

   - Click "Xem đánh giá" → Chuyển đến `/patient/doctors/${doctorId}`
   - Tự động scroll và highlight review của bệnh nhân
   - Animation ring xung quanh review được highlight (3 giây)

4. **✅ Chỉnh sửa đánh giá**

   - Hiển thị nút "Sửa" trên review của chính mình
   - Mở ReviewModal với dữ liệu có sẵn
   - Hiển thị cảnh báo: "⚠️ Một khi đã gửi chỉnh sửa, bạn sẽ không thể sửa lại lần nữa"
   - Chỉ cho phép sửa **1 lần duy nhất**

5. **✅ Backend validation**
   - Kiểm tra `editCount` trong database
   - Reject nếu đã sửa >= 1 lần
   - Tự động tăng `editCount` và set `editedAt` khi update

---

## 📂 CÁC FILE ĐÃ THAY ĐỔI

### Frontend - Client

#### 1. **my-appointments/page.tsx** (Updated)

**Chức năng mới:**

- State `appointmentReviews`: Lưu map appointment → review data
- Function `checkAppointmentReviews()`: Check review cho completed appointments
- Function `handleViewReview()`: Navigate đến doctor page với query params
- Conditional button rendering: "Đánh giá" vs "Xem đánh giá"
- Fixed `access_token` thay vì `accessToken`

**Key Changes:**

```typescript
// State
const [appointmentReviews, setAppointmentReviews] = useState<
  Record<string, { _id: string; rating: number; comment: string } | null>
>({});

// Check reviews on load
useEffect(() => {
  if (result.data && result.data.length > 0) {
    checkAppointmentReviews(result.data, userId, accessToken);
  }
}, [appointments]);

// Conditional rendering
{
  appointment._id && appointmentReviews[appointment._id] ? (
    <button onClick={() => handleViewReview(appointment)}>
      <Star className="fill-blue-500" />
      Xem đánh giá
    </button>
  ) : (
    <button onClick={() => handleOpenReviewModal(appointment)}>
      <Star />
      Đánh giá
    </button>
  );
}
```

#### 2. **doctors/[id]/page.tsx** (Updated)

**Chức năng mới:**

- Import `useSearchParams`, `useRef`, `useSession`, `toast`, `ReviewModal`
- State `editingReview`, `editModalOpen`
- Ref `reviewRefs` để scroll đến review
- Function `handleEditReview()`: Mở modal sửa review
- Function `handleSubmitEditReview()`: Gọi PATCH API
- Function `canEditReview()`: Kiểm tra quyền sửa
- Auto-scroll và highlight review khi có query param
- Hiển thị nút "Sửa" cho review của user
- Hiển thị "(đã chỉnh sửa)" nếu có `editedAt`

**Key Changes:**

```typescript
// Highlight review on mount
useEffect(() => {
  const highlightReview = searchParams?.get("highlightReview");
  if (highlightReview === "true" && reviews.length > 0) {
    const targetReview = reviews.find((r) => r.patientId?._id === userId);
    if (targetReview && reviewRefs.current[targetReview._id]) {
      setTimeout(() => {
        reviewRefs.current[targetReview._id]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");
      }, 500);
    }
  }
}, [reviews, searchParams]);

// Review card with edit button
<div
  ref={(el) => {
    reviewRefs.current[review._id] = el;
  }}
>
  {canEditReview(review) && (
    <button onClick={() => handleEditReview(review)}>
      <Edit2 /> Sửa
    </button>
  )}
  {review.editedAt && <span>(đã chỉnh sửa)</span>}
</div>;
```

#### 3. **ReviewModal.tsx** (Updated)

**Props mới:**

- `initialRating?: number` - Rating ban đầu (cho edit mode)
- `initialComment?: string` - Comment ban đầu (cho edit mode)
- `isEditing?: boolean` - Flag để biết đang edit hay tạo mới
- `warningMessage?: string` - Cảnh báo cho edit mode

**UI Changes:**

- Header title thay đổi: "Đánh giá bác sĩ" vs "Chỉnh sửa đánh giá"
- Hiển thị warning box màu amber khi `isEditing && warningMessage`
- Button text: "Gửi đánh giá" vs "Cập nhật đánh giá"
- Loading text: "Đang gửi..." vs "Đang cập nhật..."

#### 4. **API Routes** (New/Updated)

**New: `/api/reviews/patient/[patientId]/appointment/[appointmentId]/route.ts`**

- GET: Kiểm tra review của patient cho appointment cụ thể
- Proxy đến backend endpoint

**New: `/api/reviews/[id]/route.ts`**

- PATCH: Cập nhật review
- Forward request đến NestJS backend

---

### Backend - Server

#### 1. **reviews.controller.ts** (Updated)

**Endpoint mới:**

```typescript
@Get('patient/:patientId/appointment/:appointmentId')
@Public()
findByPatientAndAppointment(
  @Param('patientId') patientId: string,
  @Param('appointmentId') appointmentId: string,
)
```

#### 2. **reviews.service.ts** (Updated)

**Method mới:**

```typescript
async findByPatientAndAppointment(
  patientId: string,
  appointmentId: string,
): Promise<{ data: Review | null }> {
  const review = await this.reviewModel.findOne({
    patientId: new mongoose.Types.ObjectId(patientId),
    refId: new mongoose.Types.ObjectId(appointmentId),
    refModel: 'Appointment',
  });
  return { data: review };
}
```

**Method updated:**

```typescript
async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
  // Check current edit count
  const currentReview = await this.reviewModel.findById(id);
  const editCount = currentReview.editCount || 0;

  // Validate: only allow 1 edit
  if (editCount >= 1) {
    throw new BadRequestException(
      'Bạn đã chỉnh sửa đánh giá này rồi. Mỗi đánh giá chỉ được phép sửa một lần.'
    );
  }

  // Update with edit tracking
  return await this.reviewModel.findByIdAndUpdate(id, {
    $set: { ...updateReviewDto, editedAt: new Date() },
    $inc: { editCount: 1 },
  }, { new: true });
}
```

#### 3. **review.schemas.ts** (Updated)

**Fields mới:**

```typescript
@Prop({ type: Number, default: 0 })
editCount: number;

@Prop({ type: Date })
editedAt: Date;
```

---

## 🔄 FLOW HOẠT ĐỘNG

### Flow 1: Xem đánh giá đã có

```
1. User vào "Lịch hẹn của tôi"
2. System gọi checkAppointmentReviews() → Load tất cả reviews
3. appointmentReviews state được update
4. UI render button "Xem đánh giá" (màu xanh)
5. User click "Xem đánh giá"
6. Navigate to /patient/doctors/${doctorId}?highlightReview=true&appointmentId=...
7. Doctor page load reviews
8. useEffect detect query params
9. Tìm review của user hiện tại
10. Scroll smooth đến review
11. Add ring animation (3 giây)
12. User thấy review của mình được highlight
```

### Flow 2: Sửa đánh giá

```
1. User ở trang doctor details, thấy review của mình
2. Check canEditReview() → editCount < 1 → Hiển thị nút "Sửa"
3. Click "Sửa"
4. ReviewModal open với:
   - initialRating = review.rating
   - initialComment = review.comment
   - isEditing = true
   - warningMessage = "⚠️ Một khi đã gửi..."
5. User chỉnh sửa rating/comment
6. Click "Cập nhật đánh giá"
7. Call PATCH /api/reviews/${reviewId}
8. Backend check editCount:
   - Nếu < 1: Allow update, increment editCount, set editedAt
   - Nếu >= 1: Return error 400
9. Success: Reload reviews, show toast
10. Review card now shows "(đã chỉnh sửa)"
11. Nút "Sửa" biến mất
12. Show text: "* Đánh giá này đã được chỉnh sửa và không thể sửa lại"
```

---

## 🎨 UI/UX IMPROVEMENTS

### Nút "Đánh giá" (Chưa review)

- 🎨 Border: `border-yellow-400`
- 🎨 Text: `text-yellow-600`
- 🎨 Background hover: `hover:bg-yellow-50`
- ⭐ Icon: `<Star />` (rỗng)

### Nút "Xem đánh giá" (Đã review)

- 🎨 Border: `border-blue-400`
- 🎨 Text: `text-blue-600`
- 🎨 Background hover: `hover:bg-blue-50`
- ⭐ Icon: `<Star className="fill-blue-500" />` (đầy)

### Review Card (Đã highlight)

- 🎯 Ring: `ring-2 ring-primary ring-offset-2`
- ⏱️ Duration: 3 seconds
- 🎬 Animation: Smooth scroll + ring fade out

### Edit Button

- 🖊️ Icon: `<Edit2 className="w-3.5 h-3.5" />`
- 🎨 Color: `text-primary hover:text-primary/80`
- 👁️ Visibility: Chỉ hiển thị cho review của user

### Warning Box (Edit Modal)

- 🎨 Border: `border-amber-200`
- 🎨 Background: `bg-amber-50`
- ⚠️ Icon: Warning triangle
- 📝 Text: "Một khi đã gửi chỉnh sửa, bạn sẽ không thể sửa lại lần nữa"

---

## 🧪 TESTING CHECKLIST

### Test Case 1: Review chưa tồn tại

- [ ] Vào "Lịch hẹn của tôi"
- [ ] Completed appointment hiển thị nút "Đánh giá" (vàng)
- [ ] Click → Modal mở
- [ ] Submit review → Success toast
- [ ] Refresh → Nút thay đổi thành "Xem đánh giá" (xanh)

### Test Case 2: Xem review

- [ ] Click "Xem đánh giá"
- [ ] Navigate đến doctor page
- [ ] Auto scroll đến review
- [ ] Review được highlight với ring xanh
- [ ] Ring biến mất sau 3 giây

### Test Case 3: Sửa review lần 1

- [ ] Ở doctor page, thấy nút "Sửa" trên review của mình
- [ ] Click "Sửa"
- [ ] Modal mở với data có sẵn
- [ ] Thấy warning box màu amber
- [ ] Sửa rating/comment
- [ ] Click "Cập nhật đánh giá"
- [ ] Success toast
- [ ] Review updated
- [ ] Có text "(đã chỉnh sửa)"

### Test Case 4: Cố sửa lần 2

- [ ] Click nút "Sửa" (không còn nữa vì editCount = 1)
- [ ] Review card hiển thị: "\* Đánh giá này đã được chỉnh sửa và không thể sửa lại"

### Test Case 5: Backend validation

- [ ] Dùng Postman gọi PATCH /api/v1/reviews/:id 2 lần
- [ ] Lần 1: Success (editCount = 1)
- [ ] Lần 2: Error 400 "Bạn đã chỉnh sửa đánh giá này rồi..."

---

## 📊 DATABASE SCHEMA CHANGES

### Review Collection - New Fields:

```javascript
{
  _id: ObjectId,
  patientId: ObjectId,
  doctorId: ObjectId,
  rating: Number (1-5),
  comment: String,
  refId: ObjectId (appointmentId),
  refModel: "Appointment",
  isVisible: Boolean,
  editCount: Number (default: 0),     // 🆕 NEW
  editedAt: Date,                      // 🆕 NEW
  createdAt: Date,
  updatedAt: Date,
}
```

### Index Recommendations:

```javascript
// Tìm review theo patient + appointment
db.reviews.createIndex({ patientId: 1, refId: 1, refModel: 1 });

// Tìm reviews của doctor
db.reviews.createIndex({ doctorId: 1, createdAt: -1 });
```

---

## 🚀 API ENDPOINTS SUMMARY

### Frontend API Routes (Next.js)

| Method | Endpoint                                                     | Description             |
| ------ | ------------------------------------------------------------ | ----------------------- |
| POST   | `/api/reviews`                                               | Tạo review mới          |
| GET    | `/api/reviews/doctor/:doctorId`                              | List reviews của doctor |
| GET    | `/api/reviews/doctor/:doctorId/rating`                       | Rating stats            |
| GET    | `/api/reviews/patient/:patientId/appointment/:appointmentId` | 🆕 Check review cụ thể  |
| PATCH  | `/api/reviews/:id`                                           | 🆕 Update review        |

### Backend API Routes (NestJS)

| Method | Endpoint                                                        | Description                     |
| ------ | --------------------------------------------------------------- | ------------------------------- |
| POST   | `/api/v1/reviews`                                               | Create review                   |
| GET    | `/api/v1/reviews`                                               | List all reviews                |
| GET    | `/api/v1/reviews/:id`                                           | Get one review                  |
| GET    | `/api/v1/reviews/doctor/:doctorId`                              | Reviews by doctor               |
| GET    | `/api/v1/reviews/patient/:patientId`                            | Reviews by patient              |
| GET    | `/api/v1/reviews/patient/:patientId/appointment/:appointmentId` | 🆕 Check specific               |
| GET    | `/api/v1/reviews/doctor/:doctorId/rating`                       | Rating stats                    |
| PATCH  | `/api/v1/reviews/:id`                                           | Update review (with validation) |
| DELETE | `/api/v1/reviews/:id`                                           | Delete review                   |

---

## 🔒 SECURITY & VALIDATION

### Frontend

- ✅ Check session before API calls
- ✅ Authorization header with Bearer token
- ✅ User ID validation: Only edit own reviews
- ✅ UI disabled states during loading

### Backend

- ✅ ObjectId validation
- ✅ Edit count check before update
- ✅ Timestamp tracking (editedAt)
- ✅ Error messages in Vietnamese
- ✅ BadRequestException for invalid operations

---

## 📝 GHI CHÚ QUAN TRỌNG

### Access Token Fix

Đã sửa tất cả `session.accessToken` thành `session.access_token` trong:

- `my-appointments/page.tsx`
- Tất cả API calls đều dùng đúng field name

### Edit Count Logic

- `editCount = 0`: Chưa sửa → Allow edit
- `editCount = 1`: Đã sửa 1 lần → Block edit
- Backend tự động increment khi PATCH success

### Highlight Review

- Dựa vào `userId` của session, không dùng `appointmentId`
- Vì response review list không có `refId` field
- Scroll đến review đầu tiên của user hiện tại

---

## ✅ COMPLETION STATUS

| Feature                 | Status  | Note                 |
| ----------------------- | ------- | -------------------- |
| Check review status     | ✅ Done | Auto-check on load   |
| Smart button display    | ✅ Done | Yellow vs Blue       |
| Navigate to doctor page | ✅ Done | With query params    |
| Highlight review        | ✅ Done | Auto scroll + ring   |
| Edit review UI          | ✅ Done | Modal with warning   |
| Edit review API         | ✅ Done | PATCH endpoint       |
| Backend validation      | ✅ Done | editCount check      |
| Schema update           | ✅ Done | editCount + editedAt |
| Error handling          | ✅ Done | Vietnamese messages  |
| Toast notifications     | ✅ Done | Success/Error        |

---

## 🎯 NEXT STEPS (Optional Enhancements)

1. **Pagination cho reviews** - Load more button
2. **Filter reviews** - Sort by rating, date
3. **Reply to reviews** - Bác sĩ trả lời review
4. **Report review** - Báo cáo review không phù hợp
5. **Review images** - Upload ảnh kèm review
6. **Review statistics** - Chart phân bố rating

---

## 📞 SUPPORT

Nếu có lỗi hoặc cần hỗ trợ:

1. Check console logs (Browser DevTools)
2. Check terminal logs (Backend server)
3. Verify database có fields mới (editCount, editedAt)
4. Check API response format

**Happy Coding! 🚀**
