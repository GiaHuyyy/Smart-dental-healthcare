'use client';

import CreateMedicalRecordModal from '@/components/medical-records/CreateMedicalRecordModal';
import DoctorStatistics from '@/components/medical-records/DoctorStatistics';
import EditMedicalRecordModal from '@/components/medical-records/EditMedicalRecordModal';
import ExportMedicalRecord from '@/components/medical-records/ExportMedicalRecord';
import MedicalRecordDetailModal from '@/components/medical-records/MedicalRecordDetailModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    Edit,
    Eye,
    FileText,
    Filter,
    Plus,
    Search,
    Stethoscope,
    TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface MedicalRecord {
  _id: string;
  patientId: {
    _id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  status: string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
  procedures: Array<{
    name: string;
    description: string;
    date: string;
    cost: number;
    status: string;
  }>;
  dentalChart: Array<{
    toothNumber: number;
    condition: string;
    treatment: string;
    notes: string;
  }>;
}

export default function DoctorMedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, statusFilter, activeTab]);

  const fetchMedicalRecords = async () => {
    try {
      const response = await fetch('/api/medical-records/doctor', {
        headers: {
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        const errorData = await response.json();
        toast({
          title: "Lỗi",
          description: errorData.message || "Không thể tải danh sách hồ sơ bệnh án",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tải dữ liệu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record =>
        (record.patientId?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Filter by tab
    switch (activeTab) {
      case 'recent':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = filtered.filter(record => new Date(record.recordDate) >= oneWeekAgo);
        break;
      case 'follow-up':
        filtered = filtered.filter(record => record.isFollowUpRequired);
        break;
      case 'active':
        filtered = filtered.filter(record => record.status === 'active');
        break;
    }

    setFilteredRecords(filtered);
  };

  const handleCreateRecord = async (data: any) => {
    try {
      const response = await fetch('/api/medical-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Hồ sơ bệnh án đã được tạo thành công",
        });
        setShowCreateModal(false);
        fetchMedicalRecords();
      } else {
        toast({
          title: "Lỗi",
          description: "Không thể tạo hồ sơ bệnh án",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tạo hồ sơ",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRecord = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/medical-records/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Hồ sơ bệnh án đã được cập nhật thành công",
        });
        setShowEditModal(false);
        fetchMedicalRecords();
      } else {
        toast({
          title: "Lỗi",
          description: "Không thể cập nhật hồ sơ bệnh án",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật hồ sơ",
        variant: "destructive"
      });
    }
  };

  const handleExportRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowExportModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Đang điều trị', variant: 'default' as const, icon: Activity },
      completed: { label: 'Hoàn thành', variant: 'secondary' as const, icon: CheckCircle },
      pending: { label: 'Chờ xử lý', variant: 'outline' as const, icon: Clock },
      cancelled: { label: 'Đã hủy', variant: 'destructive' as const, icon: AlertCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusCount = (status: string) => {
    return records.filter(record => record.status === status).length;
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh'
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh'
      }}
    >
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Hồ sơ điều trị
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Quản lý hồ sơ bệnh án của bệnh nhân một cách hiệu quả</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowStatistics(!showStatistics)}
                className="flex items-center gap-2 bg-white/80 hover:bg-white border-gray-200 backdrop-blur-sm"
              >
                <TrendingUp className="h-4 w-4" />
                Thống kê
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)} 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Tạo hồ sơ mới
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        {showStatistics && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
            <DoctorStatistics doctorId="current-doctor-id" />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Tổng hồ sơ</p>
                  <p className="text-3xl font-bold">{records.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Đang điều trị</p>
                  <p className="text-3xl font-bold">{getStatusCount('active')}</p>
                </div>
                <Activity className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Hoàn thành</p>
                  <p className="text-3xl font-bold">{getStatusCount('completed')}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Cần tái khám</p>
                  <p className="text-3xl font-bold">{records.filter(r => r.isFollowUpRequired).length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-100">
              <TabsList className="grid w-full grid-cols-4 bg-transparent border-0 p-0 h-auto">
                <TabsTrigger value="all" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12">
                  Tất cả ({records.length})
                </TabsTrigger>
                <TabsTrigger value="recent" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12">
                  Gần đây
                </TabsTrigger>
                <TabsTrigger value="follow-up" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12">
                  Cần tái khám ({records.filter(r => r.isFollowUpRequired).length})
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12">
                  Đang điều trị ({getStatusCount('active')})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="p-6 space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Tìm kiếm theo tên bệnh nhân, triệu chứng, chẩn đoán..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-12 px-4 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang điều trị</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* Records List */}
              <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                  <Card className="border-2 border-dashed border-gray-200 bg-gray-50/80 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <FileText className="h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Không có hồ sơ nào</h3>
                      <p className="text-gray-500 text-center max-w-md">
                        {activeTab === 'all' ? 'Chưa có hồ sơ bệnh án nào được tạo. Hãy bắt đầu bằng cách tạo hồ sơ đầu tiên.' : 
                         activeTab === 'follow-up' ? 'Không có bệnh nhân nào cần tái khám trong thời gian này.' :
                         'Không có hồ sơ nào phù hợp với bộ lọc hiện tại.'}
                      </p>
                      {activeTab === 'all' && (
                        <Button 
                          onClick={() => setShowCreateModal(true)}
                          className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Tạo hồ sơ đầu tiên
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredRecords.map((record) => (
                    <Card key={record._id} className="hover:shadow-lg transition-all duration-300 border-gray-100 hover:border-blue-200 group bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                          <div className="flex-1 space-y-4">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                  {(record.patientId?.fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {record.patientId?.fullName || 'Chưa cập nhật'}
                                  </h3>
                                  <p className="text-gray-500 text-sm">{record.patientId?.email || ''}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(record.status)}
                                {record.isFollowUpRequired && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Cần tái khám
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-700">
                                  <Calendar className="h-5 w-5 text-blue-500" />
                                  <span className="font-medium">Ngày khám:</span>
                                  <span>{format(new Date(record.recordDate), 'dd/MM/yyyy', { locale: vi })}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                  <Stethoscope className="h-5 w-5 text-green-500" />
                                  <span className="font-medium">Triệu chứng:</span>
                                  <span className="text-gray-600">{record.chiefComplaint}</span>
                                </div>
                                {record.followUpDate && (
                                  <div className="flex items-center gap-3 text-orange-600">
                                    <Clock className="h-5 w-5" />
                                    <span className="font-medium">Tái khám:</span>
                                    <span>{format(new Date(record.followUpDate), 'dd/MM/yyyy', { locale: vi })}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-3">
                                {record.diagnosis && (
                                  <div className="text-gray-700">
                                    <span className="font-medium text-gray-900">Chẩn đoán:</span>
                                    <p className="text-gray-600 mt-1 leading-relaxed">{record.diagnosis}</p>
                                  </div>
                                )}
                                {record.treatmentPlan && (
                                  <div className="text-gray-700">
                                    <span className="font-medium text-gray-900">Kế hoạch điều trị:</span>
                                    <p className="text-gray-600 mt-1 leading-relaxed">{record.treatmentPlan}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2 lg:flex-col">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowDetailModal(true);
                              }}
                              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 bg-white/80 backdrop-blur-sm"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden lg:inline">Xem</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowEditModal(true);
                              }}
                              className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-600 bg-white/80 backdrop-blur-sm"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="hidden lg:inline">Sửa</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportRecord(record)}
                              className="flex items-center gap-2 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 bg-white/80 backdrop-blur-sm"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden lg:inline">Xuất</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateMedicalRecordModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRecord}
        />
      )}

      {showDetailModal && selectedRecord && (
        <MedicalRecordDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          record={selectedRecord}
          onEdit={() => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      {showEditModal && selectedRecord && (
        <EditMedicalRecordModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          record={selectedRecord}
          onSubmit={(data) => handleUpdateRecord(selectedRecord._id, data)}
        />
      )}

      {showExportModal && selectedRecord && (
        <ExportMedicalRecord
          recordId={selectedRecord._id}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

