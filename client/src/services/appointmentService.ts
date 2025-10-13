import { Appointment, AppointmentStatus } from "@/types/appointment";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  appointmentDate: string; // ISO string
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  notes?: string;
  status?: AppointmentStatus;
  cancellationReason?: string;
  isRescheduled?: boolean;
  previousAppointmentId?: string;
  medicalRecordId?: string;
}

export interface AppointmentResponse {
  success: boolean;
  data?: Appointment;
  message?: string;
  error?: string;
}

export interface AppointmentsListResponse {
  success: boolean;
  data?: Appointment[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
  error?: string;
}

const appointmentService = {
  /**
   * Create a new appointment
   */
  async createAppointment(payload: CreateAppointmentPayload, token?: string): Promise<AppointmentResponse> {
    try {
      console.log("Creating appointment with payload:", payload);
      console.log("Using token:", token ? "Yes" : "No");

      const response = await fetch(`${API_URL}/api/v1/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Server response status:", response.status);
      console.log("Server response data:", data);

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Server may return data directly or wrapped in data property
      const appointmentData = data.data || data;

      return {
        success: true,
        data: appointmentData,
        message: data.message,
      };
    } catch (error) {
      console.error("Create appointment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Get appointments by patient ID
   */
  async getPatientAppointments(
    patientId: string,
    query?: { status?: AppointmentStatus; page?: number; limit?: number },
    token?: string
  ): Promise<AppointmentsListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (query?.status) queryParams.append("status", query.status);
      if (query?.page) queryParams.append("page", query.page.toString());
      if (query?.limit) queryParams.append("limit", query.limit.toString());

      // Add populate for doctor and patient info
      queryParams.append("populate", "doctorId,patientId");

      const url = `${API_URL}/api/v1/appointments/patient/${patientId}${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const response = await fetch(url, {
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
          error: data.message || "Không thể lấy danh sách lịch hẹn",
        };
      }

      // Server may return data directly or wrapped in data property
      const appointmentsData = data.data || data;

      // Map doctorId -> doctor and patientId -> patient for consistency
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedAppointments = (Array.isArray(appointmentsData) ? appointmentsData : [appointmentsData]).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apt: any) => ({
          ...apt,
          doctor: apt.doctorId || apt.doctor,
          patient: apt.patientId || apt.patient,
        })
      );

      return {
        success: true,
        data: mappedAppointments,
        total: data.total,
        page: data.page,
        limit: data.limit,
        message: data.message,
      };
    } catch (error) {
      console.error("Get patient appointments error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Get upcoming appointments for patient
   */
  async getPatientUpcomingAppointments(patientId: string, token?: string): Promise<AppointmentsListResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/patient/${patientId}/upcoming`, {
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
          error: data.message || "Không thể lấy danh sách lịch hẹn sắp tới",
        };
      }

      const appointmentsData = data.data || data;

      return {
        success: true,
        data: Array.isArray(appointmentsData) ? appointmentsData : [appointmentsData],
        message: data.message,
      };
    } catch (error) {
      console.error("Get upcoming appointments error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string, token?: string): Promise<AppointmentResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}`, {
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
          error: data.message || "Không thể lấy thông tin lịch hẹn",
        };
      }

      const appointmentData = data.data || data;

      return {
        success: true,
        data: appointmentData,
        message: data.message,
      };
    } catch (error) {
      console.error("Get appointment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    token?: string
  ): Promise<AppointmentResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể cập nhật trạng thái lịch hẹn",
        };
      }

      const appointmentData = data.data || data;

      return {
        success: true,
        data: appointmentData,
        message: data.message,
      };
    } catch (error) {
      console.error("Update appointment status error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: string, reason: string, token?: string): Promise<AppointmentResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}/cancel`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể hủy lịch hẹn",
        };
      }

      const appointmentData = data.data || data;

      return {
        success: true,
        data: appointmentData,
        message: data.message,
      };
    } catch (error) {
      console.error("Cancel appointment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
    token?: string
  ): Promise<AppointmentResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}/reschedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          appointmentDate: newDate,
          appointmentTime: newTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể đổi lịch hẹn",
        };
      }

      const appointmentData = data.data || data;

      return {
        success: true,
        data: appointmentData,
        message: data.message,
      };
    } catch (error) {
      console.error("Reschedule appointment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Confirm appointment
   */
  async confirmAppointment(appointmentId: string, token?: string): Promise<AppointmentResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v1/appointments/${appointmentId}/confirm`, {
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
          error: data.message || "Không thể xác nhận lịch hẹn",
        };
      }

      const appointmentData = data.data || data;

      return {
        success: true,
        data: appointmentData,
        message: data.message,
      };
    } catch (error) {
      console.error("Confirm appointment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },
};

export default appointmentService;
