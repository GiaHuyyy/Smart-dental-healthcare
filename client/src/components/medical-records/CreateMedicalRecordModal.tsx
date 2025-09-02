'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
}

interface CreateMedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function CreateMedicalRecordModal({
  isOpen,
  onClose,
  onSubmit
}: CreateMedicalRecordModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    recordDate: format(new Date(), 'yyyy-MM-dd'),
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    medications: [] as string[],
    notes: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: ''
    },
    isFollowUpRequired: false,
    followUpDate: '',
    status: 'active'
  });
  const [newMedication, setNewMedication] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/users/patients', { headers });
      if (!response.ok) {
        console.warn('Failed to fetch patients, status:', response.status);
        return;
      }

      const data = await response.json();
      // Ensure we always set an array to avoid "map is not a function" runtime errors
      if (Array.isArray(data)) {
        setPatients(data);
      } else if (Array.isArray(data?.data)) {
        setPatients(data.data);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        recordDate: new Date(formData.recordDate),
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : undefined,
        vitalSigns: {
          ...formData.vitalSigns,
          heartRate: formData.vitalSigns.heartRate ? Number(formData.vitalSigns.heartRate) : undefined,
          temperature: formData.vitalSigns.temperature ? Number(formData.vitalSigns.temperature) : undefined
        }
      };

      onSubmit(submitData);
    } catch (error) {
      console.error('Error creating medical record:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setFormData(prev => ({
        ...prev,
        medications: [...prev.medications, newMedication.trim()]
      }));
      setNewMedication('');
    }
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVitalSignsChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      vitalSigns: {
        ...prev.vitalSigns,
        [field]: value
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Tạo hồ sơ điều trị mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientId" className="text-gray-700 font-medium">Bệnh nhân *</Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => handleInputChange('patientId', value)}
              >
                <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Chọn bệnh nhân" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {(Array.isArray(patients) ? patients : []).map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      {patient.fullName} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordDate" className="text-gray-700 font-medium">Ngày khám *</Label>
              <Input
                id="recordDate"
                type="date"
                value={formData.recordDate}
                onChange={(e) => handleInputChange('recordDate', e.target.value)}
                required
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint" className="text-gray-700 font-medium">Triệu chứng chính *</Label>
            <Textarea
              id="chiefComplaint"
              placeholder="Mô tả triệu chứng chính của bệnh nhân..."
              value={formData.chiefComplaint}
              onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
              required
              rows={3}
              className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Vital Signs */}
          <div className="space-y-4">
            <Label className="text-gray-700 font-medium">Dấu hiệu sinh tồn</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodPressure" className="text-gray-600">Huyết áp</Label>
                <Input
                  id="bloodPressure"
                  placeholder="120/80 mmHg"
                  value={formData.vitalSigns.bloodPressure}
                  onChange={(e) => handleVitalSignsChange('bloodPressure', e.target.value)}
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartRate" className="text-gray-600">Nhịp tim</Label>
                <Input
                  id="heartRate"
                  type="number"
                  placeholder="80 bpm"
                  value={formData.vitalSigns.heartRate}
                  onChange={(e) => handleVitalSignsChange('heartRate', e.target.value)}
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-gray-600">Nhiệt độ</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="37.0°C"
                  value={formData.vitalSigns.temperature}
                  onChange={(e) => handleVitalSignsChange('temperature', e.target.value)}
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Diagnosis and Treatment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis" className="text-gray-700 font-medium">Chẩn đoán</Label>
              <Textarea
                id="diagnosis"
                placeholder="Chẩn đoán của bác sĩ..."
                value={formData.diagnosis}
                onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                rows={4}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatmentPlan" className="text-gray-700 font-medium">Kế hoạch điều trị</Label>
              <Textarea
                id="treatmentPlan"
                placeholder="Kế hoạch điều trị..."
                value={formData.treatmentPlan}
                onChange={(e) => handleInputChange('treatmentPlan', e.target.value)}
                rows={4}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <Label className="text-gray-700 font-medium">Thuốc điều trị</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nhập tên thuốc..."
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button type="button" onClick={addMedication} variant="outline" className="bg-white border-gray-300 hover:bg-gray-50">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.medications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.medications.map((medication, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                    {medication}
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isFollowUpRequired"
                  checked={formData.isFollowUpRequired}
                  onChange={(e) => handleInputChange('isFollowUpRequired', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isFollowUpRequired" className="text-gray-700 font-medium">Cần tái khám</Label>
              </div>
            </div>
            {formData.isFollowUpRequired && (
              <div className="space-y-2">
                <Label htmlFor="followUpDate" className="text-gray-700 font-medium">Ngày tái khám</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-gray-700 font-medium">Trạng thái</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="active">Đang điều trị</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-700 font-medium">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="Ghi chú bổ sung..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} className="bg-white border-gray-300 hover:bg-gray-50">
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !formData.patientId || !formData.chiefComplaint} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Đang tạo...' : 'Tạo hồ sơ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

