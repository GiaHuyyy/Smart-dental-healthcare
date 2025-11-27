export interface DoctorStats {
  todayAppointments: number;
  completedToday: number;
  waitingPatients: number;
  pendingPrescriptions: number;
  weeklyPatients: number;
  weeklyPrescriptions: number;
  satisfactionRate: number;
  averageWaitTime: number;
}

export interface TodayAppointment {
  _id: string;
  patientName: string;
  patientAvatar?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: string;
  visitType?: string;
  chiefComplaint?: string;
  patient?: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
}

export interface RecentActivity {
  _id: string;
  type: "appointment_completed" | "prescription_created" | "follow_up_scheduled" | "treatment_started";
  title: string;
  description: string;
  timestamp: string;
  relatedPatient?: string;
}

export interface DashboardResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalIncome: number;
  totalTreatments: number;
  patientGrowth: number;
  appointmentGrowth: number;
  incomeGrowth: number;
  treatmentGrowth: number;
}

export interface ChartDataPoint {
  period: string; // "T1", "T2", ... hoặc "1", "2", ... (ngày)
  hoanthanh: number;
  huy: number;
  choXuLy: number;
}

const doctorDashboardService = {
  async getStats(doctorId: string, token?: string): Promise<DashboardResponse<DoctorStats>> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể tải thống kê",
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error("Get doctor stats error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  async getTodayAppointments(doctorId: string, token?: string): Promise<DashboardResponse<TodayAppointment[]>> {
    try {
      const today = new Date().toISOString().split("T")[0];
      console.log("Fetching appointments for today:", today);

      // Lấy tất cả appointments rồi filter ở client vì backend không support date filter
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}?populate=patientId`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();
      console.log("Today appointments - raw response:", data);

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể tải lịch hẹn",
        };
      }

      // Xử lý response structure
      let rawAppointments = [];
      if (Array.isArray(data)) {
        rawAppointments = data;
      } else if (Array.isArray(data?.data)) {
        rawAppointments = data.data;
      }

      console.log("Today appointments - raw count:", rawAppointments.length);

      // Filter appointments cho ngày hôm nay
      const todayAppointments = rawAppointments.filter((apt: { appointmentDate: string | Date }) => {
        const aptDate = new Date(apt.appointmentDate).toISOString().split("T")[0];
        return aptDate === today;
      });

      console.log("Today appointments - filtered by date:", todayAppointments.length);

      const appointments = todayAppointments.map((apt: Record<string, unknown>) => ({
        ...apt,
        patient: apt.patientId || apt.patient,
        patientName:
          (apt.patientId as { fullName?: string })?.fullName ||
          (apt.patient as { fullName?: string })?.fullName ||
          apt.patientName ||
          "Bệnh nhân",
        patientAvatar:
          (apt.patientId as { profileImage?: string })?.profileImage ||
          (apt.patient as { profileImage?: string })?.profileImage ||
          apt.patientAvatar,
      }));

      console.log("Today appointments - processed:", appointments.length, appointments);

      return {
        success: true,
        data: appointments,
        message: data.message,
      };
    } catch (error) {
      console.error("Get today appointments error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  async getRecentActivities(doctorId: string, token?: string): Promise<DashboardResponse<RecentActivity[]>> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}/recent-activities`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: [],
            message: "No recent activities endpoint",
          };
        }

        return {
          success: false,
          error: data.message || "Không thể tải hoạt động gần đây",
        };
      }

      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      console.error("Get recent activities error:", error);
      return {
        success: true,
        data: [],
      };
    }
  },

  async startAppointment(appointmentId: string, token?: string): Promise<DashboardResponse<TodayAppointment>> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể bắt đầu khám",
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error("Start appointment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  async completeAppointment(appointmentId: string, token?: string): Promise<DashboardResponse<TodayAppointment>> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể hoàn thành khám",
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error("Complete appointment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  // Lấy thống kê tổng quan cho dashboard
  async getDashboardStats(doctorId: string, token?: string): Promise<DashboardResponse<DashboardStats>> {
    try {
      if (!doctorId) {
        return {
          success: false,
          error: "Doctor ID is required",
        };
      }

      console.log("Fetching dashboard stats for doctor:", doctorId);

      // Lấy thống kê bệnh nhân (không cần doctorId vì đếm tất cả patients)
      const patientsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/patients/stats`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // Lấy tất cả appointments của bác sĩ
      const appointmentsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // Lấy thống kê đơn thuốc
      const prescriptionsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/prescriptions/stats?doctorId=${doctorId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // Parse responses
      let patientsData = null;
      let appointmentsData = null;
      let prescriptionsData = null;

      // Parse patients data
      if (patientsRes.ok) {
        patientsData = await patientsRes.json();
      } else {
        console.error("Patient stats API failed:", {
          status: patientsRes.status,
          statusText: patientsRes.statusText,
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/patients/stats?doctorId=${doctorId}`,
        });
        try {
          const errorData = await patientsRes.json();
          console.error("Error response:", errorData);
        } catch {
          console.error("Could not parse error response");
        }
      }

      // Parse appointments data
      if (appointmentsRes.ok) {
        appointmentsData = await appointmentsRes.json();
        console.log("Appointments data:", appointmentsData);
      } else {
        console.warn("Appointments API failed:", appointmentsRes.status);
      }

      // Parse prescriptions data
      if (prescriptionsRes.ok) {
        prescriptionsData = await prescriptionsRes.json();
      } else {
        console.warn("Prescriptions stats API failed:", prescriptionsRes.status);
      }

      // Xử lý dữ liệu appointments
      // Backend trả về trực tiếp array hoặc wrap trong {data: [...]}
      let appointments = [];
      if (Array.isArray(appointmentsData)) {
        appointments = appointmentsData;
      } else if (Array.isArray(appointmentsData?.data)) {
        appointments = appointmentsData.data;
      }

      console.log("Processed appointments:", appointments.length, appointments);
      const completedAppointments = appointments.filter((apt: { status: string }) => apt.status === "completed");
      console.log("Completed appointments:", completedAppointments.length, completedAppointments);

      // Tính tổng doanh thu từ appointments đã hoàn thành
      const totalIncome = completedAppointments.reduce(
        (sum: number, apt: { consultationFee?: number }) => sum + (apt.consultationFee || 0),
        0
      );
      console.log("Total income:", totalIncome);

      // Tính growth rates (so với tháng trước)
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthAppointments = appointments.filter((apt: { appointmentDate: string }) => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= thisMonth;
      });

      const lastMonthAppointments = appointments.filter((apt: { appointmentDate: string }) => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= lastMonth && aptDate < thisMonth;
      });

      const appointmentGrowth =
        lastMonthAppointments.length > 0
          ? Math.round(
              ((thisMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length) * 100
            )
          : 0;

      // Tính income growth
      const thisMonthIncome = thisMonthAppointments
        .filter((apt: { status: string }) => apt.status === "completed")
        .reduce((sum: number, apt: { consultationFee?: number }) => sum + (apt.consultationFee || 0), 0);

      const lastMonthIncome = lastMonthAppointments
        .filter((apt: { status: string }) => apt.status === "completed")
        .reduce((sum: number, apt: { consultationFee?: number }) => sum + (apt.consultationFee || 0), 0);

      const incomeGrowth =
        lastMonthIncome > 0 ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : 0;

      // Patient growth từ API
      const totalPatients = patientsData?.data?.totalPatients || 0;
      const newPatientsThisMonth = patientsData?.data?.newPatientsThisMonth || 0;
      const patientGrowth = totalPatients > 0 ? Math.round((newPatientsThisMonth / totalPatients) * 100) : 0;

      // Treatment growth (prescriptions)
      const totalTreatments = prescriptionsData?.total || prescriptionsData?.data?.total || 0;
      const treatmentGrowth = 10; // Placeholder, cần API endpoint riêng để tính

      const result = {
        totalPatients,
        totalAppointments: appointments.length,
        totalIncome,
        totalTreatments,
        patientGrowth,
        appointmentGrowth,
        incomeGrowth,
        treatmentGrowth,
      };

      console.log("Dashboard stats result:", result);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  // Lấy dữ liệu biểu đồ theo tháng hoặc ngày
  async getChartData(
    doctorId: string,
    year: number,
    month?: number,
    token?: string
  ): Promise<DashboardResponse<ChartDataPoint[]>> {
    try {
      // Lấy tất cả appointments của bác sĩ
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: "Không thể tải dữ liệu biểu đồ",
        };
      }

      const data = await response.json();
      console.log("Chart data - raw response:", data);

      // Xử lý response giống getDashboardStats
      let appointments = [];
      if (Array.isArray(data)) {
        appointments = data;
      } else if (Array.isArray(data?.data)) {
        appointments = data.data;
      }

      console.log("Chart data - processed appointments:", appointments.length);

      if (month) {
        // Dữ liệu theo ngày trong tháng
        const daysInMonth = new Date(year, month, 0).getDate();
        const chartData: ChartDataPoint[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const dayAppointments = appointments.filter((apt: { appointmentDate: string }) => {
            const aptDate = new Date(apt.appointmentDate);
            return aptDate.getFullYear() === year && aptDate.getMonth() + 1 === month && aptDate.getDate() === day;
          });

          chartData.push({
            period: day.toString(),
            hoanthanh: dayAppointments.filter((apt: { status: string }) => apt.status === "completed").length,
            huy: dayAppointments.filter((apt: { status: string }) => apt.status === "cancelled").length,
            choXuLy: dayAppointments.filter((apt: { status: string }) =>
              ["pending", "confirmed", "in-progress"].includes(apt.status)
            ).length,
          });
        }

        console.log("Chart data - daily result:", chartData);

        return {
          success: true,
          data: chartData,
        };
      } else {
        // Dữ liệu theo tháng trong năm
        const chartData: ChartDataPoint[] = [];

        for (let m = 1; m <= 12; m++) {
          const monthAppointments = appointments.filter((apt: { appointmentDate: string }) => {
            const aptDate = new Date(apt.appointmentDate);
            return aptDate.getFullYear() === year && aptDate.getMonth() + 1 === m;
          });

          chartData.push({
            period: `T${m}`,
            hoanthanh: monthAppointments.filter((apt: { status: string }) => apt.status === "completed").length,
            huy: monthAppointments.filter((apt: { status: string }) => apt.status === "cancelled").length,
            choXuLy: monthAppointments.filter((apt: { status: string }) =>
              ["pending", "confirmed", "in-progress"].includes(apt.status)
            ).length,
          });
        }

        console.log("Chart data - monthly result:", chartData);

        return {
          success: true,
          data: chartData,
        };
      }
    } catch (error) {
      console.error("Get chart data error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },
};

export default doctorDashboardService;
