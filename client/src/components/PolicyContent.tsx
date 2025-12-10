// @/components/policy-content.tsx (hoặc đặt ở đâu bạn muốn)
import React from "react";

// Component con để style các mục chính sách
const PolicySection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    <div className="space-y-4 text-gray-700">{children}</div>
  </section>
);

// Component con để style các trường hợp
const PolicyCase = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h4 className="font-medium text-gray-700">{title}</h4>
    <div className="pl-4 border-l-2 border-gray-200 space-y-2">{children}</div>
  </div>
);

// Component con để style các ghi chú quan trọng
const PolicyNote = ({ children }: { children: React.ReactNode }) => (
  <div className="p-3 border-l-4 rounded-r-md border-yellow-500 bg-yellow-50">
    <p className="text-sm text-yellow-800">{children}</p>
  </div>
);

export function PolicyContent() {
  return (
    <div className="text-sm leading-relaxed space-y-8">
      <p className="text-base text-center text-gray-600">
        Nhằm đảm bảo chất lượng dịch vụ, tối ưu hóa thời gian chờ đợi cho Bệnh nhân và lịch làm việc của Bác sĩ, chúng
        tôi ban hành các quy định về việc đặt và quản lý lịch hẹn trực tuyến như sau:
      </p>

      {/* PHẦN 1 */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-center text-[#00a6f4] border-b pb-2">
          PHẦN 1: QUY ĐỊNH DÀNH CHO BỆNH NHÂN
        </h2>

        <PolicySection title="1.1. Đặt lịch hẹn mới">
          <p>
            Để đảm bảo công tác chuẩn bị được chu đáo, Bệnh nhân vui lòng đặt lịch hẹn{" "}
            <strong className="text-gray-900">trước giờ khám dự kiến ít nhất 1 giờ (60 phút)</strong>.
          </p>
          <p>
            Hệ thống sẽ không hiển thị các khung giờ còn trống nếu thời điểm đặt lịch ít hơn 1 giờ so với thời điểm
            khám.
          </p>
        </PolicySection>

        <PolicySection title="1.2. Đổi lịch hẹn (Reschedule)">
          <PolicyCase title="Đổi lịch hợp lệ (Trước 30 phút):">
            <p>
              Bệnh nhân được phép thay đổi ngày/giờ hẹn <strong className="text-green-600">miễn phí</strong> nếu thao
              tác được thực hiện <strong className="text-gray-900">trước giờ hẹn ban đầu ít nhất 30 phút</strong>.
            </p>
          </PolicyCase>
          <PolicyCase title="Đổi lịch cận giờ (Trong vòng 30 phút):">
            <p>
              Nếu Bệnh nhân thao tác đổi lịch <strong className="text-gray-900">trong vòng 30 phút</strong> trước giờ
              hẹn, hệ thống sẽ hiển thị cảnh báo "Đổi lịch cận giờ".
            </p>
            <p>
              Nếu Bệnh nhân xác nhận tiếp tục, một <strong className="text-red-600">phí giữ chỗ 50.000 VNĐ</strong> sẽ
              được áp dụng.
            </p>
            <p>Phí giữ chỗ sẽ được ghi nhận vào hệ thống sau khi Bệnh nhân hoàn tất việc xác nhận lịch hẹn mới.</p>
          </PolicyCase>
        </PolicySection>

        <PolicySection title="1.3. Hủy lịch hẹn (Cancel)">
          <p>
            Quy định hủy lịch áp dụng cho tất cả các lịch hẹn, bao gồm cả lịch ở trạng thái "Chờ xác nhận" và "Đã xác
            nhận".
          </p>
          <PolicyCase title="Hủy lịch hợp lệ (Trước 30 phút):">
            <p>
              Bệnh nhân hủy lịch hẹn <strong className="text-gray-900">trước giờ hẹn ban đầu ít nhất 30 phút</strong>.
            </p>
            <p>
              Việc hủy lịch là hoàn toàn <strong className="text-green-600">miễn phí</strong>.
            </p>
            <p>
              Trường hợp Bệnh nhân đã thanh toán phí khám, Bệnh nhân sẽ được{" "}
              <strong className="text-green-600">hoàn lại 100%</strong> số tiền đã thanh toán.
            </p>
          </PolicyCase>
          <PolicyCase title="Hủy lịch cận giờ (Trong vòng 30 phút):">
            <p>
              Nếu Bệnh nhân hủy lịch <strong className="text-gray-900">trong vòng 30 phút</strong> trước giờ hẹn, hệ
              thống sẽ hiển thị cảnh báo "Hủy lịch cận giờ".
            </p>
            <p>
              Nếu Bệnh nhân xác nhận hủy, một <strong className="text-red-600">phí giữ chỗ 50.000 VNĐ</strong> sẽ được
              áp dụng (bị trừ).
            </p>
            <p>
              Trường hợp Bệnh nhân đã thanh toán phí khám, Bệnh nhân vẫn được{" "}
              <strong className="text-green-600">hoàn lại 100% phí khám</strong>.
            </p>
            <PolicyNote>
              Lưu ý: Khoản hoàn 100% phí khám{" "}
              <strong className="text-yellow-900">không bao gồm 50.000 VNĐ phí giữ chỗ</strong> đã bị trừ.
            </PolicyNote>
          </PolicyCase>
        </PolicySection>

        <PolicySection title="1.4. Lịch Tái khám (Follow-up)">
          <p>
            Sau khi kết thúc điều trị, Bác sĩ có thể tạo một <strong className="text-gray-900">đề xuất</strong> lịch tái
            khám dựa trên kế hoạch điều trị.
          </p>
          <p>
            Đề xuất này sẽ được gửi thông báo và hiển thị trong mục{" "}
            <strong className="text-gray-900">"Lịch tái khám"</strong> trên tài khoản của Bệnh nhân (với các tùy chọn
            [Từ chối] hoặc [Lên lịch tái khám]).
          </p>
          <p>
            Khi Bệnh nhân chọn [Lên lịch tái khám], Bệnh nhân sẽ chủ động chọn ngày giờ phù hợp và được hưởng{" "}
            <strong className="text-green-600">ưu đãi giảm 5%</strong> chi phí cho lần tái khám này.
          </p>
        </PolicySection>
      </section>

      {/* PHẦN 2 */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-center text-[#00a6f4] border-b pb-2">
          PHẦN 2: QUY ĐỊNH TỪ PHÍA BÁC SĨ & PHÒNG KHÁM
        </h2>

        <PolicySection title="2.1. Hủy lịch hẹn (Do Bác sĩ/Phòng khám)">
          <PolicyCase title="Trường hợp 1: Lý do đột xuất từ Phòng khám">
            <p>
              Nếu Phòng khám/Bác sĩ phải hủy lịch vì lý do bất khả kháng (Bác sĩ ốm, sự cố thiết bị, mất điện...), Bệnh
              nhân sẽ được thông báo ngay lập tức.
            </p>
            <p>
              <strong className="text-gray-900">Chính sách hỗ trợ:</strong> Bệnh nhân được{" "}
              <strong className="text-green-600">hoàn 100%</strong> phí đã thanh toán (nếu có) VÀ nhận một{" "}
              <strong className="text-green-600">Voucher giảm 5%</strong> cho lần đặt lịch tiếp theo.
            </p>
          </PolicyCase>
          <PolicyCase title="Trường hợp 2: Bệnh nhân đến trễ">
            <p>
              Nếu Bệnh nhân <strong className="text-gray-900">đến trễ quá 15 phút</strong> so với giờ hẹn, Bác sĩ có
              quyền hủy lịch hẹn để không ảnh hưởng đến các Bệnh nhân kế tiếp.
            </p>
            <p>
              <strong className="text-gray-900">Chính sách xử lý:</strong> Lịch hẹn bị hủy và Bệnh nhân bị áp dụng{" "}
              <strong className="text-red-600">phí giữ chỗ 50.000 VNĐ</strong>.
            </p>
            <p>
              Nếu Bệnh nhân đã thanh toán phí khám, Bệnh nhân được{" "}
              <strong className="text-green-600">hoàn 100% phí khám</strong>.
            </p>
            <PolicyNote>
              Khoản hoàn 100% phí khám <strong className="text-yellow-900">không bao gồm 50.000 VNĐ phí giữ chỗ</strong>{" "}
              đã bị trừ.
            </PolicyNote>
          </PolicyCase>
        </PolicySection>

        <PolicySection title="2.2. Lên lịch Tái khám (Phía Bác sĩ)">
          <p>
            Các lịch tái khám do Bác sĩ tạo là các <strong className="text-gray-900">đề xuất</strong> và sẽ hiển thị ở
            trạng thái "Chờ xác nhận" (chưa chính thức chiếm chỗ trên lịch làm việc của Bác sĩ).
          </p>
          <p>
            Lịch tái khám <strong className="text-gray-900">chỉ trở thành chính thức</strong> sau khi Bệnh nhân xác nhận
            [Lên lịch tái khám] như mô tả ở Mục 1.4.
          </p>
        </PolicySection>
      </section>

      {/* PHẦN 3 */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-center text-[#00a6f4] border-b pb-2">PHẦN 3: QUY ĐỊNH VỀ THÔNG BÁO</h2>
        <p className="text-center text-base text-gray-700">
          Để đảm bảo tính minh bạch, <strong className="text-gray-900">tất cả các hành động</strong> liên quan đến lịch
          hẹn (Đặt, Đổi, Hủy, Đề xuất tái khám, Xác nhận tái khám...) đều sẽ được hệ thống gửi{" "}
          <strong className="text-gray-900">thông báo ngay lập tức (realtime)</strong> và{" "}
          <strong className="text-gray-900">gửi Email xác nhận</strong> đến các bên liên quan (Bệnh nhân và Bác sĩ).
        </p>
      </section>
    </div>
  );
}
