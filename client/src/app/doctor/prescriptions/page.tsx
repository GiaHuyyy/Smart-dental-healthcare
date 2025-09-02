'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertCircle, Calendar, Edit, Eye, Pill, Plus, Printer, Search, Trash2, User } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

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
  patientId: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
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

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
}

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    diagnosis: '',
    instructions: '',
    notes: '',
    isFollowUpRequired: false,
    followUpDate: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: 1, unit: 'viên' }]
  });

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      // Khi public, cần truyền doctorId qua query params
  const doctorId = localStorage.getItem('userId');
  const qs = doctorId && doctorId !== 'null' ? `?doctorId=${encodeURIComponent(doctorId)}` : '';
  const response = await fetch(`/api/prescriptions/my-prescriptions${qs}`);
      
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

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/users/patients');
      
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleCreatePrescription = async () => {
    try {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          prescriptionDate: new Date(),
          doctorId: localStorage.getItem('userId')
        })
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đơn thuốc đã được tạo'
        });
        setShowCreateDialog(false);
        resetForm();
        fetchPrescriptions();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tạo đơn thuốc');
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo đơn thuốc',
        variant: 'destructive'
      });
    }
  };

  const handleEditPrescription = async () => {
    if (!editingPrescription) return;

    try {
      const response = await fetch(`/api/prescriptions/${editingPrescription._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đơn thuốc đã được cập nhật'
        });
        setShowEditDialog(false);
        setEditingPrescription(null);
        resetForm();
        fetchPrescriptions();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật đơn thuốc');
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật đơn thuốc',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePrescription = async (prescriptionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn thuốc này?')) return;

    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đơn thuốc đã được xóa'
        });
        fetchPrescriptions();
      } else {
        throw new Error('Không thể xóa đơn thuốc');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa đơn thuốc',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsDispensed = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}/dispense`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          isDispensed: true,
          dispensedBy: localStorage.getItem('userId')
        })
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đơn thuốc đã được đánh dấu là đã phát'
        });
        fetchPrescriptions();
      } else {
        throw new Error('Không thể cập nhật trạng thái');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      diagnosis: '',
      instructions: '',
      notes: '',
      isFollowUpRequired: false,
      followUpDate: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: 1, unit: 'viên' }]
    });
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: 1, unit: 'viên' }]
    }));
  };

  // Medicines autocomplete
  const [suggestions, setSuggestions] = useState<Array<{ name: string; dosage?: string }>>([]);
  const searchTimer = useRef<number | null>(null);

  const fetchMedicineSuggestions = (q: string) => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(async () => {
      if (!q || q.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const resp = await fetch(`/api/medicines/search?query=${encodeURIComponent(q)}`);
        if (resp.ok) {
          const data = await resp.json();
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Medicine suggestions error', err);
      }
    }, 180);
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const openEditDialog = (prescription: Prescription) => {
    setEditingPrescription(prescription);
    setFormData({
      patientId: prescription.patientId._id,
      diagnosis: prescription.diagnosis,
      instructions: prescription.instructions || '',
      notes: prescription.notes || '',
      isFollowUpRequired: prescription.isFollowUpRequired,
      followUpDate: prescription.followUpDate || '',
      medications: prescription.medications
    });
    setShowEditDialog(true);
  };

  const openDetailDialog = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailDialog(true);
  };

  const handlePrintPrescription = (prescription: Prescription) => {
    // Implement print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Đơn thuốc - ${prescription.patientId.fullName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
              .patient-info { margin-bottom: 20px; }
              .medication { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
              .footer { margin-top: 40px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ĐƠN THUỐC</h1>
              <p>Ngày: ${format(new Date(prescription.prescriptionDate), 'dd/MM/yyyy', { locale: vi })}</p>
            </div>
            <div class="patient-info">
              <h3>Thông tin bệnh nhân:</h3>
              <p><strong>Tên:</strong> ${prescription.patientId.fullName}</p>
              <p><strong>Chẩn đoán:</strong> ${prescription.diagnosis}</p>
            </div>
            <div class="medications">
              <h3>Danh sách thuốc:</h3>
              ${prescription.medications.map(med => `
                <div class="medication">
                  <p><strong>${med.name}</strong></p>
                  <p>Liều lượng: ${med.dosage}</p>
                  <p>Tần suất: ${med.frequency}</p>
                  <p>Thời gian: ${med.duration}</p>
                  <p>Số lượng: ${med.quantity} ${med.unit}</p>
                  ${med.instructions ? `<p>Hướng dẫn: ${med.instructions}</p>` : ''}
                </div>
              `).join('')}
            </div>
            ${prescription.instructions ? `
              <div class="instructions">
                <h3>Hướng dẫn chung:</h3>
                <p>${prescription.instructions}</p>
              </div>
            ` : ''}
            <div class="footer">
              <p>Chữ ký bác sĩ: _________________</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription =>
    prescription.patientId.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Quản lý đơn thuốc
          </h1>
          <p className="text-gray-600 mt-3 text-lg">Tạo và quản lý đơn thuốc cho bệnh nhân</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Plus className="mr-2 h-5 w-5" />
              Tạo đơn thuốc mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Tạo đơn thuốc mới
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientId" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Chọn bệnh nhân
                </Label>
                <Select value={formData.patientId} onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bệnh nhân" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient._id} value={patient._id}>
                        {patient.fullName} - {patient.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="diagnosis" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Chẩn đoán
                </Label>
                <Input
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Chẩn đoán bệnh"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="mt-6">
                <Label className="flex items-center gap-2 text-lg font-semibold">
                <Pill className="h-5 w-5 text-green-600" />
                Danh sách thuốc
              </Label>
              {formData.medications.map((med, index) => (
                <div key={index} className="border border-gray-200 p-4 rounded-lg mt-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                      <Label>Tên thuốc</Label>
                      <Input
                        value={med.name}
                        onChange={(e) => {
                          updateMedication(index, 'name', e.target.value);
                          fetchMedicineSuggestions(e.target.value);
                        }}
                        placeholder="Tên thuốc"
                        className="bg-white"
                        autoComplete="off"
                      />
                      {suggestions.length > 0 && med.name && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-md max-h-40 overflow-auto">
                          {suggestions.map((sugg, si) => (
                            <div
                              key={si}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                updateMedication(index, 'name', sugg.name);
                                if (sugg.dosage) updateMedication(index, 'dosage', sugg.dosage);
                                setSuggestions([]);
                              }}
                            >
                              <div className="font-medium">{sugg.name}</div>
                              {sugg.dosage && <div className="text-xs text-gray-500">{sugg.dosage}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Liều lượng</Label>
                      <Input
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        placeholder="Ví dụ: 500mg"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>Tần suất</Label>
                      <Input
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        placeholder="Ví dụ: 2 lần/ngày"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>Thời gian</Label>
                      <Input
                        value={med.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        placeholder="Ví dụ: 7 ngày"
                        className="bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Hướng dẫn sử dụng</Label>
                      <Textarea
                        value={med.instructions}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                        placeholder="Hướng dẫn chi tiết cách sử dụng"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        value={med.quantity}
                        onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>Đơn vị</Label>
                      <Select value={med.unit} onValueChange={(value) => updateMedication(index, 'unit', value)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viên">Viên</SelectItem>
                          <SelectItem value="gói">Gói</SelectItem>
                          <SelectItem value="chai">Chai</SelectItem>
                          <SelectItem value="ống">Ống</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {formData.medications.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      onClick={() => removeMedication(index)}
                    >
                      Xóa thuốc
                    </Button>
                  )}
                </div>
              ))}
              
              <Button type="button" variant="outline" onClick={addMedication} className="mt-3 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
                <Plus className="mr-2 h-4 w-4" />
                Thêm thuốc
              </Button>
            </div>

            <div className="mt-6">
              <Label htmlFor="instructions" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Hướng dẫn chung
              </Label>
                          <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Hướng dẫn chung cho bệnh nhân"
                rows={3}
                className="bg-white"
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Ghi chú
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ghi chú bổ sung"
                rows={2}
                className="bg-white"
              />
            </div>

            <div className="flex items-center space-x-4 mt-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isFollowUpRequired"
                  checked={formData.isFollowUpRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFollowUpRequired: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="isFollowUpRequired">Yêu cầu tái khám</Label>
              </div>
              
              {formData.isFollowUpRequired && (
                <div>
                  <Label htmlFor="followUpDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ngày tái khám
                  </Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                    className="bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreatePrescription} className="bg-blue-600 hover:bg-blue-700">
                Tạo đơn thuốc
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Tìm kiếm theo tên bệnh nhân hoặc chẩn đoán..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredPrescriptions.map((prescription) => (
          <Card key={prescription._id} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100 hover:border-blue-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-blue-700">
                    <User className="h-6 w-6 text-blue-600" />
                    {prescription.patientId.fullName}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {prescription.patientId.email} • {prescription.patientId.phone}
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
                    <AlertCircle className="h-5 w-5 text-red-500" />
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
                <Label className="font-semibold flex items-center gap-2 text-lg text-green-700 mb-3">
                  <Pill className="h-5 w-5 text-green-600" />
                  Danh sách thuốc ({prescription.medications.length} loại):
                </Label>
                <div className="mt-3 space-y-3">
                  {prescription.medications.slice(0, 3).map((med, index) => (
                    <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 hover:border-green-300 transition-all duration-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-gray-600">
                            {med.dosage} - {med.frequency} - {med.duration}
                          </p>
                          <p className="text-sm text-gray-600">
                            Số lượng: {med.quantity} {med.unit}
                          </p>
                          {med.instructions && (
                            <p className="text-sm text-gray-600 mt-1">
                              Hướng dẫn: {med.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {prescription.medications.length > 3 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Và {prescription.medications.length - 3} loại thuốc khác...
                    </p>
                  )}
                </div>
              </div>

              {prescription.instructions && (
                <div className="mb-4">
                  <Label className="font-semibold">Hướng dẫn chung:</Label>
                  <p className="text-sm mt-1">{prescription.instructions}</p>
                </div>
              )}

              {prescription.notes && (
                <div className="mb-4">
                  <Label className="font-semibold">Ghi chú:</Label>
                  <p className="text-sm mt-1">{prescription.notes}</p>
                </div>
              )}

              {prescription.isFollowUpRequired && prescription.followUpDate && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <Label className="font-semibold text-blue-800">Ngày tái khám:</Label>
                  <p className="text-sm text-blue-700 mt-1">
                    {format(new Date(prescription.followUpDate), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openDetailDialog(prescription)}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEditDialog(prescription)}
                  className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-300"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
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
                {!prescription.isDispensed && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleMarkAsDispensed(prescription._id)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Đánh dấu đã phát
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeletePrescription(prescription._id)}
                  className="hover:bg-red-50 hover:border-red-300 transition-all duration-300"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrescriptions.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-full p-8 w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            <Pill className="h-16 w-16 text-blue-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">Không có đơn thuốc nào</h3>
          <p className="text-gray-500 text-lg">Hãy tạo đơn thuốc đầu tiên cho bệnh nhân</p>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="mr-2 h-5 w-5" />
            Tạo đơn thuốc đầu tiên
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Chỉnh sửa đơn thuốc
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-patientId" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Bệnh nhân
              </Label>
              <Select value={formData.patientId} onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient._id} value={patient._id}>
                      {patient.fullName} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-diagnosis" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Chẩn đoán
              </Label>
              <Input
                id="edit-diagnosis"
                value={formData.diagnosis}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Chẩn đoán bệnh"
                className="bg-white"
              />
            </div>
          </div>

          <div className="mt-6">
            <Label className="flex items-center gap-2 text-lg font-semibold">
              <Pill className="h-5 w-5 text-green-600" />
              Danh sách thuốc
            </Label>
            {formData.medications.map((med, index) => (
              <div key={index} className="border border-gray-200 p-4 rounded-lg mt-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Label>Tên thuốc</Label>
                      <Input
                        value={med.name}
                        onChange={(e) => {
                          updateMedication(index, 'name', e.target.value);
                          fetchMedicineSuggestions(e.target.value);
                        }}
                        placeholder="Tên thuốc"
                        className="bg-white"
                        autoComplete="off"
                      />
                      {suggestions.length > 0 && med.name && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-md max-h-40 overflow-auto">
                          {suggestions.map((sugg, si) => (
                            <div
                              key={si}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                updateMedication(index, 'name', sugg.name);
                                if (sugg.dosage) updateMedication(index, 'dosage', sugg.dosage);
                                setSuggestions([]);
                              }}
                            >
                              <div className="font-medium">{sugg.name}</div>
                              {sugg.dosage && <div className="text-xs text-gray-500">{sugg.dosage}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  <div>
                    <Label>Liều lượng</Label>
                    <Input
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      placeholder="Ví dụ: 500mg"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label>Tần suất</Label>
                    <Input
                      value={med.frequency}
                      onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                      placeholder="Ví dụ: 2 lần/ngày"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label>Thời gian</Label>
                    <Input
                      value={med.duration}
                      onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                      placeholder="Ví dụ: 7 ngày"
                      className="bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Hướng dẫn sử dụng</Label>
                    <Textarea
                      value={med.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      placeholder="Hướng dẫn chi tiết cách sử dụng"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label>Số lượng</Label>
                    <Input
                      type="number"
                      value={med.quantity}
                      onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label>Đơn vị</Label>
                    <Select value={med.unit} onValueChange={(value) => updateMedication(index, 'unit', value)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viên">Viên</SelectItem>
                        <SelectItem value="gói">Gói</SelectItem>
                        <SelectItem value="chai">Chai</SelectItem>
                        <SelectItem value="ống">Ống</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.medications.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => removeMedication(index)}
                  >
                    Xóa thuốc
                  </Button>
                )}
              </div>
            ))}
            
            <Button type="button" variant="outline" onClick={addMedication} className="mt-3 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
              <Plus className="mr-2 h-4 w-4" />
              Thêm thuốc
            </Button>
          </div>

          <div className="mt-6">
            <Label htmlFor="edit-instructions" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Hướng dẫn chung
            </Label>
                    <Textarea
                      id="edit-instructions"
                      value={formData.instructions}
                      onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="Hướng dẫn chung cho bệnh nhân"
                      rows={3}
                      className="bg-white"
                    />
          </div>

          <div className="mt-4">
            <Label htmlFor="edit-notes" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Ghi chú
            </Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ghi chú bổ sung"
              rows={2}
              className="bg-white"
            />
          </div>

          <div className="flex items-center space-x-4 mt-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isFollowUpRequired"
                checked={formData.isFollowUpRequired}
                onChange={(e) => setFormData(prev => ({ ...prev, isFollowUpRequired: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="edit-isFollowUpRequired">Yêu cầu tái khám</Label>
            </div>
            
            {formData.isFollowUpRequired && (
              <div>
                <Label htmlFor="edit-followUpDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ngày tái khám
                </Label>
                  <Input
                    id="edit-followUpDate"
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                    className="bg-white"
                  />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditPrescription} className="bg-blue-600 hover:bg-blue-700">
              Cập nhật đơn thuốc
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Chi tiết đơn thuốc
            </DialogTitle>
          </DialogHeader>
          
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Bệnh nhân:</Label>
                    <p className="text-sm mt-1">{selectedPrescription.patientId.fullName}</p>
                    <p className="text-xs text-gray-600">{selectedPrescription.patientId.email}</p>
                    <p className="text-xs text-gray-600">{selectedPrescription.patientId.phone}</p>
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
                    onClick={() => {
                      setShowDetailDialog(false);
                      openEditDialog(selectedPrescription);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Chỉnh sửa
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
