"use client";

import {
  Calendar,
  Check,
  Clock,
  Activity,
  Heart,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  FileText,
  Thermometer,
  Eye,
  Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import patientDashboardService, { PatientDashboardStats, RecentActivity } from "@/services/patientDashboardService";

export default function PatientDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState<PatientDashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const userId = (session?.user as { _id?: string })._id;
      const accessToken = (session as { accessToken?: string })?.accessToken;

      if (!userId) {
        console.log("No user ID found");
        return;
      }

      // Fetch stats
      const statsResult = await patientDashboardService.getPatientDashboardStats(userId, accessToken);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }

      // Fetch activities
      const activitiesResult = await patientDashboardService.getRecentActivities(userId, accessToken);
      if (activitiesResult.success && activitiesResult.data) {
        setActivities(activitiesResult.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
              <p className="text-sm text-gray-500 mt-1">Theo dõi sức khỏe răng miệng của bạn</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/patient/appointments")}
                className="btn-healthcare-primary flex items-center gap-2 px-4 py-2"
              >
                <Calendar className="w-4 h-4" />
                Đặt lịch hẹn
              </button>
              <button
                onClick={() => router.push("/patient/doctors")}
                className="btn-healthcare-secondary flex items-center gap-2 px-4 py-2"
              >
                <MessageSquare className="w-4 h-4" />
                Liên hệ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards - Horizontal Layout (giống Doctor Dashboard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Lịch hẹn tiếp theo */}
          <div
            onClick={() => {
              if (stats?.nextAppointment?.id) {
                router.push(`/patient/appointments/my-appointments?appointmentId=${stats.nextAppointment.id}`);
              } else {
                router.push("/patient/appointments/my-appointments");
              }
            }}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <Calendar className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Lịch hẹn tiếp theo</p>
                {loading ? (
                  <div className="h-16 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : stats?.nextAppointment ? (
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-gray-900">{stats.nextAppointment.date}</h3>
                    <p className="text-xs text-gray-600">
                      {stats.nextAppointment.time} - {stats.nextAppointment.doctor}
                    </p>
                    <p className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>
                      {stats.nextAppointment.type}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có lịch hẹn</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Lần khám hoàn thành */}
          <div
            onClick={() => router.push("/patient/appointments/my-appointments")}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <Check className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Lần khám hoàn thành</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : stats?.completedAppointments || 0}
                  </h3>
                  {!loading && stats && stats.completedGrowth > 0 && (
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: "#10B98120", color: "#10B981" }}
                    >
                      <TrendingUp className="w-3 h-3" />+{stats.completedGrowth} tháng này
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Cần theo dõi */}
          <div
            onClick={() => router.push("/patient/appointments/my-appointments?filter=follow-up")}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#FEF3C7" }}
              >
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Cần theo dõi</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{loading ? "..." : stats?.followUpRequired || 0}</h3>
                  {!loading && stats && stats.followUpRequired > 0 && (
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: "#FEF3C7", color: "#F59E0B" }}
                    >
                      Yêu cầu tái khám
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Sức khỏe răng miệng */}
          <div
            onClick={() => router.push("/patient/medical-records")}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <Heart className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Sức khỏe răng miệng</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : `${stats?.oralHealthScore || 74}%`}
                  </h3>
                  <div
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: "#10B98120", color: "#10B981" }}
                  >
                    Tình trạng tốt
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activities & Records */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activities */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                Hoạt động gần đây
              </h3>
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const IconComponent =
                      activity.icon === "check" ? Check : activity.icon === "clock" ? Clock : FileText;
                    const statusColors =
                      activity.status === "completed"
                        ? { bg: "bg-green-100", text: "text-green-800", label: "Hoàn thành" }
                        : activity.status === "pending"
                        ? { bg: "bg-blue-100", text: "text-blue-800", label: "Đang xử lý" }
                        : { bg: "bg-yellow-100", text: "text-yellow-800", label: "Cần xem" };

                    return (
                      <div
                        key={activity._id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "var(--color-primary-50)" }}
                        >
                          <IconComponent className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{activity.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                            >
                              {statusColors.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vital Signs & Health Metrics */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Stethoscope className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                Chỉ số sức khỏe
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                  <Thermometer className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                  <div className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
                    36.5°C
                  </div>
                  <div className="text-sm text-gray-600">Nhiệt độ</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                  <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                  <div className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
                    72 BPM
                  </div>
                  <div className="text-sm text-gray-600">Nhịp tim</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                  <Eye className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                  <div className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
                    95%
                  </div>
                  <div className="text-sm text-gray-600">SpO2</div>
                </div>
              </div>
            </div>

            {/* Medical Records */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                Hồ sơ và Báo cáo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="font-medium text-gray-900">Hồ sơ khám gần nhất</div>
                  <div className="text-sm text-gray-600 mt-1">10/12/2023 — Phục hồi răng số 6</div>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Hoàn thành
                    </span>
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="font-medium text-gray-900">Sơ đồ răng</div>
                  <div className="text-sm text-gray-600 mt-1">32 răng — 4 răng đã điều trị</div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Tình trạng</span>
                      <span className="font-medium text-green-600">87%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: "87%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Reminders & Quick Actions */}
          <div className="space-y-6">
            {/* Care Reminders */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                Nhắc nhở chăm sóc
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">Đánh răng sau bữa ăn</div>
                    <div className="text-xs text-gray-600 mt-1">Đã 3 giờ kể từ bữa trưa</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">Uống thuốc kháng sinh</div>
                    <div className="text-xs text-gray-600 mt-1">Đã hoàn thành hôm nay</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">Tái khám định kỳ</div>
                    <div className="text-xs text-gray-600 mt-1">Còn 5 ngày nữa</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Health Trends */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                Xu hướng sức khỏe
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Vệ sinh răng miệng</span>
                    <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                      ↗ +5%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: "85%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Tuân thủ điều trị</span>
                    <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                      ↗ +2%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: "92%", backgroundColor: "var(--color-primary)" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
