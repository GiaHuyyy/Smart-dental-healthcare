/**
 * Medical Record Service
 * API calls cho hồ sơ bệnh án
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface MedicalRecord {
  _id: string;
  patientId: {
    _id: string;
    fullName: string;
    email: string;
  };
  doctorId: {
    _id: string;
    fullName: string;
    specialty?: string;
  };
  appointmentId?: string;
  recordDate: string;
  chiefComplaint: string[];
  diagnosis: string;
  treatmentPlan: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  notes?: string;
  images?: string[];
  status: 'draft' | 'completed' | 'pending';
  isFollowUpRequired?: boolean;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecordStats {
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
  followUpRecords: number;
  completionRate: number;
}

/**
 * Lấy danh sách hồ sơ bệnh án của bác sĩ
 */
export async function getDoctorMedicalRecords(
  doctorId: string,
  token: string,
  params?: {
    current?: number;
    pageSize?: number;
    status?: string;
    patientId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<ApiResponse<{ records: MedicalRecord[]; total: number }>> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('doctorId', doctorId);
    
    if (params?.current) queryParams.append('current', params.current.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.patientId) queryParams.append('patientId', params.patientId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(
      `${API_URL}/medical-records/doctor/records?${queryParams.toString()}`,
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
        records: data.data?.results || data.data || [],
        total: data.data?.total || 0,
      },
      message: data.message,
    };
  } catch (error) {
    console.error('getDoctorMedicalRecords error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải hồ sơ bệnh án',
    };
  }
}

/**
 * Lấy hồ sơ bệnh án của một bệnh nhân
 */
export async function getPatientMedicalRecords(
  patientId: string,
  token: string
): Promise<ApiResponse<MedicalRecord[]>> {
  try {
    const response = await fetch(
      `${API_URL}/medical-records/patient/${patientId}`,
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
      data: data.data?.results || data.data || [],
      message: data.message,
    };
  } catch (error) {
    console.error('getPatientMedicalRecords error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải hồ sơ bệnh án',
    };
  }
}

/**
 * Lấy chi tiết một hồ sơ bệnh án
 */
export async function getMedicalRecordById(
  recordId: string,
  token: string
): Promise<ApiResponse<MedicalRecord>> {
  try {
    const response = await fetch(`${API_URL}/medical-records/${recordId}`, {
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
    console.error('getMedicalRecordById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải chi tiết hồ sơ',
    };
  }
}

/**
 * Tạo hồ sơ bệnh án mới
 */
export async function createMedicalRecord(
  recordData: Partial<MedicalRecord>,
  token: string
): Promise<ApiResponse<MedicalRecord>> {
  try {
    const response = await fetch(`${API_URL}/medical-records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recordData),
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('createMedicalRecord error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo hồ sơ bệnh án',
    };
  }
}

/**
 * Cập nhật hồ sơ bệnh án
 */
export async function updateMedicalRecord(
  recordId: string,
  updates: Partial<MedicalRecord>,
  token: string
): Promise<ApiResponse<MedicalRecord>> {
  try {
    const response = await fetch(`${API_URL}/medical-records/${recordId}`, {
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
    console.error('updateMedicalRecord error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ',
    };
  }
}

/**
 * Xóa hồ sơ bệnh án
 */
export async function deleteMedicalRecord(
  recordId: string,
  token: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_URL}/medical-records/${recordId}`, {
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
    console.error('deleteMedicalRecord error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể xóa hồ sơ',
    };
  }
}

/**
 * Lấy thống kê hồ sơ bệnh án
 */
export async function getMedicalRecordStats(
  doctorId: string,
  token: string,
  params?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<ApiResponse<MedicalRecordStats>> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(
      `${API_URL}/medical-records/doctor/${doctorId}/statistics?${queryParams.toString()}`,
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
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('getMedicalRecordStats error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải thống kê',
    };
  }
}

export default {
  getDoctorMedicalRecords,
  getPatientMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getMedicalRecordStats,
};
