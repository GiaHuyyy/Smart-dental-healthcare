"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Eye,
  Calendar,
  User,
  Pill,
  Printer,
  X,
  AlertCircle,
  Activity,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
} from "lucide-react";
import { toast } from "sonner";
import TreatmentModal from "@/components/appointments/TreatmentModal";
import CreateFollowUpModal from "@/components/appointments/CreateFollowUpModal";

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
  avatarUrl?: string;
}

interface MedicalRecord {
  _id: string;
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  status: string;
  appointmentId?:
    | string
    | {
        _id: string;
        patientId: string;
        doctorId: string;
        appointmentDate: string;
        startTime: string;
        endTime: string;
        status: string;
        [key: string]: unknown;
      };
  doctorId?: {
    _id: string;
    fullName: string;
    specialty: string;
    email?: string;
  };
  patientId?: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  isFollowUpRequired?: boolean;
  followUpDate?: string;
  parentRecordId?: string | { _id: string }; // ID of parent medical record (for follow-up records)
  medications?: string[];
  detailedMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosisGroups?: Array<{
    diagnosis: string;
    treatmentPlans: string[];
  }>;
  notes?: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
  procedures?: Array<{
    name: string;
    description: string;
    date: string;
    cost: number;
    status: string;
  }>;
  dentalChart?: Array<{
    toothNumber: number;
    condition: string;
    treatment: string;
    notes: string;
  }>;
  attachments?: string[];
}

interface PatientMedicalRecordsProps {
  medicalRecords: MedicalRecord[];
  patient: Patient;
  onRefresh?: () => void;
}

