/**
 * Appointment Service
 * Tất cả API calls liên quan đến lịch hẹn
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in-progress';

export interface Appointment {
  _id: string;
  patientId?: {
    _id: string;
    fullName: string;
    email?: string;
    phone?: string;
    gender?: string;
    address?: string;
    avatarUrl?: string;
  };
  doctorId?: {
    _id: string;
    fullName: string;
  };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  status: AppointmentStatus;
  notes?: string;
  consultationFee?: number;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Lấy danh sách appointments của doctor
 */
export async function getDoctorAppointments(
  doctorId: string,
  token: string,
  query?: {
    status?: AppointmentStatus;
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<Appointment[]>> {
  try {
    const queryParams = new URLSearchParams();
    if (query?.status) queryParams.append('status', query.status);
    if (query?.page) queryParams.append('page', query.page.toString());
    if (query?.limit) queryParams.append('limit', query.limit.toString());
    queryParams.append('populate', 'doctorId,patientId');

    const url = `${API_URL}/appointments/doctor/${doctorId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Không thể lấy danh sách lịch hẹn',
      };
    }

    const data = await response.json();
    const appointmentsData = data.data || data;

    return {
      success: true,
      data: Array.isArray(appointmentsData) ? appointmentsData : [appointmentsData],
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
  } catch (error) {
    console.error('getDoctorAppointments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối server',
    };
  }
}

/**
 * Lấy chi tiết appointment
 */
export async function getAppointmentById(
  appointmentId: string,
  token: string
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(
      `${API_URL}/appointments/${appointmentId}?populate=doctorId,patientId`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Không thể lấy thông tin lịch hẹn',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
    };
  } catch (error) {
    console.error('getAppointmentById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối server',
    };
  }
}

/**
 * Xác nhận appointment
 */
export async function confirmAppointment(
  appointmentId: string,
  token: string
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/confirm`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Không thể xác nhận lịch hẹn',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Đã xác nhận lịch hẹn',
    };
  } catch (error) {
    console.error('confirmAppointment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối server',
    };
  }
}

/**
 * Hoàn thành appointment
 */
export async function completeAppointment(
  appointmentId: string,
  token: string
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Không thể hoàn thành lịch hẹn',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Đã hoàn thành lịch hẹn',
    };
  } catch (error) {
    console.error('completeAppointment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối server',
    };
  }
}

/**
 * Hủy appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  token: string,
  reason: string = 'Bác sĩ hủy lịch hẹn',
  cancelledBy: 'doctor' | 'patient' = 'doctor'
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancellationReason: reason,
        cancelledBy,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Không thể hủy lịch hẹn',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Đã hủy lịch hẹn',
    };
  } catch (error) {
    console.error('cancelAppointment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối server',
    };
  }
}

/**
 * Tạo appointment mới
 */
export async function createAppointment(
  payload: {
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    duration: number;
    appointmentType: string;
    consultationFee?: number;
    notes?: string;
  },
  token: string
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Không thể tạo lịch hẹn',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Đã tạo lịch hẹn',
    };
  } catch (error) {
    console.error('createAppointment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối server',
    };
  }
}
