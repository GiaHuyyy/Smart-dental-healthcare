/**
 * Prescription Service
 * API calls cho đơn thuốc
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  _id?: string;
}

export interface Prescription {
  _id: string;
  patientId: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  doctorId: {
    _id: string;
    fullName: string;
    specialty?: string;
  };
  medicalRecordId?: {
    _id: string;
    diagnosis?: string;
  };
  medications: Medication[];
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  prescriptionDate: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lấy danh sách đơn thuốc của bác sĩ
 */
export async function getDoctorPrescriptions(
  doctorId: string,
  token: string,
  params?: {
    current?: number;
    pageSize?: number;
    status?: string;
    patientId?: string;
  }
): Promise<ApiResponse<{ prescriptions: Prescription[]; total: number }>> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.current) queryParams.append('current', params.current.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.patientId) queryParams.append('patientId', params.patientId);

    const response = await fetch(
      `${API_URL}/prescriptions/doctor/${doctorId}?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return {
      success: response.ok,
      data: {
        prescriptions: data.data?.results || data.data || [],
        total: data.data?.total || 0,
      },
      message: data.message,
    };
  } catch (error) {
    console.error('getDoctorPrescriptions error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải danh sách đơn thuốc',
    };
  }
}

/**
 * Lấy đơn thuốc gần đây của bệnh nhân
 */
export async function getPatientPrescriptions(
  patientId: string,
  token: string,
  limit: number = 5
): Promise<ApiResponse<Prescription[]>> {
  try {
    const response = await fetch(
      `${API_URL}/prescriptions/patient/${patientId}/recent?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || [],
      message: data.message,
    };
  } catch (error) {
    console.error('getPatientPrescriptions error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải đơn thuốc',
    };
  }
}

/**
 * Lấy chi tiết đơn thuốc
 */
export async function getPrescriptionById(
  prescriptionId: string,
  token: string
): Promise<ApiResponse<Prescription>> {
  try {
    const response = await fetch(`${API_URL}/prescriptions/${prescriptionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('getPrescriptionById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải chi tiết đơn thuốc',
    };
  }
}

/**
 * Tạo đơn thuốc mới
 */
export async function createPrescription(
  prescriptionData: Partial<Prescription>,
  token: string
): Promise<ApiResponse<Prescription>> {
  try {
    const response = await fetch(`${API_URL}/prescriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prescriptionData),
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('createPrescription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo đơn thuốc',
    };
  }
}

/**
 * Cập nhật đơn thuốc
 */
export async function updatePrescription(
  prescriptionId: string,
  updates: Partial<Prescription>,
  token: string
): Promise<ApiResponse<Prescription>> {
  try {
    const response = await fetch(`${API_URL}/prescriptions/${prescriptionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('updatePrescription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật đơn thuốc',
    };
  }
}

/**
 * Xóa đơn thuốc
 */
export async function deletePrescription(
  prescriptionId: string,
  token: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_URL}/prescriptions/${prescriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return {
      success: response.ok,
      message: data.message,
    };
  } catch (error) {
    console.error('deletePrescription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa đơn thuốc',
    };
  }
}

/**
 * Tìm kiếm thuốc từ database
 */
export async function searchMedications(
  query: string,
  token: string
): Promise<ApiResponse<Medication[]>> {
  try {
    const response = await fetch(
      `${API_URL}/medications/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || [],
      message: data.message,
    };
  } catch (error) {
    console.error('searchMedications error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tìm kiếm thuốc',
    };
  }
}

export default {
  getDoctorPrescriptions,
  getPatientPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
  searchMedications,
};
