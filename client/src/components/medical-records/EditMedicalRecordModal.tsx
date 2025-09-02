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

interface MedicalRecord {
  _id: string;
  patientId: {
    _id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  doctorId: {
    _id?: string;
    fullName?: string;
    email?: string;
    specialty?: string;
  };
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  status: string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
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
  medications: string[];
  notes: string;
  attachments: string[];
}

interface EditMedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MedicalRecord;
  onSubmit: (data: any) => void;
}

export default function EditMedicalRecordModal({
  isOpen,
  onClose,
  record,
  onSubmit
}: EditMedicalRecordModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recordDate: format(new Date(record.recordDate), 'yyyy-MM-dd'),
    chiefComplaint: record.chiefComplaint,
    diagnosis: record.diagnosis || '',
    treatmentPlan: record.treatmentPlan || '',
    medications: record.medications || [],
    notes: record.notes || '',
    vitalSigns: {
      bloodPressure: record.vitalSigns?.bloodPressure || '',
      heartRate: record.vitalSigns?.heartRate?.toString() || '',
      temperature: record.vitalSigns?.temperature?.toString() || ''
    },
    isFollowUpRequired: record.isFollowUpRequired,
    followUpDate: record.followUpDate ? format(new Date(record.followUpDate), 'yyyy-MM-dd') : '',
    status: record.status
  });
  const [newMedication, setNewMedication] = useState('');

  useEffect(() => {
    if (isOpen && record) {
      setFormData({
        recordDate: format(new Date(record.recordDate), 'yyyy-MM-dd'),
        chiefComplaint: record.chiefComplaint,
        diagnosis: record.diagnosis || '',
        treatmentPlan: record.treatmentPlan || '',
        medications: record.medications || [],
        notes: record.notes || '',
        vitalSigns: {
          bloodPressure: record.vitalSigns?.bloodPressure || '',
          heartRate: record.vitalSigns?.heartRate?.toString() || '',
          temperature: record.vitalSigns?.temperature?.toString() || ''
        },
        isFollowUpRequired: record.isFollowUpRequired,
        followUpDate: record.followUpDate ? format(new Date(record.followUpDate), 'yyyy-MM-dd') : '',
        status: record.status
      });
    }
  }, [isOpen, record]);

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
      console.error('Error updating medical record:', error);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hồ sơ điều trị</DialogTitle>
          <p className="text-sm text-gray-600">
            Bệnh nhân: {record.patientId?.fullName || 'Chưa cập nhật'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Record Date */}
          <div className="space-y-2">
            <Label htmlFor="recordDate">Ngày khám *</Label>
            <Input
              id="recordDate"
              type="date"
              value={formData.recordDate}
              onChange={(e) => handleInputChange('recordDate', e.target.value)}
              required
            />
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label htmlFor="chiefComplaint">Triệu chứng chính *</Label>
            <Textarea
              id="chiefComplaint"
              placeholder="Mô tả triệu chứng chính của bệnh nhân..."
              value={formData.chiefComplaint}
              onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
              required
              rows={3}
            />
          </div>

          {/* Vital Signs */}
          <div className="space-y-4">
            <Label>Dấu hiệu sinh tồn</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodPressure">Huyết áp</Label>
                <Input
                  id="bloodPressure"
                  placeholder="120/80 mmHg"
                  value={formData.vitalSigns.bloodPressure}
                  onChange={(e) => handleVitalSignsChange('bloodPressure', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartRate">Nhịp tim</Label>
                <Input
                  id="heartRate"
                  type="number"
                  placeholder="80 bpm"
                  value={formData.vitalSigns.heartRate}
                  onChange={(e) => handleVitalSignsChange('heartRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Nhiệt độ</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="37.0°C"
                  value={formData.vitalSigns.temperature}
                  onChange={(e) => handleVitalSignsChange('temperature', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Diagnosis and Treatment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Chẩn đoán</Label>
              <Textarea
                id="diagnosis"
                placeholder="Chẩn đoán bệnh..."
                value={formData.diagnosis}
                onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatmentPlan">Kế hoạch điều trị</Label>
              <Textarea
                id="treatmentPlan"
                placeholder="Kế hoạch điều trị..."
                value={formData.treatmentPlan}
                onChange={(e) => handleInputChange('treatmentPlan', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <Label>Thuốc được kê</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nhập tên thuốc..."
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              />
              <Button type="button" onClick={addMedication} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.medications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.medications.map((medication, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
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
                  className="rounded"
                />
                <Label htmlFor="isFollowUpRequired">Cần tái khám</Label>
              </div>
            </div>
            {formData.isFollowUpRequired && (
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Ngày tái khám</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Đang điều trị</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="Ghi chú bổ sung..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !formData.chiefComplaint}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

