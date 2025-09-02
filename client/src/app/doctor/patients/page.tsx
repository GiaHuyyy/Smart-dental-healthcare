"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

interface PatientStats {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  inactivePatients: number;
}

export default function DoctorPatients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    testConnection();
    // debounce searchTerm to avoid too many requests while user types
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    // fetch whenever page, debounced search, or filter changes
    fetchPatients();
    fetchStats();
  }, [currentPage, debouncedSearch, selectedFilter]);

  const testConnection = async () => {
    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      console.log('Connection test:', data);
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('current', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedFilter) params.append('status', selectedFilter);

      const response = await fetch(`/api/users/patients/search?${params}`);
      const data = await response.json();

      // Backend / proxy may return different shapes. Normalize safely.
      if (data?.success === true) {
        const patientsResult = data.data?.patients ?? data.data ?? [];
        setPatients(Array.isArray(patientsResult) ? patientsResult : []);
        const tp = data.data?.pagination?.totalPages ?? data.data?.totalPages ?? 1;
        setTotalPages(typeof tp === 'number' ? tp : Number(tp) || 1);
      } else if (Array.isArray(data)) {
        // proxy returned raw array
        setPatients(data);
        setTotalPages(1);
      } else if (data?.patients) {
        setPatients(Array.isArray(data.patients) ? data.patients : []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } else {
        console.error('Error fetching patients:', data?.message ?? 'Unknown response');
        setError(data?.message || 'Không thể tải danh sách bệnh nhân');
        setPatients([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Lỗi kết nối server');
      // Fallback data để hiển thị
      setPatients([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      // optionally pass doctorId filter in future
      const response = await fetch(`/api/users/patients/stats?${params}`);
      const data = await response.json();

      if (data?.success === true) {
        setStats(data.data ?? null);
      } else {
        // Try to read raw payload shapes
        const raw = data?.data ?? data;
        if (raw && typeof raw === 'object') {
          setStats(raw as PatientStats);
        } else {
          console.error('Error fetching stats:', data?.message ?? 'Unknown response');
          setStats({
            totalPatients: 0,
            activePatients: 0,
            newPatientsThisMonth: 0,
            inactivePatients: 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback stats để hiển thị
      setStats({
        totalPatients: 0,
        activePatients: 0,
        newPatientsThisMonth: 0,
        inactivePatients: 0
      });
    }
  };

  const handlePatientClick = (patientId: string) => {
    router.push(`/doctor/patients/${patientId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Đang hoạt động
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          Không hoạt động
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý bệnh nhân</h1>
          <p className="text-gray-600">Danh sách và thông tin bệnh nhân</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Thêm bệnh nhân
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, số điện thoại, email..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <select
              className="border border-gray-300 rounded-md px-3 py-2"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng bệnh nhân</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? stats.totalPatients : '...'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? stats.activePatients : '...'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mới tháng này</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? stats.newPatientsThisMonth : '...'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">⏸️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Không hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? stats.inactivePatients : '...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách bệnh nhân ({patients.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Đang tải...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Không có bệnh nhân nào</p>
            {error && (
              <p className="text-sm text-red-500 mt-2">
                Lỗi: {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bệnh nhân
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thông tin liên hệ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày sinh
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày đăng ký
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handlePatientClick(patient._id)}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{patient.fullName}</p>
                          <p className="text-sm text-gray-600">
                            {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} tuổi` : 'Chưa cập nhật'}
                            {patient.gender && ` • ${patient.gender === 'male' ? 'Nam' : 'Nữ'}`}
                          </p>
                          {patient.address && (
                            <p className="text-sm text-gray-500">{patient.address}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{patient.phone}</p>
                          <p className="text-sm text-gray-600">{patient.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'Chưa cập nhật'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(patient.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(patient.isActive)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePatientClick(patient._id);
                            }}
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Trang {currentPage} của {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
