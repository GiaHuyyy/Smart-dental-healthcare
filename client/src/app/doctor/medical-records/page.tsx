"use client";

import CreateMedicalRecordModal from "@/components/medical-records/CreateMedicalRecordModal";
import TreatmentModal from "@/components/appointments/TreatmentModal";
import ExportMedicalRecord from "@/components/medical-records/ExportMedicalRecord";
import MedicalRecordDetailModal from "@/components/medical-records/MedicalRecordDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Plus,
  Search,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";

interface IdObject {
  _id?: string;
  id?: string;
}

type IdLike = string | IdObject | null | undefined;

interface PatientReference extends IdObject {
  fullName?: string;
  email?: string;
  phone?: string;
}

interface DoctorReference extends IdObject {
  fullName?: string;
  email?: string;
  specialty?: string;
}

interface MedicalRecordProcedure {
  name?: string;
  description?: string;
  date?: string;
  cost?: number | string;
  status?: string;
}

interface DentalChartEntry {
  toothNumber?: number | string;
  condition?: string;
  treatment?: string;
  notes?: string;
}

interface MedicalRecord {
  [key: string]: unknown;
  _id: string;
  patientId?: PatientReference | string;
  doctorId?: DoctorReference | string;
  recordDate: string;
  chiefComplaint: string;
  chiefComplaints?: string[];
  presentIllness?: string;
  physicalExamination?: string;
  diagnosis?: string;
  diagnosisGroups?: Array<{ diagnosis: string; treatmentPlans: string[] }>;
  treatmentPlan?: string;
  detailedMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  status: string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
  followUpTime?: string;
  followUpAppointmentId?: IdLike;
  appointmentId?: IdLike;
  procedures?: MedicalRecordProcedure[];
  dentalChart?: DentalChartEntry[];
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
  medications?: string[];
  notes?: string;
  attachments?: string[];
  parentId?: IdLike;
  originalRecordId?: IdLike;
  sourceRecordId?: IdLike;
  followUpOf?: IdLike;
  followUpOfId?: IdLike;
  parentRecordId?: IdLike;
  rootRecordId?: IdLike;
  relatedRecordId?: IdLike;
}

type MedicalRecordFormData = Record<string, unknown>;

interface FollowUpModalState {
  open: boolean;
  recordId?: string;
  date?: string;
  time?: string;
}

interface RecordsPayloadLike {
  data?: unknown;
  results?: unknown;
  records?: unknown;
}

const getIdFromValue = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as IdObject;
    if (typeof obj._id === "string") return obj._id;
    if (typeof obj.id === "string") return obj.id;
  }
  return undefined;
};

const DoctorStatistics = dynamic(() => import("@/components/medical-records/DoctorStatistics"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
});

type DetailModalProps = ComponentProps<typeof MedicalRecordDetailModal>;
type DetailModalRecord = DetailModalProps["record"];

const parseMedicalRecords = (input: unknown): MedicalRecord[] => {
  if (Array.isArray(input)) return input as MedicalRecord[];
  if (input && typeof input === "object") {
    const payload = input as RecordsPayloadLike;
    if (Array.isArray(payload.data)) return payload.data as MedicalRecord[];
    if (Array.isArray(payload.results)) return payload.results as MedicalRecord[];
    if (Array.isArray(payload.records)) return payload.records as MedicalRecord[];
  }
  return [];
};

const getPatientDetails = (patient: MedicalRecord["patientId"]): PatientReference | undefined => {
  if (!patient) return undefined;
  if (typeof patient === "string") {
    return {
      _id: patient,
      fullName: "Chưa cập nhật",
      email: "",
      phone: "",
    };
  }

  return {
    _id: patient._id ?? patient.id ?? "",
    fullName: patient.fullName ?? "Chưa cập nhật",
    email: patient.email ?? "",
    phone: patient.phone ?? "",
  };
};

const getDoctorDetails = (doctor: MedicalRecord["doctorId"]): DoctorReference | undefined => {
  if (!doctor) return undefined;
  if (typeof doctor === "string") {
    return {
      _id: doctor,
      fullName: "Chưa cập nhật",
      email: "",
      specialty: "",
    };
  }

  return {
    _id: doctor._id ?? doctor.id ?? "",
    fullName: doctor.fullName ?? "Chưa cập nhật",
    email: doctor.email ?? "",
    specialty: doctor.specialty ?? "",
  };
};

