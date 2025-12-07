import { Appointment, AppointmentStatus } from "@/types/appointment";
import type { FollowUpSuggestion } from "@/types/followUpSuggestion";

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  appointmentDate: string; // ISO string
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  consultationFee?: number;
  reason?: string; // Lý do khám
  notes?: string; // Ghi chú bổ sung
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments`, {
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

      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/patient/${patientId}${
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/patient/${patientId}/upcoming`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}`, {
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ status }),
        }
      );

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
  async cancelAppointment(
    appointmentId: string,
    reason: string,
    token?: string,
    cancelledBy?: "doctor" | "patient"
  ): Promise<AppointmentResponse> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/cancel`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ reason, cancelledBy }),
        }
      );

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
    updateData: {
      appointmentDate: string;
      startTime: string;
      endTime?: string;
      duration?: number;
    },
    token?: string
  ): Promise<AppointmentResponse> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/reschedule`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(updateData),
        }
      );

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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

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

  /**
   * Complete appointment
   */
  async completeAppointment(appointmentId: string, token?: string): Promise<AppointmentResponse> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Không thể hoàn thành lịch hẹn",
        };
      }

      const appointmentData = data.data || data;

      return {
        success: true,
        data: appointmentData,
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

  /**
   * Get appointments by doctor ID
   */
  async getDoctorAppointments(
    doctorId: string,
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

      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}${
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

      const appointmentsData = data.data || data;

      return {
        success: true,
        data: Array.isArray(appointmentsData) ? appointmentsData : [appointmentsData],
        total: data.total,
        page: data.page,
        limit: data.limit,
        message: data.message,
      };
    } catch (error) {
      console.error("Get doctor appointments error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  // ============= NEW BILLING METHODS =============

  /**
   * Reschedule appointment with billing logic (30-min threshold)
   */
  async rescheduleWithBilling(
    appointmentId: string,
    payload: {
      appointmentDate: string;
      startTime: string;
      endTime?: string;
      duration?: number;
      userId: string;
      notes?: string;
    },
    token?: string
  ): Promise<{
    success: boolean;
    data?: {
      newAppointment: Appointment;
      feeCharged: boolean;
      feeAmount: number;
    };
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/reschedule-with-billing`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Đổi lịch thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Reschedule with billing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Cancel appointment with billing logic
   */
  async cancelWithBilling(
    appointmentId: string,
    payload: {
      reason: string;
      cancelledBy: "patient" | "doctor";
      doctorReason?: "emergency" | "patient_late";
    },
    token?: string
  ): Promise<{
    success: boolean;
    data?: {
      appointment: Appointment;
      feeCharged: boolean;
      feeAmount: number;
      refundIssued: boolean;
      voucherCreated: boolean;
    };
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/cancel-with-billing`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Hủy lịch thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Cancel with billing error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Create follow-up appointment suggestion
   */
  async createFollowUpSuggestion(
    payload: {
      parentAppointmentId: string;
      suggestedDate: string;
      suggestedTime: string;
      notes?: string;
    },
    token?: string
  ): Promise<{
    success: boolean;
    data?: {
      followUpAppointment: Appointment;
      voucher: {
        code: string;
        value: number;
        expiresAt: string;
        [key: string]: unknown;
      };
    };
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/follow-up/create-suggestion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Tạo đề xuất tái khám thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Create follow-up suggestion error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Get follow-up suggestions for patient
   */
  async getFollowUpSuggestions(
    patientId: string,
    token?: string
  ): Promise<{
    success: boolean;
    data?: FollowUpSuggestion[];
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/follow-up/suggestions/${patientId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Lấy đề xuất tái khám thất bại",
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error("Get follow-up suggestions error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Reject follow-up suggestion
   */
  async rejectFollowUpSuggestion(suggestionId: string, token?: string): Promise<AppointmentResponse> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/follow-up/${suggestionId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Từ chối đề xuất thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Reject follow-up error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Mark follow-up suggestion as scheduled (after patient books via modal)
   */
  async markFollowUpAsScheduled(
    suggestionId: string,
    appointmentId: string,
    token?: string
  ): Promise<AppointmentResponse> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/follow-up/${suggestionId}/mark-scheduled`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ appointmentId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Đánh dấu đề xuất thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Mark follow-up scheduled error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Get available time slots for a doctor on a specific date
   */
  async getAvailableSlots(
    doctorId: string,
    date: string,
    token?: string
  ): Promise<{
    success: boolean;
    data?: string[];
    message?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/available-slots/${doctorId}?date=${date}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Lấy danh sách giờ trống thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Get available slots error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },
};

export default appointmentService;