export default function PatientMedicalRecords({ medicalRecords, patient, onRefresh }: PatientMedicalRecordsProps) {
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<MedicalRecord | null>(null);
  const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false);
  const [medicalRecordDetails, setMedicalRecordDetails] = useState<MedicalRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set()); // Track expanded parent records
  const router = useRouter();

  // Build hierarchy: separate parent records and child records
  const { parentRecords, childRecordsMap } = useMemo(() => {
    const parents: MedicalRecord[] = [];
    const childrenMap = new Map<string, MedicalRecord[]>();

    medicalRecords.forEach((record) => {
      const parentId = typeof record.parentRecordId === "string" ? record.parentRecordId : record.parentRecordId?._id;

      if (parentId) {
        // This is a child record
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(record);
      } else {
        // This is a parent record
        parents.push(record);
      }
    });

    // Sort children by date (oldest first)
    childrenMap.forEach((children) => {
      children.sort((a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime());
    });

    // Sort parents by date (newest first)
    parents.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());

    return { parentRecords: parents, childRecordsMap: childrenMap };
  }, [medicalRecords]);

  // Toggle expand/collapse for parent records
  const toggleExpand = (recordId: string) => {
    setExpandedRecords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
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

  const handleMedicalRecordClick = async (record: MedicalRecord) => {
    try {
      setMedicalRecordDetails(null);
      setSelectedMedicalRecord(record);
      setIsMedicalRecordModalOpen(true);

      // Fetch full details
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/v1/medical-records/${record._id}`);
      const data = await response.json();
      if (data && !data.error) {
        setMedicalRecordDetails(data.data || data);
      } else {
        setMedicalRecordDetails(record);
      }
    } catch (error) {
      console.error("Error fetching medical record details:", error);
      setMedicalRecordDetails(record);
    }
  };

  const closeMedicalRecordModal = () => {
    setIsMedicalRecordModalOpen(false);
    setSelectedMedicalRecord(null);
    setMedicalRecordDetails(null);

    // Refresh list when closing modal (after updates)
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleEditMedicalRecord = () => {
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    // Don't do anything else - modal detail stays open
  };

  const handleSubmitTreatment = async (formData: {
    chiefComplaints?: string[];
    diagnosisGroups?: Array<{ diagnosis: string; treatmentPlans: string[] }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
    notes?: string;
  }) => {
    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

      const requestBody = {
        chiefComplaint: formData.chiefComplaints?.join(", ") || medicalRecordDetails?.chiefComplaint,
        diagnosis: formData.diagnosisGroups?.map((g) => g.diagnosis).join(", ") || medicalRecordDetails?.diagnosis,
        treatmentPlan:
          formData.diagnosisGroups?.map((g) => g.treatmentPlans.join(", ")).join("; ") ||
          medicalRecordDetails?.treatmentPlan,
        // Thêm diagnosisGroups để lưu format mới
        diagnosisGroups: formData.diagnosisGroups || medicalRecordDetails?.diagnosisGroups,
        // Thêm detailedMedications để lưu format mới
        detailedMedications: formData.medications || medicalRecordDetails?.detailedMedications,
        // Giữ medications cũ để backwards compatibility
        medications:
          formData.medications?.map((m) => `${m.name} - ${m.dosage} - ${m.frequency}`) ||
          medicalRecordDetails?.medications,
        notes: formData.notes || medicalRecordDetails?.notes,
      };

      const response = await fetch(`${API_URL}/api/v1/medical-records/${selectedMedicalRecord?._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();

        // Update modal detail with new data
        setMedicalRecordDetails(result);

        // Close edit modal only (keep detail modal open)
        setIsEditModalOpen(false);

        // Show success toast
        toast.success("Cập nhật hồ sơ bệnh án thành công");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Update failed:", response.status, errorData);
        throw new Error(errorData.message || "Failed to update medical record");
      }
    } catch (error) {
      console.error("Error updating medical record:", error);
      toast.error("Cập nhật hồ sơ bệnh án thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Hồ sơ bệnh án ({medicalRecords.length})
          </h3>
          <button
            onClick={() => {
              router.push(`/doctor/schedule?patientId=${patient._id}`);
            }}
            className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tạo hồ sơ mới
          </button>
        </div>
        <div className="space-y-3">
          {medicalRecords.length > 0 ? (
            parentRecords.map((record) => {
              const childRecords = childRecordsMap.get(record._id) || [];
              const isExpanded = expandedRecords.has(record._id);
              const hasChildren = childRecords.length > 0;

              return (
                <div key={record._id} className="space-y-2">
                  {/* Parent Record */}
                  <div
                    className={`bg-white cursor-pointer rounded-md p-3 border-2 transition-all ${
                      hasChildren
                        ? "border-primary/20 shadow-sm hover:border-primary/30 hover:bg-primary/5"
                        : "border-gray-200 hover:border-primary/30 hover:bg-primary/5"
                    } ${hasChildren ? "" : "cursor-pointer group"}`}
                    onClick={() => handleMedicalRecordClick(record)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Expand/Collapse Button for Parent with Children */}
                        {hasChildren && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(record._id);
                            }}
                            className="shrink-0 w-10 h-10 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-primary" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-primary" />
                            )}
                          </button>
                        )}

                        {/* Icon for Parent without Children */}
                        {!hasChildren && (
                          <div
                            className="w-10 h-10 rounded-md bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                          >
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 text-sm">{formatDate(record.recordDate)}</h4>
                            {hasChildren && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary text-white">
                                📋 Hồ sơ gốc ({childRecords.length} tái khám)
                              </span>
                            )}
                            {!hasChildren && (
                              <Eye className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                          {record.patientId && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                              <User className="w-3 h-3" />
                              <span>BN. {record.patientId.fullName}</span>
                              <span className="text-gray-400">•</span>
                              <span>{record.patientId.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-13 space-y-2 text-sm">
                      <div className="bg-amber-50 rounded p-2">
                        <p className="text-xs font-medium text-amber-800 mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Triệu chứng
                        </p>
                        <p className="text-gray-700 line-clamp-2">{record.chiefComplaint}</p>
                      </div>

                      {/* Show diagnosisGroups or fallback to diagnosis */}
                      {record.diagnosisGroups && record.diagnosisGroups.length > 0 ? (
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" />
                            Chuẩn đoán
                          </p>
                          <div className="space-y-1">
                            {record.diagnosisGroups.map((group, idx) => (
                              <p key={idx} className="text-gray-700 text-xs line-clamp-1">
                                • {group.diagnosis}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        record.diagnosis && (
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Chẩn đoán
                            </p>
                            <p className="text-gray-700 line-clamp-2">{record.diagnosis}</p>
                          </div>
                        )
                      )}

                      {record.isFollowUpRequired && record.followUpDate && (
                        <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
                          <Calendar className="w-3 h-3" />
                          <span>Tái khám: {formatDate(record.followUpDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Child Records (Follow-ups) - Show when expanded */}
                  {hasChildren && isExpanded && (
                    <div className="ml-8 space-y-2 border-l-2 border-primary/30 pl-4">
                      {childRecords.map((childRecord, index) => (
                        <div
                          key={childRecord._id}
                          className="bg-white rounded-md p-3 border border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer group relative"
                          onClick={() => handleMedicalRecordClick(childRecord)}
                        >
                          {/* Child Indicator Line */}
                          <div className="absolute -left-4 top-5 w-4 h-0.5 bg-primary/30"></div>

                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 rounded-md bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0 transition-colors">
                                <CornerDownRight className="w-5 h-5 text-amber-700" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    {formatDate(childRecord.recordDate)}
                                  </h4>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-600 text-white">
                                    🔄 Tái khám {index + 1}
                                  </span>
                                  <Eye className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                {childRecord.patientId && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                    <User className="w-3 h-3" />
                                    <span>BN. {childRecord.patientId.fullName}</span>
                                    <span className="text-gray-400">•</span>
                                    <span>{childRecord.patientId.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-13 space-y-2 text-sm">
                            <div className="bg-amber-50 rounded p-2">
                              <p className="text-xs font-medium text-amber-800 mb-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Triệu chứng
                              </p>
                              <p className="text-gray-700 line-clamp-2">{childRecord.chiefComplaint}</p>
                            </div>

                            {childRecord.diagnosisGroups && childRecord.diagnosisGroups.length > 0 ? (
                              <div className="bg-blue-50 rounded p-2">
                                <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3" />
                                  Chuẩn đoán
                                </p>
                                <div className="space-y-1">
                                  {childRecord.diagnosisGroups.map((group, idx) => (
                                    <p key={idx} className="text-gray-700 text-xs line-clamp-1">
                                      • {group.diagnosis}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              childRecord.diagnosis && (
                                <div className="bg-blue-50 rounded p-2">
                                  <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    Chẩn đoán
                                  </p>
                                  <p className="text-gray-700 line-clamp-2">{childRecord.diagnosis}</p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm mb-4">Chưa có hồ sơ bệnh án nào</p>
              <button
                onClick={() => {
                  router.push(`/doctor/schedule?patientId=${patient._id}`);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Tạo hồ sơ đầu tiên
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Medical Record Detail Modal - Reusing Prescription Modal Style */}
      {isMedicalRecordModalOpen && selectedMedicalRecord && medicalRecordDetails && (
        <>
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-medical-record,
              .print-medical-record * {
                visibility: visible;
              }
              .print-medical-record {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50"
            onClick={closeMedicalRecordModal}
          >
            <div
              className="print-medical-record bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Chi tiết hồ sơ bệnh án</h2>
                      <p className="text-gray-600 text-sm">
                        Bệnh nhân: {patient.fullName} • Ngày khám: {formatDate(medicalRecordDetails.recordDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsFollowUpModalOpen(true);
                      }}
                      className="no-print inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      Đề xuất tái khám
                    </button>
                    <button
                      onClick={handleEditMedicalRecord}
                      className="no-print inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="no-print inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      In
                    </button>
                    <button
                      onClick={closeMedicalRecordModal}
                      className="no-print p-2 hover:bg-gray-100 rounded-lg"
                      aria-label="Đóng"
                    >
                      <X className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(95vh-120px)] overflow-y-auto">
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Thông tin bệnh nhân
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Họ tên:</span>{" "}
                          <span className="text-gray-900">{patient.fullName}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Tuổi:</span>{" "}
                          <span className="text-gray-900">
                            {patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : "N/A"} tuổi
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Giới tính:</span>{" "}
                          <span className="text-gray-900">
                            {patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">SĐT:</span>{" "}
                          <span className="text-gray-900">{patient.phone}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Email:</span>{" "}
                          <span className="text-gray-900">{patient.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Thông tin bác sĩ
                      </h3>
                      <div className="space-y-2 text-sm">
                        {medicalRecordDetails.doctorId && (
                          <>
                            <div>
                              <span className="font-medium text-gray-700">Bác sĩ:</span>{" "}
                              <span className="text-gray-900">{medicalRecordDetails.doctorId.fullName}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Chuyên khoa:</span>{" "}
                              <span className="text-gray-900">{medicalRecordDetails.doctorId.specialty}</span>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="font-medium text-gray-700">Ngày khám:</span>{" "}
                          <span className="text-gray-900">{formatDate(medicalRecordDetails.recordDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis Info */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Triệu chứng chính
                    </h3>
                    <p className="text-gray-800">{medicalRecordDetails.chiefComplaint}</p>
                  </div>

                  {/* Diagnosis Groups */}
                  {medicalRecordDetails.diagnosisGroups && medicalRecordDetails.diagnosisGroups.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" />
                        Chuẩn đoán
                      </h3>
                      <div className="space-y-3">
                        {medicalRecordDetails.diagnosisGroups.map((group, index) => (
                          <div key={index} className="bg-white rounded-md p-3 border border-blue-100">
                            <div className="flex items-start gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <p className="text-gray-900 font-medium">{group.diagnosis}</p>
                                {group.treatmentPlans && group.treatmentPlans.length > 0 && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <span className="font-medium">Phương pháp điều trị:</span>
                                    <ul className="mt-1 ml-4 list-disc">
                                      {group.treatmentPlans.map((plan, planIndex) => (
                                        <li key={planIndex}>{plan}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medications - New Design */}
                  {((medicalRecordDetails.detailedMedications && medicalRecordDetails.detailedMedications.length > 0) ||
                    (medicalRecordDetails.medications && medicalRecordDetails.medications.length > 0)) && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Pill className="w-5 h-5 text-primary" />
                          Danh sách thuốc
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {/* Priority: Use detailedMedications if available, fallback to medications */}
                        {medicalRecordDetails.detailedMedications && medicalRecordDetails.detailedMedications.length > 0
                          ? // Render detailedMedications (NEW format with full info)
                            medicalRecordDetails.detailedMedications.map((med, index) => (
                              <div key={index} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-4">
                                  {/* Number Badge */}
                                  <div className="shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-base mb-3">{med.name}</h4>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                      <div>
                                        <span className="text-gray-500 block mb-0.5">Liều lượng:</span>
                                        <span className="text-gray-900 font-medium">{med.dosage}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 block mb-0.5">Tần suất:</span>
                                        <span className="text-gray-900 font-medium">{med.frequency}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 block mb-0.5">Thời gian:</span>
                                        <span className="text-gray-900 font-medium">{med.duration}</span>
                                      </div>
                                    </div>

                                    {/* Instructions */}
                                    {med.instructions && (
                                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm border border-blue-100">
                                        <span className="text-blue-700 font-medium">💊 Hướng dẫn:</span>{" "}
                                        <span className="text-gray-900">{med.instructions}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          : // Fallback: Parse medications strings (OLD format)
                            medicalRecordDetails.medications?.map((med, index) => {
                              const parts = med.includes(" - ") ? med.split(" - ") : [med, "", "", ""];
                              const medName = parts[0];
                              const dosage = parts[1] || "";
                              const frequency = parts[2] || "";
                              const duration = parts[3] || "";

                              return (
                                <div key={index} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start gap-4">
                                    {/* Number Badge */}
                                    <div className="shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                                      <span className="text-sm font-semibold text-gray-600">#{index + 1}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-900 text-base mb-2">{medName}</h4>

                                      {/* Details Grid */}
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                        {dosage && (
                                          <div>
                                            <span className="text-gray-500 block mb-0.5">Liều lượng:</span>
                                            <span className="text-gray-900 font-medium">{dosage}</span>
                                          </div>
                                        )}
                                        {frequency && (
                                          <div>
                                            <span className="text-gray-500 block mb-0.5">Tần suất:</span>
                                            <span className="text-gray-900 font-medium">{frequency}</span>
                                          </div>
                                        )}
                                        {duration && (
                                          <div>
                                            <span className="text-gray-500 block mb-0.5">Thời gian:</span>
                                            <span className="text-gray-900 font-medium">{duration}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                      </div>
                    </div>
                  )}

                  {/* Vital Signs */}
                  {medicalRecordDetails.vitalSigns && Object.keys(medicalRecordDetails.vitalSigns).length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-semibold text-purple-900 mb-3">Chỉ số sinh tồn</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {medicalRecordDetails.vitalSigns.bloodPressure && (
                          <div>
                            <span className="font-medium text-gray-700">Huyết áp:</span>{" "}
                            <span className="text-gray-900">{medicalRecordDetails.vitalSigns.bloodPressure}</span>
                          </div>
                        )}
                        {medicalRecordDetails.vitalSigns.heartRate && (
                          <div>
                            <span className="font-medium text-gray-700">Nhịp tim:</span>{" "}
                            <span className="text-gray-900">{medicalRecordDetails.vitalSigns.heartRate} bpm</span>
                          </div>
                        )}
                        {medicalRecordDetails.vitalSigns.temperature && (
                          <div>
                            <span className="font-medium text-gray-700">Nhiệt độ:</span>{" "}
                            <span className="text-gray-900">{medicalRecordDetails.vitalSigns.temperature}°C</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  {(medicalRecordDetails.notes || medicalRecordDetails.followUpDate) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {medicalRecordDetails.notes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h3 className="font-semibold text-yellow-900 mb-2">Ghi chú</h3>
                          <p className="text-gray-800 text-sm">{medicalRecordDetails.notes}</p>
                        </div>
                      )}

                      {medicalRecordDetails.isFollowUpRequired && medicalRecordDetails.followUpDate && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Lịch tái khám
                          </h3>
                          <p className="text-gray-800 text-sm font-medium">
                            {formatDate(medicalRecordDetails.followUpDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                    <p className="text-sm text-gray-600">Hồ sơ này được tạo bởi hệ thống quản lý nha khoa thông minh</p>
                    <p className="text-xs text-gray-500 mt-1">In lúc: {new Date().toLocaleString("vi-VN")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Medical Record Modal - Using TreatmentModal */}
      {isEditModalOpen && medicalRecordDetails && patient && (
        <TreatmentModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          appointment={{
            id: medicalRecordDetails._id,
            patientId: patient._id,
            patientName: patient.fullName,
            patientAvatar: patient.avatarUrl,
            date: medicalRecordDetails.recordDate,
            // Extract startTime from appointmentId if it's an object
            startTime:
              typeof medicalRecordDetails.appointmentId === "object" && medicalRecordDetails.appointmentId?.startTime
                ? medicalRecordDetails.appointmentId.startTime
                : "09:00",
            phone: patient.phone,
            email: patient.email,
          }}
          onSubmit={handleSubmitTreatment}
          isSubmitting={isSubmitting}
          mode="update"
          initialData={{
            chiefComplaints:
              medicalRecordDetails.chiefComplaint
                ?.split(/[,，]/)
                .map((c) => c.trim())
                .filter(Boolean) || [],
            // Ưu tiên diagnosisGroups, fallback sang diagnosis cũ
            diagnosisGroups:
              medicalRecordDetails.diagnosisGroups && medicalRecordDetails.diagnosisGroups.length > 0
                ? medicalRecordDetails.diagnosisGroups
                : medicalRecordDetails.diagnosis
                ? [
                    {
                      diagnosis: medicalRecordDetails.diagnosis,
                      treatmentPlans: medicalRecordDetails.treatmentPlan
                        ?.split(/[;，]/)
                        .map((t) => t.trim())
                        .filter(Boolean) || [""],
                    },
                  ]
                : [{ diagnosis: "", treatmentPlans: [""] }],
            // Ưu tiên detailedMedications, fallback sang medications cũ
            medications:
              medicalRecordDetails.detailedMedications && medicalRecordDetails.detailedMedications.length > 0
                ? medicalRecordDetails.detailedMedications.map((med) => ({
                    ...med,
                    instructions: med.instructions || "",
                  }))
                : medicalRecordDetails.medications?.map((med) => {
                    const parts = med.includes(" - ") ? med.split(" - ") : [med, "", "", ""];
                    return {
                      name: parts[0] || "",
                      dosage: parts[1] || "",
                      frequency: parts[2] || "",
                      duration: parts[3] || "",
                      instructions: "",
                    };
                  }) || [],
            notes: medicalRecordDetails.notes || "",
            // BỎ status field
          }}
        />
      )}

      {/* Follow-up Appointment Modal */}
      {isFollowUpModalOpen && medicalRecordDetails && (
        <CreateFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => {
            setIsFollowUpModalOpen(false);
          }}
          medicalRecord={medicalRecordDetails}
          patientName={patient.fullName}
          onSuccess={async () => {
            // Close follow-up modal only (keep detail modal open)
            setIsFollowUpModalOpen(false);

            // Refetch medical record detail to show updated follow-up info
            if (selectedMedicalRecord) {
              try {
                const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
                const response = await fetch(`${API_URL}/api/v1/medical-records/${selectedMedicalRecord._id}`);
                if (response.ok) {
                  const updatedRecord = await response.json();
                  setMedicalRecordDetails(updatedRecord);
                }
              } catch (error) {
                console.error("Error refetching medical record:", error);
              }
            }
          }}
        />
      )}
    </>
  );
}