const getPatientName = (record: MedicalRecord): string => {
  const patient = getPatientDetails(record.patientId);
  if (patient?.fullName) return patient.fullName;
  if (typeof record.patientId === "string") return record.patientId;
  return "Chưa cập nhật";
};

const getPatientEmail = (record: MedicalRecord): string => {
  const patient = getPatientDetails(record.patientId);
  return patient?.email ?? "";
};

const getPatientInitial = (record: MedicalRecord): string => {
  const name = getPatientName(record);
  return name.charAt(0).toUpperCase() || "U";
};

const toDetailModalRecord = (record: MedicalRecord): DetailModalRecord => {
  const patient = getPatientDetails(record.patientId);
  const doctor = getDoctorDetails(record.doctorId);

  return {
    _id: record._id,
    patientId: patient
      ? {
          _id: patient._id ?? "",
          fullName: patient.fullName ?? "Chưa cập nhật",
          email: patient.email ?? "",
          phone: patient.phone ?? "",
        }
      : undefined,
    doctorId: doctor
      ? {
          _id: doctor._id ?? "",
          fullName: doctor.fullName ?? "Chưa cập nhật",
          email: doctor.email ?? "",
          specialty: doctor.specialty ?? "",
        }
      : undefined,
    recordDate: record.recordDate,
    chiefComplaint: record.chiefComplaint ?? "",
    diagnosis: record.diagnosis ?? "",
    treatmentPlan: record.treatmentPlan ?? "",
    status: record.status ?? "active",
    isFollowUpRequired: Boolean(record.isFollowUpRequired),
    followUpDate: record.followUpDate,
    vitalSigns: record.vitalSigns
      ? {
          bloodPressure: record.vitalSigns.bloodPressure ?? undefined,
          heartRate:
            typeof record.vitalSigns.heartRate === "number"
              ? record.vitalSigns.heartRate
              : record.vitalSigns.heartRate !== undefined
              ? Number(record.vitalSigns.heartRate) || undefined
              : undefined,
          temperature:
            typeof record.vitalSigns.temperature === "number"
              ? record.vitalSigns.temperature
              : record.vitalSigns.temperature !== undefined
              ? Number(record.vitalSigns.temperature) || undefined
              : undefined,
        }
      : undefined,
    procedures: (record.procedures ?? []).map((procedure) => ({
      name: procedure.name ?? "",
      description: procedure.description ?? "",
      date: procedure.date ?? record.recordDate,
      cost: typeof procedure.cost === "number" ? procedure.cost : Number(procedure.cost) || 0,
      status: procedure.status ?? "pending",
    })),
    dentalChart: (record.dentalChart ?? []).map((tooth) => ({
      toothNumber:
        typeof tooth.toothNumber === "number"
          ? tooth.toothNumber
          : tooth.toothNumber !== undefined
          ? Number(tooth.toothNumber) || 0
          : 0,
      condition: tooth.condition ?? "",
      treatment: tooth.treatment ?? "",
      notes: tooth.notes ?? "",
    })),
    medications: record.medications ? record.medications.map((item) => String(item)) : [],
    notes: record.notes ?? "",
    attachments: record.attachments ? record.attachments.map((item) => String(item)) : [],
  };
};

