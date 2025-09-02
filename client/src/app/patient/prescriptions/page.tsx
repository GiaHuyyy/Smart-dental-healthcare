'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, Download, Eye, Pill, Printer, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  unit: string;
}

interface Prescription {
  _id: string;
  doctorId: {
    _id: string;
    fullName: string;
    email: string;
    specialty: string;
  };
  diagnosis: string;
  prescriptionDate: string;
  medications: Medication[];
  instructions: string;
  notes: string;
  status: string;
  isDispensed: boolean;
  isFollowUpRequired: boolean;
  followUpDate?: string;
}

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      // Khi public, cần truyền patientId qua query params
    const patientId = localStorage.getItem('userId');
    const qs = patientId && patientId !== 'null' ? `?patientId=${encodeURIComponent(patientId)}` : '';
    const response = await fetch(`/api/prescriptions/patient-prescriptions${qs}`);
      
      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách đơn thuốc',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailDialog(true);
  };

  const handlePrintPrescription = (prescription: Prescription) => {
    // Implement print functionality
    window.print();
  };

  const handleDownloadPrescription = (prescription: Prescription) => {
    // Implement download functionality
    const prescriptionData = {
      ...prescription,
      printableDate: format(new Date(prescription.prescriptionDate), 'dd/MM/yyyy', { locale: vi })
    };
    
    const blob = new Blob([JSON.stringify(prescriptionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `don-thuoc-${prescription._id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredPrescriptions = prescriptions.filter(prescription =>
    prescription.doctorId.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải danh sách đơn thuốc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
          Đơn thuốc của tôi
        </h1>
        <p className="text-gray-600 text-lg">Xem và quản lý các đơn thuốc đã được kê</p>
      </div>

      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Tìm kiếm theo tên bác sĩ hoặc chẩn đoán..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredPrescriptions.map((prescription) => (
          <Card key={prescription._id} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100 hover:border-green-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-green-700">
                    <User className="h-6 w-6 text-green-600" />
                    {prescription.doctorId.fullName}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {prescription.doctorId.specialty} • {prescription.doctorId.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={prescription.isDispensed ? 'default' : 'secondary'}>
                    {prescription.isDispensed ? 'Đã phát thuốc' : 'Chưa phát thuốc'}
                  </Badge>
                  <Badge variant={prescription.status === 'active' ? 'default' : 'destructive'}>
                    {prescription.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <Label className="font-semibold flex items-center gap-2 text-red-700">
                    <Pill className="h-5 w-5 text-red-500" />
                    Chẩn đoán:
                  </Label>
                  <p className="text-sm mt-2 text-red-800 font-medium">{prescription.diagnosis}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <Label className="font-semibold flex items-center gap-2 text-blue-700">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Ngày kê đơn:
                  </Label>
                  <p className="text-sm mt-2 text-blue-800 font-medium">
                    {format(new Date(prescription.prescriptionDate), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <Label className="font-semibold text-lg text-green-700 mb-3">Số loại thuốc: {prescription.medications.length}</Label>
                <div className="mt-3 space-y-3">
                  {prescription.medications.slice(0, 2).map((med, index) => (
                    <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 hover:border-green-300 transition-all duration-300">
                      <span className="font-medium text-green-800">{med.name}</span> - <span className="text-green-700">{med.dosage}</span>
                    </div>
                  ))}
                  {prescription.medications.length > 2 && (
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      Và {prescription.medications.length - 2} loại thuốc khác...
                    </p>
                  )}
                </div>
              </div>

              {prescription.isFollowUpRequired && prescription.followUpDate && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-500">
                  <Label className="font-semibold text-blue-800 text-lg">Lịch tái khám:</Label>
                  <p className="text-lg font-medium text-blue-700 mt-2">
                    {format(new Date(prescription.followUpDate), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDetail(prescription)}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePrintPrescription(prescription)}
                  className="hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-300"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  In đơn thuốc
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadPrescription(prescription)}
                  className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-300"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải xuống
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrescriptions.length === 0 && (
        <div className="text-center py-8">
          <Pill className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">Bạn chưa có đơn thuốc nào</p>
          <p className="text-gray-400">Hãy đặt lịch khám để nhận đơn thuốc từ bác sĩ</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn thuốc</DialogTitle>
          </DialogHeader>
          
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Bác sĩ kê đơn:</Label>
                    <p className="text-sm mt-1">{selectedPrescription.doctorId.fullName}</p>
                    <p className="text-xs text-gray-600">{selectedPrescription.doctorId.specialty}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Ngày kê đơn:</Label>
                    <p className="text-sm mt-1">
                      {format(new Date(selectedPrescription.prescriptionDate), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <Label className="font-semibold">Chẩn đoán:</Label>
                <p className="text-sm mt-1 p-3 bg-red-50 rounded border-l-4 border-red-500">
                  {selectedPrescription.diagnosis}
                </p>
              </div>

              {/* Medications */}
              <div>
                <Label className="font-semibold">Danh sách thuốc:</Label>
                <div className="mt-2 space-y-3">
                  {selectedPrescription.medications.map((med, index) => (
                    <div key={index} className="border p-4 rounded-lg bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-lg">{med.name}</h4>
                        <Badge variant="outline">
                          {med.quantity} {med.unit}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Liều lượng:</span> {med.dosage}
                        </div>
                        <div>
                          <span className="font-medium">Tần suất:</span> {med.frequency}
                        </div>
                        <div>
                          <span className="font-medium">Thời gian:</span> {med.duration}
                        </div>
                      </div>
                      {med.instructions && (
                        <div className="mt-2 p-2 bg-blue-50 rounded">
                          <span className="font-medium text-blue-800">Hướng dẫn:</span>
                          <p className="text-sm text-blue-700 mt-1">{med.instructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* General Instructions */}
              {selectedPrescription.instructions && (
                <div>
                  <Label className="font-semibold">Hướng dẫn chung:</Label>
                  <p className="text-sm mt-1 p-3 bg-green-50 rounded border-l-4 border-green-500">
                    {selectedPrescription.instructions}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedPrescription.notes && (
                <div>
                  <Label className="font-semibold">Ghi chú:</Label>
                  <p className="text-sm mt-1 p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
                    {selectedPrescription.notes}
                  </p>
                </div>
              )}

              {/* Follow-up */}
              {selectedPrescription.isFollowUpRequired && selectedPrescription.followUpDate && (
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <Label className="font-semibold text-blue-800">Lịch tái khám:</Label>
                  <p className="text-lg font-medium text-blue-700 mt-1">
                    {format(new Date(selectedPrescription.followUpDate), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Vui lòng đặt lịch tái khám theo đúng thời gian trên
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="font-semibold">Trạng thái:</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedPrescription.isDispensed ? 'default' : 'secondary'}>
                      {selectedPrescription.isDispensed ? 'Đã phát thuốc' : 'Chưa phát thuốc'}
                    </Badge>
                    <Badge variant={selectedPrescription.status === 'active' ? 'default' : 'destructive'}>
                      {selectedPrescription.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handlePrintPrescription(selectedPrescription)}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    In đơn thuốc
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDownloadPrescription(selectedPrescription)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Tải xuống
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
