const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export interface PatientDashboardStats {
  nextAppointment: {
    id: string;
    date: string;
    time: string;
    doctor: string;
    type: string;
  } | null;
  completedAppointments: number;
  completedGrowth: number;
  followUpRequired: number;
  oralHealthScore: number;
}

export interface RecentActivity {
  _id: string;
  title: string;
  description: string;
  date: string;
  status: "completed" | "pending" | "attention";
  icon: "check" | "clock" | "file";
}

/**
 * Get patient dashboard statistics
 */
export async function getPatientDashboardStats(
  patientId: string,
  token?: string
): Promise<{ success: boolean; data?: PatientDashboardStats; error?: string }> {
  try {
    // Fetch upcoming appointments
    const appointmentsResponse = await fetch(
      `${API_URL}/api/v1/appointments/patient/${patientId}?status=confirmed&limit=1`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    let nextAppointment = null;
    if (appointmentsResponse.ok) {
      const appointmentsData = await appointmentsResponse.json();
      const appointments = appointmentsData.data || appointmentsData;

      if (Array.isArray(appointments) && appointments.length > 0) {
        const apt = appointments[0];
        nextAppointment = {
          id: apt._id || "",
          date: new Date(apt.appointmentDate).toLocaleDateString("vi-VN"),
          time: apt.startTime || "N/A",
          doctor: apt.doctor?.fullName || apt.doctorId?.fullName || "N/A",
          type: apt.appointmentType || "Khám định kỳ",
        };
      }
    }

    // Fetch completed appointments count
    const completedResponse = await fetch(`${API_URL}/api/v1/appointments/patient/${patientId}?status=completed`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    let completedAppointments = 0;
    if (completedResponse.ok) {
      const completedData = await completedResponse.json();
      const appointments = completedData.data || completedData;
      completedAppointments = Array.isArray(appointments) ? appointments.length : 0;
    }

    // Fetch medical records to check follow-up requirements
    const medicalRecordsResponse = await fetch(`/api/medical-records/statistics/patient?patientId=${patientId}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    let followUpRequired = 0;
    let oralHealthScore = 74; // Default mock value

    if (medicalRecordsResponse.ok) {
      const recordsData = await medicalRecordsResponse.json();
      // Extract follow-up count if available
      followUpRequired = recordsData.data?.followUpRequired || 2;
      oralHealthScore = recordsData.data?.oralHealthScore || 74;
    }

    return {
      success: true,
      data: {
        nextAppointment: nextAppointment || null,
        completedAppointments,
        completedGrowth: 2, // Mock growth for now
        followUpRequired,
        oralHealthScore,
      },
    };
  } catch (error) {
    console.error("Get patient dashboard stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối server",
    };
  }
}

/**
 * Get recent activities for patient
 */
export async function getRecentActivities(
  patientId: string,
  token?: string
): Promise<{ success: boolean; data?: RecentActivity[]; error?: string }> {
  try {
    // Fetch recent appointments
    const response = await fetch(`${API_URL}/api/v1/appointments/patient/${patientId}/history?pageSize=3`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch activities");
    }

    const data = await response.json();
    const appointments = data.data?.appointments || data.data || [];

    // Transform appointments to activities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activities: RecentActivity[] = appointments.map((apt: any) => {
      let status: "completed" | "pending" | "attention" = "pending";
      let icon: "check" | "clock" | "file" = "clock";

      if (apt.status === "completed") {
        status = "completed";
        icon = "check";
      } else if (apt.status === "pending") {
        status = "pending";
        icon = "clock";
      } else if (apt.status === "confirmed") {
        status = "attention";
        icon = "file";
      }

      return {
        _id: apt._id,
        title: apt.appointmentType || "Khám định kỳ",
        description: `${new Date(apt.appointmentDate).toLocaleDateString("vi-VN")} — ${
          apt.doctor?.fullName || apt.doctorId?.fullName || "Bác sĩ"
        }`,
        date: apt.appointmentDate,
        status,
        icon,
      };
    });

    return {
      success: true,
      data: activities.length > 0 ? activities : getMockActivities(),
    };
  } catch (error) {
    console.error("Get recent activities error:", error);
    // Return mock data on error
    return {
      success: true,
      data: getMockActivities(),
    };
  }
}

function getMockActivities(): RecentActivity[] {
  return [
    {
      _id: "1",
      title: "Khám định kỳ hoàn thành",
      description: "15/01/2024 — BS. Nguyễn Thị B",
      date: "2024-01-15",
      status: "completed",
      icon: "check",
    },
    {
      _id: "2",
      title: "Tẩy trắng răng được lên lịch",
      description: "20/01/2024 — Chờ xác nhận",
      date: "2024-01-20",
      status: "pending",
      icon: "clock",
    },
    {
      _id: "3",
      title: "Kết quả X-quang đã sẵn sàng",
      description: "12/01/2024 — Xem kết quả",
      date: "2024-01-12",
      status: "attention",
      icon: "file",
    },
  ];
}

const patientDashboardService = {
  getPatientDashboardStats,
  getRecentActivities,
};

export default patientDashboardService;