export default function DoctorMedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [followUpModal, setFollowUpModal] = useState<FollowUpModalState>({ open: false });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const detailModalRecord = useMemo(
    () => (selectedRecord ? toDetailModalRecord(selectedRecord) : null),
    [selectedRecord]
  );
  const [isSubmittingTreatment, setIsSubmittingTreatment] = useState(false);

  const fetchMedicalRecords = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/medical-records/doctor", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ message: "Không thể tải danh sách hồ sơ bệnh án" }));
        const description =
          typeof errorPayload === "object" && errorPayload && "message" in errorPayload
            ? String((errorPayload as { message?: unknown }).message ?? "Không thể tải danh sách hồ sơ bệnh án")
            : "Không thể tải danh sách hồ sơ bệnh án";
        showErrorToast("Lỗi", description);
        return;
      }

      const payload = await response.json().catch(() => []);
      setRecords(parseMedicalRecords(payload));
    } catch {
      showErrorToast("Lỗi", "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [showErrorToast]);

  const filterRecords = useCallback(() => {
    let filtered = records;

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((record) => {
        const patientName = getPatientName(record).toLowerCase();
        const complaint = record.chiefComplaint?.toLowerCase() ?? "";
        const diagnosis = record.diagnosis?.toLowerCase() ?? "";
        return patientName.includes(lowerSearch) || complaint.includes(lowerSearch) || diagnosis.includes(lowerSearch);
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    // Filter by tab
    switch (activeTab) {
      case "recent":
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = filtered.filter((record) => new Date(record.recordDate) >= oneWeekAgo);
        break;
      case "follow-up":
        filtered = filtered.filter((record) => record.isFollowUpRequired);
        break;
      case "active":
        filtered = filtered.filter((record) => record.status === "active");
        break;
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, statusFilter, activeTab]);

  useEffect(() => {
    setLoading(true);
    void fetchMedicalRecords();
  }, [fetchMedicalRecords]);

  // keep the doctor's view in sync: refresh on focus/visibility and poll periodically
  useEffect(() => {
    const onFocus = () => {
      void fetchMedicalRecords();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchMedicalRecords();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const intervalId = window.setInterval(() => {
      void fetchMedicalRecords();
    }, 20000); // 20s

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [fetchMedicalRecords]);

  useEffect(() => {
    filterRecords();
  }, [filterRecords]);

  const getAuthHeaders = useCallback((includeJson = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (includeJson) headers["Content-Type"] = "application/json";
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const handleCreateRecord = async (formData: MedicalRecordFormData) => {
    try {
      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const text = await response.text();
        showErrorToast("Lỗi", text || "Không thể tạo hồ sơ bệnh án");
        return;
      }

      showSuccessToast("Thành công", "Hồ sơ bệnh án đã được tạo thành công");
      setShowCreateModal(false);
      setLoading(true);
      await fetchMedicalRecords();
    } catch {
      showErrorToast("Lỗi", "Có lỗi xảy ra khi tạo hồ sơ");
    }
  };

  const handleUpdateRecord = async (id: string, formData: MedicalRecordFormData) => {
    try {
      const response = await fetch(`/api/medical-records/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const text = await response.text();
        showErrorToast("Lỗi", text || "Không thể cập nhật hồ sơ bệnh án");
        return false; // Return false on error
      }

      showSuccessToast("Thành công", "Hồ sơ bệnh án đã được cập nhật thành công");
      // Don't close modal here - let onSubmit callback handle it
      setLoading(true);
      await fetchMedicalRecords();
      return true; // Return true on success
    } catch {
      showErrorToast("Lỗi", "Có lỗi xảy ra khi cập nhật hồ sơ");
      return false; // Return false on error
    }
  };

  const handleExportRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowExportModal(true);
  };

  const openFollowUpModal = (recordId: string, date?: string, time?: string) => {
    setFollowUpModal({
      open: true,
      recordId,
      date: date ? new Date(date).toISOString().slice(0, 10) : "",
      time: time ?? "09:00",
    });
  };

  const closeFollowUpModal = () => setFollowUpModal({ open: false });

  const saveFollowUpFromModal = async (recordId?: string, date?: string, time?: string) => {
    if (!recordId) return false;
    const existingRecord = records.find((record) => record._id === recordId);
    const hasDate = Boolean(date && date.trim());
    const normalizedTime = time && time.trim() ? time.trim() : "09:00";
    const payload = hasDate
      ? {
          followUpDate: date,
          followUpTime: normalizedTime,
          isFollowUpRequired: true,
        }
      : {
          followUpDate: null,
          followUpTime: null,
          isFollowUpRequired: false,
        };

    try {
      const response = await fetch(`/api/medical-records/${recordId}/follow-up`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        showErrorToast("Lỗi", text || "Không thể cập nhật tái khám");
        return false;
      }

      await fetchMedicalRecords();

      const successMessage = hasDate
        ? existingRecord?.isFollowUpRequired
          ? "Đã cập nhật lịch tái khám"
          : "Đã đặt lịch tái khám"
        : "Đã hủy lịch tái khám";

      showSuccessToast("Thành công", successMessage);
      setFollowUpModal({ open: false });
      return true;
    } catch {
      showErrorToast("Lỗi", "Có lỗi khi lưu tái khám");
      return false;
    }
  };

  const cancelFollowUp = async (recordId?: string) => {
    if (!recordId) return false;
    return saveFollowUpFromModal(recordId);
  };

  const handleMarkCompleted = async (recordId: string) => {
    try {
      const response = await fetch(`/api/medical-records/${recordId}`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status: "completed", isFollowUpRequired: false, followUpDate: null }),
      });

      if (!response.ok) {
        const text = await response.text();
        showErrorToast("Lỗi", text || "Không thể cập nhật trạng thái");
        return;
      }

      setRecords((prev) =>
        prev.map((record) =>
          record._id === recordId
            ? { ...record, status: "completed", isFollowUpRequired: false, followUpDate: undefined }
            : record
        )
      );
      showSuccessToast("Thành công", "Đã cập nhật trạng thái là Hoàn thành");
    } catch {
      showErrorToast("Lỗi", "Có lỗi khi cập nhật trạng thái");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Đang điều trị", variant: "default" as const, icon: Activity },
      completed: { label: "Hoàn thành", variant: "secondary" as const, icon: CheckCircle },
      pending: { label: "Chờ xử lý", variant: "outline" as const, icon: Clock },
      cancelled: { label: "Đã hủy", variant: "destructive" as const, icon: AlertCircle },
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
    return records.filter((record) => record.status === status).length;
  };

  // Build parent -> children mapping using common linking fields if present in the payload
  const { roots, childrenMap } = useMemo(() => {
    const recordMap: Record<string, MedicalRecord> = {};
    const children: Record<string, MedicalRecord[]> = {};
    const rootRecords: MedicalRecord[] = [];

    const candidateKeys = [
      "parentId",
      "originalRecordId",
      "sourceRecordId",
      "followUpOf",
      "followUpOfId",
      "parentRecordId",
      "rootRecordId",
      "relatedRecordId",
    ];

    filteredRecords.forEach((record) => {
      recordMap[record._id] = record;
    });

    filteredRecords.forEach((record) => {
      let parentFound: string | undefined;
      for (const key of candidateKeys) {
        const value = record[key];
        const parentId = getIdFromValue(value);
        if (parentId && recordMap[parentId]) {
          parentFound = parentId;
          break;
        }
      }

      if (parentFound) {
        if (!children[parentFound]) {
          children[parentFound] = [];
        }
        children[parentFound].push(record);
      } else {
        rootRecords.push(record);
      }
    });

    if (Object.keys(children).length === 0) {
      const byPatient: Record<string, MedicalRecord[]> = {};
      filteredRecords.forEach((record) => {
        const patientId = getIdFromValue(record.patientId);
        if (!patientId) return;
        if (!byPatient[patientId]) {
          byPatient[patientId] = [];
        }
        byPatient[patientId].push(record);
      });

      const fallbackChildren: Record<string, MedicalRecord[]> = {};
      const fallbackRoots: MedicalRecord[] = [];

      const DAY = 24 * 60 * 60 * 1000;
      const WINDOW = 120 * DAY; // 120 days

      Object.keys(byPatient).forEach((patientId) => {
        const arr = byPatient[patientId]
          .slice()
          .sort((a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime());

        for (let i = 0; i < arr.length; i += 1) {
          const candidateParent = arr[i];
          if (!(candidateParent.status === "completed" || candidateParent.isFollowUpRequired)) {
            continue;
          }

          for (let j = i + 1; j < arr.length; j += 1) {
            const possibleChild = arr[j];
            const possibleChildDate = new Date(possibleChild.recordDate).getTime();
            const candidateParentDate = new Date(candidateParent.recordDate).getTime();

            if (possibleChildDate >= candidateParentDate && possibleChildDate - candidateParentDate <= WINDOW) {
              if (!fallbackChildren[candidateParent._id]) {
                fallbackChildren[candidateParent._id] = [];
              }
              fallbackChildren[candidateParent._id].push(possibleChild);
            }
          }
        }
      });

      const childIds = new Set<string>();
      Object.values(fallbackChildren).forEach((childList) => {
        childList.forEach((child) => childIds.add(child._id));
      });

      filteredRecords.forEach((record) => {
        if (childIds.has(record._id)) {
          return;
        }
        fallbackRoots.push(record);
      });

      if (Object.keys(fallbackChildren).length > 0) {
        return { roots: fallbackRoots, childrenMap: fallbackChildren };
      }
    }

    return { roots: rootRecords, childrenMap: children };
  }, [filteredRecords]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          background: "linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--color-primary)" }}
          ></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Local FollowUpModal (copied from patient detail page implementation)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="healthcare-card-elevated p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="healthcare-heading text-3xl">Hồ sơ điều trị</h1>
                <p className="healthcare-body mt-1">Quản lý hồ sơ bệnh án của bệnh nhân một cách hiệu quả</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setShowStatistics(!showStatistics)}
                className="btn-healthcare-secondary flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Thống kê
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="btn-healthcare-primary flex items-center gap-2"
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
                  <p className="text-3xl font-bold">{getStatusCount("active")}</p>
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
                  <p className="text-3xl font-bold">{getStatusCount("completed")}</p>
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
                  <p className="text-3xl font-bold">{records.filter((r) => r.isFollowUpRequired).length}</p>
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
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12"
                >
                  Tất cả ({records.length})
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12"
                >
                  Gần đây
                </TabsTrigger>
                <TabsTrigger
                  value="follow-up"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12"
                >
                  Cần tái khám ({records.filter((r) => r.isFollowUpRequired).length})
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 rounded-none border-b-2 data-[state=active]:border-b-blue-600 h-12"
                >
                  Đang điều trị ({getStatusCount("active")})
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
                        {activeTab === "all"
                          ? "Chưa có hồ sơ bệnh án nào được tạo. Hãy bắt đầu bằng cách tạo hồ sơ đầu tiên."
                          : activeTab === "follow-up"
                          ? "Không có bệnh nhân nào cần tái khám trong thời gian này."
                          : "Không có hồ sơ nào phù hợp với bộ lọc hiện tại."}
                      </p>
                      {activeTab === "all" && (
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
                  // Render roots and nested follow-ups if any
                  roots.map((record) => {
                    const kids = childrenMap[record._id] || [];
                    const isExpanded = !!expanded[record._id];

                    return (
                      <div key={record._id}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {kids.length > 0 ? (
                              <button
                                onClick={() => setExpanded((prev) => ({ ...prev, [record._id]: !prev[record._id] }))}
                                className="flex items-center gap-2 text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                Hồ sơ góc
                                <span className="ml-1 text-xs text-gray-500">({kids.length})</span>
                              </button>
                            ) : (
                              <span className="text-sm text-gray-600 px-2 py-1">Hồ sơ</span>
                            )}
                          </div>

                          <div className="text-sm text-gray-500">{getPatientName(record)}</div>
                        </div>

                        {/* Root record card (use existing card style) */}
                        <Card
                          key={record._id}
                          className="hover:shadow-lg transition-all duration-300 border-gray-100 hover:border-blue-200 group bg-white/80 backdrop-blur-sm"
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                              <div className="flex-1 space-y-4">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                      {getPatientInitial(record)}
                                    </div>
                                    <div>
                                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {getPatientName(record)}
                                      </h3>
                                      <p className="text-gray-500 text-sm">{getPatientEmail(record)}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {getStatusBadge(record.status)}
                                    {record.isFollowUpRequired && (
                                      <Badge
                                        variant="outline"
                                        className="text-orange-600 border-orange-600 bg-orange-50"
                                      >
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
                                      <span>{format(new Date(record.recordDate), "dd/MM/yyyy", { locale: vi })}</span>
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
                                        <span>
                                          {format(new Date(record.followUpDate), "dd/MM/yyyy HH:mm", { locale: vi })}
                                        </span>
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
                                {/* Only show "Đã điều trị" button for active records */}
                                {record.status === "active" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleMarkCompleted(record._id)}
                                    className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200 text-green-700 bg-white/80 backdrop-blur-sm"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="hidden lg:inline">Đã điều trị</span>
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (record.isFollowUpRequired) {
                                      await cancelFollowUp(record._id);
                                    } else {
                                      const oneMonth = new Date();
                                      oneMonth.setMonth(oneMonth.getMonth() + 1);
                                      openFollowUpModal(record._id, oneMonth.toISOString(), "09:00");
                                    }
                                  }}
                                  className="flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 bg-white/80 backdrop-blur-sm"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="hidden lg:inline">
                                    {record.isFollowUpRequired ? "Hủy tái khám" : "Cần tái khám"}
                                  </span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Children follow-up cards rendered as full records (indented) */}
                        {isExpanded && kids.length > 0 && (
                          <div className="space-y-4 mt-3">
                            {kids.map((child) => (
                              <Card
                                key={child._id}
                                className="ml-8 hover:shadow-lg transition-all duration-300 border-gray-100 hover:border-blue-200 group bg-white/80 backdrop-blur-sm"
                              >
                                <CardContent className="p-6">
                                  <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                                    <div className="flex-1 space-y-4">
                                      {/* Header */}
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                            {getPatientInitial(child)}
                                          </div>
                                          <div>
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                              {getPatientName(child)}
                                            </h3>
                                            <p className="text-gray-500 text-sm">{getPatientEmail(child)}</p>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {getStatusBadge(child.status)}
                                          {child.isFollowUpRequired && (
                                            <Badge
                                              variant="outline"
                                              className="text-orange-600 border-orange-600 bg-orange-50"
                                            >
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
                                            <span>
                                              {format(new Date(child.recordDate), "dd/MM/yyyy", { locale: vi })}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 text-gray-700">
                                            <Stethoscope className="h-5 w-5 text-green-500" />
                                            <span className="font-medium">Triệu chứng:</span>
                                            <span className="text-gray-600">{child.chiefComplaint}</span>
                                          </div>
                                          {child.followUpDate && (
                                            <div className="flex items-center gap-3 text-orange-600">
                                              <Clock className="h-5 w-5" />
                                              <span className="font-medium">Tái khám:</span>
                                              <span>
                                                {format(new Date(child.followUpDate), "dd/MM/yyyy HH:mm", {
                                                  locale: vi,
                                                })}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="space-y-3">
                                          {child.diagnosis && (
                                            <div className="text-gray-700">
                                              <span className="font-medium text-gray-900">Chẩn đoán:</span>
                                              <p className="text-gray-600 mt-1 leading-relaxed">{child.diagnosis}</p>
                                            </div>
                                          )}
                                          {child.treatmentPlan && (
                                            <div className="text-gray-700">
                                              <span className="font-medium text-gray-900">Kế hoạch điều trị:</span>
                                              <p className="text-gray-600 mt-1 leading-relaxed">
                                                {child.treatmentPlan}
                                              </p>
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
                                          setSelectedRecord(child);
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
                                          setSelectedRecord(child);
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
                                        onClick={() => handleExportRecord(child)}
                                        className="flex items-center gap-2 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 bg-white/80 backdrop-blur-sm"
                                      >
                                        <Download className="h-4 w-4" />
                                        <span className="hidden lg:inline">Xuất</span>
                                      </Button>
                                      {/* Only show "Đã điều trị" button for active records */}
                                      {child.status === "active" && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleMarkCompleted(child._id)}
                                          className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200 text-green-700 bg-white/80 backdrop-blur-sm"
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                          <span className="hidden lg:inline">Đã điều trị</span>
                                        </Button>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          if (child.isFollowUpRequired) {
                                            await cancelFollowUp(child._id);
                                          } else {
                                            const oneMonth = new Date();
                                            oneMonth.setMonth(oneMonth.getMonth() + 1);
                                            openFollowUpModal(child._id, oneMonth.toISOString(), "09:00");
                                          }
                                        }}
                                        className="flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 bg-white/80 backdrop-blur-sm"
                                      >
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="hidden lg:inline">
                                          {child.isFollowUpRequired ? "Hủy tái khám" : "Cần tái khám"}
                                        </span>
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
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

      {showDetailModal && detailModalRecord && (
        <MedicalRecordDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          record={detailModalRecord}
          onEdit={() => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      {showEditModal && selectedRecord && (
        <TreatmentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRecord(null);
          }}
          mode="update"
          appointment={{
            _id: selectedRecord._id,
            id: selectedRecord._id,
            patientId:
              typeof selectedRecord.patientId === "string"
                ? selectedRecord.patientId
                : selectedRecord.patientId?._id
                ? { _id: selectedRecord.patientId._id }
                : undefined,
            patientName: getPatientName(selectedRecord),
            patientAvatar: "",
            date: selectedRecord.recordDate,
            startTime: "09:00",
            phone: getPatientDetails(selectedRecord.patientId)?.phone ?? "",
            email: getPatientEmail(selectedRecord),
          }}
          initialData={{
            chiefComplaints:
              selectedRecord.chiefComplaints ||
              (selectedRecord.chiefComplaint ? selectedRecord.chiefComplaint.split(", ") : []),
            presentIllness: selectedRecord.presentIllness || "",
            physicalExamination: selectedRecord.physicalExamination || "",
            diagnosisGroups:
              selectedRecord.diagnosisGroups ||
              (selectedRecord.diagnosis
                ? [
                    {
                      diagnosis: selectedRecord.diagnosis,
                      treatmentPlans: selectedRecord.treatmentPlan ? selectedRecord.treatmentPlan.split(", ") : [""],
                    },
                  ]
                : [{ diagnosis: "", treatmentPlans: [""] }]),
            notes: selectedRecord.notes || "",
            medications:
              selectedRecord.detailedMedications ||
              (selectedRecord.medications
                ? selectedRecord.medications.map((name) => ({
                    name: typeof name === "string" ? name : String(name),
                    dosage: "",
                    frequency: "",
                    duration: "",
                    instructions: "",
                  }))
                : []),
            status: selectedRecord.status || "active", // Add status to initialData
          }}
          onSubmit={async (formData) => {
            if (!selectedRecord) return;

            setIsSubmittingTreatment(true);
            try {
              // Convert formData to match backend expected format
              const updateData = {
                chiefComplaint: formData.chiefComplaints.join(", "),
                chiefComplaints: formData.chiefComplaints,
                presentIllness: formData.presentIllness,
                physicalExamination: formData.physicalExamination,
                diagnosis: formData.diagnosisGroups
                  .filter((g) => g.diagnosis.trim())
                  .map((g) => g.diagnosis)
                  .join(", "),
                diagnosisGroups: formData.diagnosisGroups,
                treatmentPlan: formData.diagnosisGroups
                  .flatMap((g) => g.treatmentPlans)
                  .filter((t) => t.trim())
                  .join(", "),
                medications: formData.medications.map((m) => m.name),
                detailedMedications: formData.medications,
                notes: formData.notes,
                status: formData.status || "active", // Add status to update data
                recordDate: new Date(),
              };

              const success = await handleUpdateRecord(selectedRecord._id, updateData);
              if (success) {
                setShowEditModal(false);
                setSelectedRecord(null);
              }
            } catch (error) {
              console.error("Update error:", error);
            } finally {
              setIsSubmittingTreatment(false);
            }
          }}
          isSubmitting={isSubmittingTreatment}
          accessToken={localStorage.getItem("token") || undefined}
        />
      )}

      {showExportModal && selectedRecord && (
        <ExportMedicalRecord recordId={selectedRecord._id} onClose={() => setShowExportModal(false)} />
      )}
      {/* Follow-up modal for record-level 'Tái khám' actions */}
      <FollowUpModal
        open={followUpModal.open}
        recordId={followUpModal.recordId}
        date={followUpModal.date}
        time={followUpModal.time}
        onClose={closeFollowUpModal}
        onSave={saveFollowUpFromModal}
      />
    </div>
  );
}

// Local FollowUpModal (copied from patient detail page implementation)
function FollowUpModal({
  open,
  recordId,
  date,
  time,
  onClose,
  onSave,
}: {
  open: boolean;
  recordId?: string;
  date?: string;
  time?: string;
  onClose: () => void;
  onSave: (id?: string, date?: string, time?: string) => Promise<boolean> | boolean;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(date || "");
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelectedDate(date || ""), [date]);
  useEffect(() => setSelectedTime(time || "09:00"), [time]);

  if (!open) return null;

  const choose = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900">Đặt lịch tái khám</h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => choose(1)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              +1 tháng
            </button>
            <button
              onClick={() => choose(3)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              +3 tháng
            </button>
            <button
              onClick={() => choose(6)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              +6 tháng
            </button>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày tái khám (tùy chọn)</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Giờ (tùy chọn)</label>
            <input
              type="time"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={() => {
              if (!saving) onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            Hủy
          </button>
          <button
            onClick={async () => {
              setSaving(true);
              try {
                const ok = await onSave(recordId, selectedDate, selectedTime);
                if (ok) onClose();
              } finally {
                setSaving(false);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
