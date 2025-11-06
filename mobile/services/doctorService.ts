/**
 * Doctor Service
 * Tất cả API calls liên quan đến bác sĩ
 * 
 * NOTE: Tất cả functions yêu cầu token từ auth context
 * Sử dụng: const { session } = useAuth(); await doctorService.xxx(id, session?.token)
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * ============================================
 * DASHBOARD APIs
 * ============================================
 */

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

export interface TodayAppointment {
  _id: string;
  patientName: string;
  startTime: string;
  appointmentType: string;
  status: string;
  patientId?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

export interface ChartDataPoint {
  period: string;
  hoanthanh: number;
  huy: number;
  choXuLy: number;
}

/**
 * Lấy thống kê dashboard
 * Tổng hợp từ nhiều API giống web client
 */
export async function getDashboardStats(
  doctorId: string,
  token: string
): Promise<ApiResponse<DashboardStats>> {
  try {
    if (!doctorId) {
      return {
        success: false,
        error: 'Doctor ID is required',
      };
    }

    console.log('Fetching dashboard stats for doctor:', doctorId);

    // Fetch data từ các API khác nhau (parallel)
    const [patientsRes, appointmentsRes, prescriptionsRes] = await Promise.all([
      // 1. Lấy thống kê bệnh nhân
      fetch(`${API_URL}/users/patients/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      // 2. Lấy tất cả appointments của bác sĩ
      fetch(`${API_URL}/appointments/doctor/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      // 3. Lấy thống kê đơn thuốc
      fetch(`${API_URL}/prescriptions/stats?doctorId=${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }),
    ]);

    // Parse responses
    let patientsData = null;
    let appointmentsData = null;
    let prescriptionsData = null;

    if (patientsRes.ok) {
      patientsData = await patientsRes.json();
    } else {
      console.warn('Patient stats API failed:', patientsRes.status);
    }

    if (appointmentsRes.ok) {
      appointmentsData = await appointmentsRes.json();
      console.log('Appointments data:', appointmentsData);
    } else {
      console.warn('Appointments API failed:', appointmentsRes.status);
    }

    if (prescriptionsRes.ok) {
      prescriptionsData = await prescriptionsRes.json();
    } else {
      console.warn('Prescriptions stats API failed:', prescriptionsRes.status);
    }

    // Xử lý appointments array
    let appointments = [];
    if (Array.isArray(appointmentsData)) {
      appointments = appointmentsData;
    } else if (Array.isArray(appointmentsData?.data)) {
      appointments = appointmentsData.data;
    }

    console.log('Processed appointments:', appointments.length);

    // Tính tổng doanh thu từ completed appointments
    const completedAppointments = appointments.filter((apt: any) => apt.status === 'completed');
    const totalIncome = completedAppointments.reduce(
      (sum: number, apt: any) => sum + (apt.consultationFee || 0),
      0
    );

    console.log('Completed appointments:', completedAppointments.length, 'Total income:', totalIncome);

    // Tính growth rates (so với tháng trước)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthAppointments = appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= thisMonth;
    });

    const lastMonthAppointments = appointments.filter((apt: any) => {
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
      .filter((apt: any) => apt.status === 'completed')
      .reduce((sum: number, apt: any) => sum + (apt.consultationFee || 0), 0);

    const lastMonthIncome = lastMonthAppointments
      .filter((apt: any) => apt.status === 'completed')
      .reduce((sum: number, apt: any) => sum + (apt.consultationFee || 0), 0);

    const incomeGrowth =
      lastMonthIncome > 0 ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : 0;

    // Patient stats từ API
    const totalPatients = patientsData?.data?.totalPatients || 0;
    const newPatientsThisMonth = patientsData?.data?.newPatientsThisMonth || 0;
    const patientGrowth = totalPatients > 0 ? Math.round((newPatientsThisMonth / totalPatients) * 100) : 0;

    // Treatment stats
    const totalTreatments = prescriptionsData?.total || prescriptionsData?.data?.total || 0;
    const treatmentGrowth = 10; // Placeholder

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

    console.log('✅ Dashboard stats result:', result);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải thống kê',
    };
  }
}

/**
 * Lấy lịch hẹn hôm nay
 * Lấy tất cả appointments rồi filter ở client
 */
export async function getTodayAppointments(
  doctorId: string,
  token: string
): Promise<ApiResponse<TodayAppointment[]>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching appointments for today:', today);

    // Lấy tất cả appointments với populate patient
    const response = await fetch(`${API_URL}/appointments/doctor/${doctorId}?populate=patientId`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Không thể tải lịch hẹn',
      };
    }

    const data = await response.json();
    console.log('Today appointments - raw response:', data);

    // Xử lý response structure
    let rawAppointments = [];
    if (Array.isArray(data)) {
      rawAppointments = data;
    } else if (Array.isArray(data?.data)) {
      rawAppointments = data.data;
    }

    console.log('Today appointments - raw count:', rawAppointments.length);

    // Filter cho ngày hôm nay
    const todayAppointments = rawAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      return aptDate === today;
    });

    console.log('Today appointments - filtered:', todayAppointments.length);

    // Map sang format cần thiết
    const appointments = todayAppointments.map((apt: any) => ({
      _id: apt._id,
      patientName:
        apt.patientId?.fullName || apt.patient?.fullName || apt.patientName || 'Bệnh nhân',
      startTime: apt.startTime,
      appointmentType: apt.appointmentType || 'Khám tổng quát',
      status: apt.status,
    }));

    console.log('✅ Today appointments processed:', appointments.length);

    return {
      success: true,
      data: appointments,
    };
  } catch (error) {
    console.error('getTodayAppointments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải lịch hẹn',
    };
  }
}

/**
 * Lấy chart data theo tháng/năm
 * Lấy tất cả appointments rồi group ở client
 */
export async function getChartData(
  doctorId: string,
  token: string,
  year: number,
  month: number
): Promise<ApiResponse<ChartDataPoint[]>> {
  try {
    // Lấy tất cả appointments của bác sĩ
    const response = await fetch(`${API_URL}/appointments/doctor/${doctorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Không thể tải dữ liệu biểu đồ',
      };
    }

    const data = await response.json();
    console.log('Chart data - raw response:', data);

    // Xử lý response
    let appointments = [];
    if (Array.isArray(data)) {
      appointments = data;
    } else if (Array.isArray(data?.data)) {
      appointments = data.data;
    }

    console.log('Chart data - appointments:', appointments.length);

    // Tính số ngày trong tháng
    const daysInMonth = new Date(year, month, 0).getDate();
    const chartData: ChartDataPoint[] = [];

    // Group theo ngày
    for (let day = 1; day <= daysInMonth; day++) {
      const dayAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.appointmentDate);
        return (
          aptDate.getFullYear() === year &&
          aptDate.getMonth() + 1 === month &&
          aptDate.getDate() === day
        );
      });

      chartData.push({
        period: day.toString(),
        hoanthanh: dayAppointments.filter((apt: any) => apt.status === 'completed').length,
        huy: dayAppointments.filter((apt: any) => apt.status === 'cancelled').length,
        choXuLy: dayAppointments.filter((apt: any) =>
          ['pending', 'confirmed', 'in-progress'].includes(apt.status)
        ).length,
      });
    }

    console.log('✅ Chart data result:', chartData.length, 'days');

    return {
      success: true,
      data: chartData,
    };
  } catch (error) {
    console.error('getChartData error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải dữ liệu biểu đồ',
    };
  }
}

/**
 * ============================================
 * APPOINTMENTS APIs
 * ============================================
 */

export interface Appointment {
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
  };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lấy danh sách lịch hẹn của bác sĩ
 */
export async function getDoctorAppointments(
  doctorId: string,
  token: string,
  params?: {
    current?: number;
    pageSize?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<ApiResponse<{ appointments: Appointment[]; total: number }>> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.current) queryParams.append('current', params.current.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `${API_URL}/appointments/doctor/${doctorId}?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: {
        appointments: data.data?.appointments || data.data || [],
        total: data.data?.total || 0,
      },
      message: data.message,
    };
  } catch (error) {
    console.error('getDoctorAppointments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải lịch hẹn',
    };
  }
}

/**
 * Lấy chi tiết lịch hẹn
 */
export async function getAppointmentById(
  appointmentId: string,
  token: string
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
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
    console.error('getAppointmentById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải chi tiết lịch hẹn',
    };
  }
}

/**
 * Cập nhật lịch hẹn
 */
export async function updateAppointment(
  appointmentId: string,
  updates: Partial<Appointment>,
  token: string
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
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
    console.error('updateAppointment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật lịch hẹn',
    };
  }
}

/**
 * Tạo lịch hẹn mới
 */
export async function createAppointment(
  appointmentData: Partial<Appointment>,
  token: string
): Promise<ApiResponse<Appointment>> {
  try {
    const response = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('createAppointment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tạo lịch hẹn',
    };
  }
}

/**
 * ============================================
 * PATIENTS APIs
 * ============================================
 */

export interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  avatar?: string;
  role: 'patient';
  createdAt: string;
}

/**
 * Lấy danh sách bệnh nhân của bác sĩ
 */
export async function getDoctorPatients(
  doctorId: string,
  token: string,
  params?: {
    current?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }
): Promise<ApiResponse<{ patients: Patient[]; total: number; pagination?: { totalPages: number } }>> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.current) queryParams.append('current', params.current.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const url = `${API_URL}/users/patients/search?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('getDoctorPatients error:', data);
      return {
        success: false,
        data: { patients: [], total: 0 },
        message: data.message || 'Không thể tải danh sách bệnh nhân',
      };
    }

    const patients = data?.data?.patients || data?.patients || [];
    const pagination = data?.data?.pagination || data?.pagination || {};
    const total = data?.data?.total || pagination.total || patients.length;

    return {
      success: response.ok,
      data: {
        patients,
        total,
        pagination,
      },
      message: data.message,
    };
  } catch (error) {
    console.error('getDoctorPatients error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải danh sách bệnh nhân',
    };
  }
}

