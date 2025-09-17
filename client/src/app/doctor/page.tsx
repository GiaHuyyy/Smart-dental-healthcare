import { Users, Check, Clock, Pill, Calendar, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DoctorDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển bác sĩ</h1>
          <p className="text-gray-600 mt-1">Tổng quan hoạt động và lịch khám hôm nay</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary-filled px-4 py-2 rounded-lg">Thêm lịch</button>
          <button className="btn-primary-outline px-3 py-2 rounded-lg">Tạo đơn thuốc</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Users className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Bệnh nhân hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <div className="text-sm text-gray-500 mt-1">Lượt khám đã lên lịch</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Check className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Đã khám
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <div className="text-sm text-gray-500 mt-1">Ca đã hoàn thành</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Clock className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Đang chờ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
            <div className="text-sm text-gray-500 mt-1">Bệnh nhân đang chờ</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary-100 rounded-md">
                <Pill className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              Đơn thuốc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <div className="text-sm text-gray-500 mt-1">Đơn đang chờ xử lý</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch khám hôm nay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-4 p-3 rounded-md bg-gray-50">
                  <div className="p-3 bg-primary-100 rounded-md">
                    <Calendar className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <div className="font-medium">Nguyễn Văn A</div>
                    <div className="text-sm text-gray-500">09:00 - Khám định kỳ</div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-md bg-white shadow-sm">
                  <div className="p-3 bg-primary-100 rounded-md">
                    <Calendar className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <div className="font-medium">Trần Thị B</div>
                    <div className="text-sm text-gray-500">10:00 - Nhổ răng</div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 rounded-md bg-gray-50">
                  <div className="p-3 bg-primary-100 rounded-md">
                    <Calendar className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <div className="font-medium">Lê Văn C</div>
                    <div className="text-sm text-gray-500">11:00 - Tẩy trắng răng</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Hoàn thành điều trị Nguyễn Văn A</div>
                    <div className="text-sm text-gray-500">09:30 - Khám định kỳ</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Kê đơn thuốc Phạm Thị D</div>
                    <div className="text-sm text-gray-500">08:45 - Viêm nướu</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tin nhắn mới</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-100 rounded-md">
                    <MessageSquare className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <div className="font-medium">Bệnh nhân: Nguyễn Thị X</div>
                    <div className="text-sm text-gray-500">Yêu cầu tư vấn</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
