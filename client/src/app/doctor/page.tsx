"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Calendar, DollarSign, FileText, TrendingUp, Loader2, AlertCircle, Check, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import doctorDashboardService, {
  TodayAppointment,
  DashboardStats,
  ChartDataPoint,
} from "@/services/doctorDashboardService";

export default function DoctorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true); // Loading cho cả trang (lần đầu)
  const [chartLoading, setChartLoading] = useState(true); // === THÊM MỚI: Loading cho chart
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Lấy tháng và năm hiện tại
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12

  // Cập nhật thời gian thực mỗi phút
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Cập nhật mỗi 1 phút

    return () => clearInterval(timer);
  }, []);

  // === SỬA: Load dashboard data (CHỈ STATS VÀ APPOINTMENTS) - Chạy 1 lần ===
  useEffect(() => {
    const loadDashboardData = async () => {
      if (session?.user?._id) {
        setLoading(true);
        setError(null);

        try {
          // Load stats và appointments song song (BỎ CHART RA KHỎI ĐÂY)
          const [statsResult, appointmentsResult] = await Promise.all([
            doctorDashboardService.getDashboardStats(session.user._id),
            doctorDashboardService.getTodayAppointments(session.user._id),
          ]);

          if (statsResult.success && statsResult.data) {
            setDashboardStats(statsResult.data);
            console.log("✅ Dashboard stats set:", statsResult.data);
          }

          if (appointmentsResult.success && appointmentsResult.data) {
            setTodayAppointments(appointmentsResult.data);
            console.log("✅ Today appointments set:", appointmentsResult.data.length, appointmentsResult.data);
          }

          if (!statsResult.success || !appointmentsResult.success) {
            setError(statsResult.error || appointmentsResult.error || "Không thể tải dữ liệu");
          }
        } catch (err) {
          setError("Có lỗi xảy ra khi tải dữ liệu");
          console.error("Load dashboard data error:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === "authenticated") {
      loadDashboardData();
    }
  }, [session, status]); // <-- SỬA: Bỏ selectedYear, selectedMonth khỏi dependency

  // === SỬA: Load chart data (RIÊNG BIỆT) ===
  useEffect(() => {
    const loadChartData = async () => {
      if (session?.user?._id) {
        setChartLoading(true);
        // Không set error chung, để tránh ảnh hưởng toàn trang
        // setError(null);

        try {
          const chartResult = await doctorDashboardService.getChartData(
            session.user._id,
            selectedYear,
            selectedMonth === 0 ? undefined : selectedMonth
          );

          if (chartResult.success && chartResult.data) {
            setChartData(chartResult.data);
            console.log("✅ Chart data set:", chartResult.data.length, chartResult.data);
          } else {
             // Có thể set lỗi riêng cho chart nếu muốn
             console.error("Chart error:", chartResult.error);
          }
        } catch (err) {
           console.error("Load chart data error:", err);
        } finally {
          setChartLoading(false);
        }
      }
    };

    if (status === "authenticated") {
        loadChartData();
    }
    // <-- SỬA: Phụ thuộc vào month, year, session
  }, [selectedYear, selectedMonth, session, status]);

  // Tạo time slots từ 08:00 đến 24:00 (mỗi 30 phút)
  // length: 33 -> 0 đến 32. i=0 là 8:00, i=32 là 24:00
  const timeSlots = Array.from({ length: 33 }, (_, i) => {
    const hour = 8 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session?.user?.role !== "doctor") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case "patients":
        router.push("/doctor/patients");
        break;
      case "schedule":
        router.push("/doctor/schedule");
        break;
      case "income":
        router.push("/doctor/finances");
        break;
      case "medical-records":
        router.push("/doctor/medical-records");
        break;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: "var(--color-primary)" }} />
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="healthcare-card-elevated p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="healthcare-heading mb-2">Có lỗi xảy ra</h2>
          <p className="healthcare-body text-gray-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-healthcare-primary">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards - Horizontal Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tổng bệnh nhân */}
          <div
            onClick={() => handleCardClick("patients")}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <Users className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Tổng bệnh nhân</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{dashboardStats?.totalPatients || 0}</h3>
                  {dashboardStats && dashboardStats.patientGrowth !== 0 && (
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: "#10B98120", color: "#10B981" }}
                    >
                      <TrendingUp className="w-3 h-3" />+{dashboardStats.patientGrowth}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Lịch hẹn */}
          <div
            onClick={() => handleCardClick("schedule")}
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
                <p className="text-xs text-gray-500 mb-1">Tổng lịch hẹn</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{dashboardStats?.totalAppointments || 0}</h3>
                  {dashboardStats && dashboardStats.appointmentGrowth !== 0 && (
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: dashboardStats.appointmentGrowth > 0 ? "#10B98120" : "#EF444420",
                        color: dashboardStats.appointmentGrowth > 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {dashboardStats.appointmentGrowth > 0 ? "+" : ""}
                      {dashboardStats.appointmentGrowth}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Doanh thu */}
          <div
            onClick={() => handleCardClick("income")}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <DollarSign className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Tổng doanh thu</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {formatCurrency(dashboardStats?.totalIncome || 0)}
                  </h3>
                  {dashboardStats && dashboardStats.incomeGrowth !== 0 && (
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: dashboardStats.incomeGrowth > 0 ? "#10B98120" : "#EF444420",
                        color: dashboardStats.incomeGrowth > 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {dashboardStats.incomeGrowth > 0 ? "+" : ""}
                      {dashboardStats.incomeGrowth}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Điều trị */}
          <div
            onClick={() => handleCardClick("medical-records")}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <FileText className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Tổng điều trị</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{dashboardStats?.totalTreatments || 0}</h3>
                  {dashboardStats && dashboardStats.treatmentGrowth !== 0 && (
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: dashboardStats.treatmentGrowth > 0 ? "#10B98120" : "#EF444420",
                        color: dashboardStats.treatmentGrowth > 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {dashboardStats.treatmentGrowth > 0 ? "+" : ""}
                      {dashboardStats.treatmentGrowth}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart và Appointment List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Biểu đồ Overview */}
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Overview</h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer"
                  style={{ minWidth: "120px" }}
                >
                  <option value={0}>Cả năm</option>
                  <option value={1}>Tháng 1</option>
                  <option value={2}>Tháng 2</option>
                  <option value={3}>Tháng 3</option>
                  <option value={4}>Tháng 4</option>
                  <option value={5}>Tháng 5</option>
                  <option value={6}>Tháng 6</option>
                  <option value={7}>Tháng 7</option>
                  <option value={8}>Tháng 8</option>
                  <option value={9}>Tháng 9</option>
                  <option value={10}>Tháng 10</option>
                  <option value={11}>Tháng 11</option>
                  <option value={12}>Tháng 12</option>
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer"
                  style={{ minWidth: "100px" }}
                >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--color-primary)" }}></div>
                <span className="text-sm text-gray-600">Lịch hẹn hoàn thành</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
                <span className="text-sm text-gray-600">Lịch hẹn hủy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-orange-400"></div>
                <span className="text-sm text-gray-600">Lịch hẹn chờ xử lý</span>
              </div>
            </div>

            {/* === SỬA: Thêm relative và loading overlay === */}
            <div className="relative h-[280px]">
              {chartLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg" style={{backgroundColor: "rgba(255, 255, 255, 0.7)"}}>
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} />
                  </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const monthNames = [
                          "Tháng 1",
                          "Tháng 2",
                          "Tháng 3",
                          "Tháng 4",
                          "Tháng 5",
                          "Tháng 6",
                          "Tháng 7",
                          "Tháng 8",
                          "Tháng 9",
                          "Tháng 10",
                          "Tháng 11",
                          "Tháng 12",
                        ];

                        // Xác định label dựa trên period format
                        const period = data.period;
                        let label = "";
                        if (period.startsWith("T")) {
                          // Format tháng: T1, T2, ...
                          label = `${period} ${selectedYear}`;
                        } else {
                          // Format ngày: 1, 2, ...
                          label = `${period} ${monthNames[selectedMonth - 1]} ${selectedYear}`;
                        }

                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                            <p className="text-xs text-gray-500 mb-2">{label}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: "var(--color-primary)" }}
                                  ></div>
                                  <span className="text-xs text-gray-600">Hoàn thành</span>
                                </div>
                                <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                                  {payload[0].value}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                  <span className="text-xs text-gray-600">Hủy</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-600">{payload[1].value}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                  <span className="text-xs text-gray-600">Chờ xử lý</span>
                                </div>
                                <span className="text-sm font-semibold text-orange-600">{payload[2].value}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hoanthanh"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: "var(--color-primary)", strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="huy"
                    stroke="#9ca3af"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: "#9ca3af", strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="choXuLy"
                    stroke="#fb923c"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: "#fb923c", strokeWidth: 2, stroke: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* === DANH SÁCH LỊCH HẸN (Không đổi) === */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Lịch hẹn hôm nay</h3>
              <button
                onClick={() => router.push("/doctor/schedule")}
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--color-primary)" }}
              >
                Xem tất cả
              </button>
            </div>

            {/* Sử dụng space-y-1 (4px) cho khoảng cách giữa các slot */}
            <div className="relative space-y-1 overflow-y-auto" style={{ maxHeight: "500px" }}>
              {(() => {
                const currentHour = currentTime.getHours();
                const currentMinutes = currentTime.getMinutes();
                const currentTimeInMinutes = currentHour * 60 + currentMinutes;

                // --- TÍNH TOÁN VỊ TRÍ VẠCH ĐỎ ---
                const startTimeInMinutes = 8 * 60; // 08:00

                // Chiều cao slot phải khớp với `minHeight` bên dưới
                const itemHeight = 52; // = style minHeight: "52px"
                // Khoảng cách slot phải khớp với `space-y-1` bên trên
                const slotGap = 4; // = space-y-1 (4px)
                const totalSlotHeight = itemHeight + slotGap; // 56px

                let currentPosition: number | null = null;

                // Vị trí dot (w-10 (40px) + pr-2 (8px) + w-2/2 (4px) = 52px)
                const dotCenterLeft = 43; // px

                if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= 24 * 60) {
                  const minutesFromStart = currentTimeInMinutes - startTimeInMinutes;

                  const currentSlotIndex = Math.floor(minutesFromStart / 30);
                  const minutesIntoSlot = minutesFromStart % 30;

                  // Vị trí = (số slot đã qua * tổng chiều cao slot) + (tỷ lệ phút trong slot hiện tại * chiều cao item)
                  currentPosition = currentSlotIndex * totalSlotHeight + (minutesIntoSlot / 30) * itemHeight;
                }

                return (
                  <>
                    {/* === CURRENT TIME INDICATOR === */}
                    {currentPosition !== null && (
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none"
                        style={{ top: `${currentPosition}px` }}
                      >
                        {/* Container for the line, bắt đầu từ tâm dot */}
                        <div
                          className="relative flex items-center"
                          style={{ marginLeft: `${dotCenterLeft}px` }} // Bắt đầu line từ 52px
                        >
                          {/* Line (kéo dài w-full từ 52px) */}
                          <div className="w-[calc(100%-20px)] ml-auto border-t-2 border-red-500"></div>
                        </div>

                        {/* Tag (căn giữa vào dot) */}
                        <div
                          className="absolute -translate-x-1/2 -top-2 bg-red-500/70 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md"
                          style={{ left: `${dotCenterLeft}px` }} // Đặt tag tại 52px
                        >
                          {currentTime.getHours().toString().padStart(2, "0")}:
                          {currentTime.getMinutes().toString().padStart(2, "0")}
                        </div>
                      </div>
                    )}

                    {/* Time Slots */}
                    {timeSlots.map((time, index) => {
                      const appointment = todayAppointments.find((apt) => apt.startTime === time);

                      const [hourStr, minuteStr] = time.split(":");
                      const slotHour = parseInt(hourStr);
                      const slotMinute = parseInt(minuteStr);
                      const slotTimeInMinutes = slotHour * 60 + slotMinute;

                      const isPast = currentTimeInMinutes > slotTimeInMinutes;
                      const dotColor = isPast ? "var(--color-primary)" : "#d1d5db";

                      return (
                        <div
                          key={time}
                          className="relative flex flex-row items-center gap-3"
                          style={{ minHeight: "52px" }}
                        >
                          {/* Time with Dot */}
                          <div className="w-13 flex-shrink-0 flex flex-row items-center">
                            {/* Time Label (left) */}
                            <span className="w-10 text-xs text-gray-500 font-medium text-right pr-2">{time}</span>

                            {/* Dot (right) */}
                            <div
                              className="w-2 h-2 rounded-full relative z-20"
                              style={{ backgroundColor: dotColor }}
                            ></div>
                          </div>

                          {/* Vertical Line */}
                          {index < timeSlots.length - 1 && (
                            <div
                              className="absolute w-[1.5px] bg-gray-200"
                              style={{
                                left: `${dotCenterLeft}px`, // Căn giữa vào dot
                                top: 26, // Bắt đầu từ top slot
                                height: "100%", // Kéo dài hết slot
                                zIndex: 1, // Nằm dưới dot (z-20)
                              }}
                            ></div>
                          )}

                          {/* Appointment Card */}
                          {appointment ? (
                            <div
                              className="flex-1 flex items-center gap-3 py-2 px-3 border border-gray-200 rounded-lg bg-white hover:shadow-sm cursor-pointer transition-all relative z-10"
                              onClick={() => {
                                // Chuyển đến trang schedule và mở modal với appointmentId
                                router.push(`/doctor/schedule?appointmentId=${appointment._id}`);
                              }}
                              // title wit complete, confirmed, pending
                              title={`Bệnh nhân: ${appointment.patientName}\nLoại: ${appointment.appointmentType}\nTrạng thái: ${appointment.status}`}
                            >
                              {/* Avatar */}
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                                style={{ backgroundColor: "var(--color-primary)" }}
                              >
                                {appointment.patientName?.charAt(0).toUpperCase() || "?"}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {appointment.patientName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{appointment.appointmentType}</p>
                              </div>

                              {/* Status Icon */}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  appointment.status?.toLowerCase() === "completed"
                                    ? "bg-blue-50"
                                    : appointment.status?.toLowerCase() === "confirmed"
                                    ? "bg-green-50"
                                    : "bg-orange-50"
                                }`}
                              >
                                {appointment.status?.toLowerCase() === "completed" ? (
                                  <Check className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <Clock
                                    className={`w-4 h-4 ${
                                      appointment.status?.toLowerCase() === "confirmed"
                                        ? "text-green-500"
                                        : "text-orange-500"
                                    }`}
                                  />
                                )}
                              </div>
                            </div>
                          ) : (
                            // Slot trống
                            <div className="flex-1 h-full"></div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}