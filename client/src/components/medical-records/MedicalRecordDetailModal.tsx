'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  User, 
  Stethoscope, 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Download,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface MedicalRecord {
  _id: string;
  patientId?: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  doctorId?: {
    _id: string;
    fullName: string;
    email: string;
    specialty: string;
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

interface MedicalRecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MedicalRecord;
  onEdit?: () => void;
  isPatientView?: boolean;
}

export default function MedicalRecordDetailModal({
  isOpen,
  onClose,
  record,
  onEdit,
  isPatientView = false
}: MedicalRecordDetailModalProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Đang điều trị', variant: 'default' as const, icon: Clock },
      completed: { label: 'Hoàn thành', variant: 'secondary' as const, icon: CheckCircle },
      pending: { label: 'Chờ xử lý', variant: 'outline' as const, icon: Clock },
      cancelled: { label: 'Đã hủy', variant: 'destructive' as const, icon: XCircle }
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

  const getProcedureStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge variant="secondary">Hoàn thành</Badge>;
    }
    return <Badge variant="outline">Đang thực hiện</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Chi tiết hồ sơ điều trị</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {format(new Date(record.recordDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
              </p>
            </div>
            <div className="flex gap-2">
              {onEdit && !isPatientView && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Xuất PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Bệnh nhân:</span>
                <span>{isPatientView ? record.doctorId?.fullName : record.patientId?.fullName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Stethoscope className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Bác sĩ:</span>
                <span>{isPatientView ? record.doctorId?.fullName : record.doctorId?.fullName}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Ngày khám:</span>
                <span>{format(new Date(record.recordDate), 'dd/MM/yyyy', { locale: vi })}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(record.status)}
                {record.isFollowUpRequired && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Cần tái khám
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Triệu chứng chính
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">{record.chiefComplaint}</p>
          </div>

          {/* Vital Signs */}
          {record.vitalSigns && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Dấu hiệu sinh tồn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {record.vitalSigns.bloodPressure && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-medium text-gray-600">Huyết áp</p>
                    <p className="text-lg font-semibold">{record.vitalSigns.bloodPressure}</p>
                  </div>
                )}
                {record.vitalSigns.heartRate && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-medium text-gray-600">Nhịp tim</p>
                    <p className="text-lg font-semibold">{record.vitalSigns.heartRate} bpm</p>
                  </div>
                )}
                {record.vitalSigns.temperature && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-medium text-gray-600">Nhiệt độ</p>
                    <p className="text-lg font-semibold">{record.vitalSigns.temperature}°C</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnosis and Treatment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {record.diagnosis && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Chẩn đoán</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{record.diagnosis}</p>
              </div>
            )}
            {record.treatmentPlan && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Kế hoạch điều trị</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{record.treatmentPlan}</p>
              </div>
            )}
          </div>

          {/* Medications */}
          {record.medications && record.medications.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Thuốc được kê</h3>
              <div className="flex flex-wrap gap-2">
                {record.medications.map((medication, index) => (
                  <Badge key={index} variant="secondary">{medication}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Procedures */}
          {record.procedures && record.procedures.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Thủ thuật đã thực hiện</h3>
              <div className="space-y-3">
                {record.procedures.map((procedure, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{procedure.name}</h4>
                      {getProcedureStatusBadge(procedure.status)}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{procedure.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Ngày: {format(new Date(procedure.date), 'dd/MM/yyyy', { locale: vi })}</span>
                      <span>Chi phí: {procedure.cost.toLocaleString('vi-VN')} VNĐ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dental Chart */}
          {record.dentalChart && record.dentalChart.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Sơ đồ răng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {record.dentalChart.map((tooth, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Răng {tooth.toothNumber}</span>
                      <Badge variant="outline" className="text-xs">
                        {tooth.condition}
                      </Badge>
                    </div>
                    {tooth.treatment && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Điều trị:</span> {tooth.treatment}
                      </p>
                    )}
                    {tooth.notes && (
                      <p className="text-xs text-gray-500">{tooth.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up */}
          {record.isFollowUpRequired && record.followUpDate && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                Lịch tái khám
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="font-medium">
                  Ngày tái khám: {format(new Date(record.followUpDate), 'EEEE, dd/MM/yyyy', { locale: vi })}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Ghi chú</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{record.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {record.attachments && record.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Tệp đính kèm</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {record.attachments.map((attachment, index) => (
                  <div key={index} className="border rounded p-2 text-center">
                    <FileText className="h-8 w-8 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-600 truncate">Tệp {index + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

