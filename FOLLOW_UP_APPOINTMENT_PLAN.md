Tóm tắt các thay đổi để implement flow lịch tái khám:

## 1. ✅ Đã hoàn thành:

- Sửa Voucher API response (wrap với success/data/message)
- Thêm status mới: `PENDING_PATIENT_CONFIRMATION`
- Thêm fields vào Appointment schema:
  - isFollowUpSuggestion: boolean
  - suggestedFollowUpDate: Date
  - suggestedFollowUpTime: string

## 2. Cần implement tiếp:

### Backend:

1. **API tạo đề xuất lịch tái khám** (POST /appointments/suggest-follow-up)

   - Input: patientId, suggestedDate, suggestedTime, appointmentType, notes
   - Tạo appointment với status=`pending_patient_confirmation`, isFollowUpSuggestion=true, followUpDiscount=5
   - Gửi notification + email cho bệnh nhân
   - Response: appointment object

2. **API bệnh nhân xác nhận lịch tái khám** (POST /appointments/:id/confirm-follow-up)

   - Input: appointmentId, finalDate, finalTime
   - Cập nhật appointment: status=`pending_payment`, appointmentDate, startTime, endTime
   - Áp dụng giảm giá 5% vào consultationFee
   - Gửi notification cho bác sĩ
   - Response: updated appointment

3. **API bệnh nhân từ chối lịch tái khám** (POST /appointments/:id/reject-follow-up)
   - Cập nhật status=`cancelled`, cancelledBy='patient', cancellationReason='Bệnh nhân từ chối lịch tái khám'
   - Gửi notification cho bác sĩ

### Frontend:

4. **Doctor side - Nút "Tái khám" trong modal bệnh nhân**

   - Modal chọn ngày/giờ đề xuất + appointment type + notes
   - Call API suggest-follow-up
   - Toast success + refresh

5. **Patient side - Tab "Lịch tái khám" trong my-appointments**

   - Filter appointments với isFollowUpSuggestion=true && status=pending_patient_confirmation
   - Hiển thị cards với:
     - Thông tin bác sĩ đề xuất
     - Ngày giờ đề xuất (nếu có)
     - Giảm giá 5%
     - 3 nút: "Lên lịch tái khám", "Từ chối", "Chi tiết"

6. **Modal "Lên lịch tái khám"**

   - TimeSlotPicker component để chọn ngày/giờ
   - Hiển thị giá đã giảm 5%
   - Nút "Xác nhận đặt lịch tái khám"
   - Call API confirm-follow-up

7. **Notification & Email templates**
   - Template cho đề xuất lịch tái khám (gửi bệnh nhân)
   - Template cho xác nhận lịch tái khám (gửi bác sĩ)
   - Template cho từ chối lịch tái khám (gửi bác sĩ)

## 3. Flow hoàn chỉnh:

1. Bác sĩ bấm "Tái khám" → chọn ngày giờ đề xuất → tạo appointment (pending_patient_confirmation)
2. Bệnh nhân nhận notification + email
3. Bệnh nhân vào tab "Lịch tái khám" → thấy đề xuất
4. Bệnh nhân bấm "Lên lịch tái khám" → chọn ngày giờ cuối cùng → xác nhận
5. Appointment chuyển sang pending_payment với giá giảm 5%
6. Bác sĩ nhận notification → lịch hiện trên calendar
7. Bệnh nhân thanh toán → confirmed → hiện trên calendar bác sĩ

Bắt đầu implement từ backend API endpoints.