/**
 * Lấy thông tin chi tiết bệnh nhân
 */
export async function getPatientById(
  patientId: string,
  token: string
): Promise<ApiResponse<Patient>> {
  try {
    const response = await fetch(`${API_URL}/users/${patientId}`, {
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
    console.error('getPatientById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải thông tin bệnh nhân',
    };
  }
}

/**
 * Lấy lịch sử khám của bệnh nhân
 */
export async function getPatientHistory(
  patientId: string,
  token: string,
  params?: {
    current?: number;
    pageSize?: number;
  }
): Promise<ApiResponse<{ appointments: Appointment[]; total: number }>> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.current) queryParams.append('current', params.current.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const url = `${API_URL}/appointments/patient/${patientId}/history?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: {
        appointments: data.data?.appointments || data.data || [],
        total: data.data?.total || 0,
      },
      message: data.message,
    };
  } catch (error) {
    console.error('getPatientHistory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải lịch sử khám',
    };
  }
}

export default {
  // Dashboard
  getDashboardStats,
  getTodayAppointments,
  getChartData,
  
  // Appointments
  getDoctorAppointments,
  getAppointmentById,
  updateAppointment,
  createAppointment,
  
  // Patients
  getDoctorPatients,
  getPatientById,
  getPatientHistory,
};
