"use client";

import CreateMedicalRecordModal from "@/components/medical-records/CreateMedicalRecordModal";
import DoctorStatistics from "@/components/medical-records/DoctorStatistics";
import EditMedicalRecordModal from "@/components/medical-records/EditMedicalRecordModal";
import ExportMedicalRecord from "@/components/medical-records/ExportMedicalRecord";
import MedicalRecordDetailModal from "@/components/medical-records/MedicalRecordDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { sendRequest } from "@/utils/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
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
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const router = useRouter();
  // helper wrapper to bypass strict Toast typing in some places where 'variant' is used
  const toastAny = (payload: any) => (toast as any)(payload);
  const [followUpModal, setFollowUpModal] = useState<{ open: boolean; recordId?: string; date?: string }>({ open: false });

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, statusFilter, activeTab]);

  const fetchMedicalRecords = async () => {
    try {
      const response = await fetch("/api/medical-records/doctor", {
        headers: {
          Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        const errorData = await response.json();
        toastAny({
          title: "Lỗi",
          description: errorData.message || "Không thể tải danh sách hồ sơ bệnh án",
          variant: "destructive",
        });
      }
    } catch (error) {
      toastAny({ title: "Lỗi", description: "Có lỗi xảy ra khi tải dữ liệu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          (record.patientId?.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
  };

  const handleCreateRecord = async (data: any) => {
    try {
      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Hồ sơ bệnh án đã được tạo thành công",
        });
        setShowCreateModal(false);
        fetchMedicalRecords();
      } else {
        toastAny({ title: "Lỗi", description: "Không thể tạo hồ sơ bệnh án", variant: "destructive" });
      }
    } catch (error) {
        toastAny({ title: "Lỗi", description: "Có lỗi xảy ra khi tạo hồ sơ", variant: "destructive" });
    }
  };

  const handleUpdateRecord = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/medical-records/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toastAny({ title: "Thành công", description: "Hồ sơ bệnh án đã được cập nhật thành công" });
        setShowEditModal(false);
        fetchMedicalRecords();
      } else {
        toastAny({ title: "Lỗi", description: "Không thể cập nhật hồ sơ bệnh án", variant: "destructive" });
      }
    } catch (error) {
        toastAny({ title: "Lỗi", description: "Có lỗi xảy ra khi cập nhật hồ sơ", variant: "destructive" });
    }
  };

  const handleExportRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowExportModal(true);
  };

  const openFollowUpModal = (recordId: string, date?: string) => {
    setFollowUpModal({ open: true, recordId, date: date ? new Date(date).toISOString().slice(0,10) : '' });
  };

  const closeFollowUpModal = () => setFollowUpModal({ open: false });

  const saveFollowUpFromModal = async (recordId?: string, date?: string, time?: string) => {
    if (!recordId) return false;
    const followUpDate = date || null;
    const followUpTime = time || '09:00';
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = { followUpDate, isFollowUpRequired: !!followUpDate };

      const res = await fetch(`/api/medical-records/${recordId}/follow-up`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        let msg = 'Không thể cập nhật tái khám';
        // Read body once as text, then try to parse JSON out of it.
        try {
          const txt = await res.text();
          if (txt) {
            try {
              const json = JSON.parse(txt);
              msg = json?.message || json?.error || txt || msg;
            } catch (e) {
              msg = txt;
            }
          }
        } catch (e) {
          // ignore
        }
        toastAny({ title: 'Lỗi', description: msg, variant: 'destructive' });
        return false;
      }

      const updated = await res.json();
      setRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate || undefined } : r));
      setFilteredRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate || undefined } : r));
      toast({ title: 'Thành công', description: 'Đã cập nhật tái khám' });

      // Try to create an appointment automatically for this follow-up
      try {
        if (updated && updated.followUpDate) {
          // find the record to extract patient & doctor
          let rec = (records || []).find((x) => x._id === recordId) as any;
          let patientId = rec?.patientId?._id || (rec?.patientId || (updated.patientId && updated.patientId._id)) || undefined;
          let doctorId = updated.doctorId?._id || rec?.doctorId?._id || undefined;

          // If either id is missing, fetch the authoritative record from server
          if ((!patientId || !doctorId)) {
            try {
              const token = localStorage.getItem('token');
              const headers: Record<string,string> = { 'Content-Type': 'application/json' };
              if (token) headers['Authorization'] = `Bearer ${token}`;
              const recRes = await fetch(`/api/medical-records/${recordId}`, { headers });
              if (recRes.ok) {
                const recJson = await recRes.json();
                rec = recJson;
                patientId = patientId || (recJson?.patientId?._id || recJson?.patientId);
                doctorId = doctorId || (recJson?.doctorId?._id || recJson?.doctorId);
              }
            } catch (e) {
              console.error('Failed to refetch record for appointment creation', e);
            }
          }

          if (patientId && doctorId) {
            // appointmentDate should be the date portion from followUpDate
            const appointmentDateObj = new Date(updated.followUpDate);
            // build ISO appointmentDate with the same date and zeroed time (server expects a Date)
            const dayIso = new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate()).toISOString();
            const startTime = followUpTime || '09:00';
            // compute end time by adding 30 minutes
            const [h, m] = startTime.split(':').map((s) => parseInt(s, 10));
            const endDate = new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate(), h, m + 30);
            const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

            // Build appointment body to match patient booking flow
            const body = {
              patientId,
              doctorId,
              appointmentDate: dayIso,
              startTime,
              endTime,
              appointmentType: 'follow-up',
              notes: 'Tái khám từ hồ sơ',
              duration: Number(30),
            };

            try {
              const res = await sendRequest<any>({
                method: 'POST',
                url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments`,
                body,
              });

              if (res && (res as any).statusCode && (res as any).statusCode >= 400) {
                const msg = (res as any).message || (res as any).error || 'Lỗi khi tạo lịch';
                toastAny({ title: 'Lưu ý', description: `Không tạo được lịch tái khám tự động: ${msg}`, variant: 'default' });
              } else {
                const created = res?.data || res;
                toast({ title: 'Lịch hẹn', description: 'Đã tạo lịch tái khám tự động' });
                try {
                  const day = new Date(dayIso).toISOString().slice(0,10);
                  router.push(`/doctor/schedule?date=${day}&doctorId=${encodeURIComponent(doctorId)}`);
                } catch (e) {}
              }
            } catch (e) {
              console.error('Appointment creation failed (saveFollowUp)', e);
              toastAny({ title: 'Lưuý', description: 'Không tạo được lịch tái khám tự động. Xem console để biết chi tiết.', variant: 'default' });
            }
          } else {
            toastAny({ title: 'Lưu ý', description: 'Không có thông tin bác sĩ hoặc bệnh nhân để tạo lịch tự động', variant: 'default' });
          }
        }
      } catch (e) {
        console.error('Auto-create appointment failed', e);
        toastAny({ title: 'Lỗi', description: 'Có lỗi khi tạo lịch tái khám tự động. Xem console để biết chi tiết.', variant: 'destructive' });
      }

      setFollowUpModal({ open: false });
      return true;
    } catch (err) {
      console.error('Error saving follow-up from modal', err);
  toastAny({ title: 'Lỗi', description: 'Có lỗi khi lưu tái khám', variant: 'destructive' });
      return false;
    }
  };

  // Toggle follow-up quickly from the list: if not set, create with +1 month default; if set, cancel it
  const handleToggleFollowUp = async (record: MedicalRecord) => {
    const recordId = record._id;
    const currently = !!record.isFollowUpRequired;

    // default +1 month
    const oneMonth = new Date();
    oneMonth.setMonth(oneMonth.getMonth() + 1);
    const defaultDate = oneMonth.toISOString();

    // optimistic update in UI
    setRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: !currently, followUpDate: !currently ? defaultDate : undefined } : r));
    setFilteredRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: !currently, followUpDate: !currently ? defaultDate : undefined } : r));

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = currently ? { isFollowUpRequired: false, followUpDate: null } : { isFollowUpRequired: true, followUpDate: defaultDate };

      const res = await fetch(`/api/medical-records/${recordId}/follow-up`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }

      const updated = await res.json();
      // apply authoritative server state
      setRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate || undefined } : r));
      setFilteredRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate || undefined } : r));

      toast({ title: 'Thành công', description: currently ? 'Đã hủy yêu cầu tái khám' : 'Đã đặt yêu cầu tái khám' });

      // If we just turned on follow-up, try to create an appointment so the doctor's schedule shows the slot as busy
      try {
        if (!currently && updated && updated.followUpDate) {
          // find authoritative patientId/doctorId from updated or from server response
          const fallbackRec = ((records || []).find((x) => x._id === recordId) as any) || undefined;
          const patientId = (updated.patientId && ((updated.patientId as any)._id || updated.patientId)) || (fallbackRec?.patientId?._id || fallbackRec?.patientId);
          const doctorId = (updated.doctorId && ((updated.doctorId as any)._id || updated.doctorId)) || (fallbackRec?.doctorId?._id || fallbackRec?.doctorId);

          if (patientId && doctorId) {
            // default start time (09:00) and 30 minute duration
            const startTime = '09:00';
            const [h, m] = startTime.split(':').map((s) => parseInt(s, 10));
            const apptDate = new Date(updated.followUpDate);
            const endDate = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate(), h, m + 30);
            const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            const dayIso = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate()).toISOString();

            // Build appointment body to match patient booking flow
            const body = {
              patientId,
              doctorId,
              appointmentDate: dayIso,
              startTime,
              endTime,
              appointmentType: 'follow-up',
              notes: 'Tái khám tự động từ hồ sơ',
              duration: Number(30),
            };

            try {
              const res = await sendRequest<any>({
                method: 'POST',
                url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments`,
                body,
              });

              if (res && (res as any).statusCode && (res as any).statusCode >= 400) {
                const msg = (res as any).message || (res as any).error || 'Lỗi khi tạo lịch';
                toastAny({ title: 'Lưuý', description: `Không tạo được lịch tái khám tự động: ${msg}`, variant: 'default' });
              } else {
                const created = res?.data || res;
                toast({ title: 'Lịch hẹn', description: 'Đã tạo lịch tái khám tự động' });
                try {
                  const day = new Date(dayIso).toISOString().slice(0,10);
                  router.push(`/doctor/schedule?date=${day}&doctorId=${encodeURIComponent(doctorId)}`);
                } catch (e) {}
              }
            } catch (e) {
              console.error('Auto-create appointment (toggle) failed', e);
            }
          } else {
            toastAny({ title: 'Lưu ý', description: 'Không có thông tin bác sĩ hoặc bệnh nhân để tạo lịch tự động', variant: 'default' });
          }
        }
      } catch (e) {
        console.error('Auto-create appointment (toggle) failed', e);
      }
    } catch (e: any) {
      console.error('Toggle follow-up failed', e);
      // revert optimistic
      setRecords((prev) => prev.map((r) => r._id === recordId ? record : r));
      setFilteredRecords((prev) => prev.map((r) => r._id === recordId ? record : r));
      toastAny({ title: 'Lỗi', description: 'Không thể cập nhật tái khám: ' + (e?.message || e), variant: 'destructive' });
    }
  };

  // Toggle completed status: if not completed, mark completed and clear follow-up; if completed, revert to active
  const handleToggleCompleted = async (record: MedicalRecord) => {
    const recordId = record._id;
    const isCompleted = record.status === 'completed';
    // optimistic update: store previous for revert
    const previous = records.find((r) => r._id === recordId);
    const newStatus = isCompleted ? 'active' : 'completed';
    setRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, status: newStatus, isFollowUpRequired: newStatus === 'completed' ? false : r.isFollowUpRequired, followUpDate: newStatus === 'completed' ? undefined : r.followUpDate } : r));
    setFilteredRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, status: newStatus, isFollowUpRequired: newStatus === 'completed' ? false : r.isFollowUpRequired, followUpDate: newStatus === 'completed' ? undefined : r.followUpDate } : r));

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = isCompleted ? { status: 'active' } : { status: 'completed', isFollowUpRequired: false, followUpDate: null };

      const res = await fetch(`/api/medical-records/${recordId}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }

  const updated = await res.json();
  setRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, status: updated.status || newStatus, isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate || undefined } : r));
  setFilteredRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, status: updated.status || newStatus, isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate || undefined } : r));

      toast({ title: 'Thành công', description: isCompleted ? 'Đã bỏ hoàn thành' : 'Đã đánh dấu là đã điều trị' });
    } catch (e: any) {
      console.error('Toggle completed failed', e);
      // revert optimistic update
      if (previous) {
        setRecords((prev) => prev.map((r) => r._id === recordId ? previous : r));
        setFilteredRecords((prev) => prev.map((r) => r._id === recordId ? previous : r));
      } else {
        fetchMedicalRecords();
      }
      toastAny({ title: 'Lỗi', description: 'Không thể cập nhật trạng thái: ' + (e?.message || e), variant: 'destructive' });
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
                  filteredRecords.map((record) => (
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
                                  {(record.patientId?.fullName || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {record.patientId?.fullName || "Chưa cập nhật"}
                                  </h3>
                                  <p className="text-gray-500 text-sm">{record.patientId?.email || ""}</p>
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
                                    <span>{format(new Date(record.followUpDate), "dd/MM/yyyy", { locale: vi })}</span>
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
                            {/* New status actions: mark completed and quick follow-up */}
                            <Button
                              size="sm"
                              variant={record.status === 'completed' ? 'secondary' : 'ghost'}
                              onClick={() => handleToggleCompleted(record)}
                              className={`flex items-center gap-2 ${record.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' : 'hover:bg-gray-50 hover:border-gray-200 text-gray-700'} bg-white/80 backdrop-blur-sm`}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="hidden lg:inline">{record.status === 'completed' ? 'Bỏ hoàn thành' : 'Đã điều trị'}</span>
                            </Button>

                            <Button
                              size="sm"
                              variant={record.isFollowUpRequired ? 'destructive' : 'outline'}
                              onClick={() => record.isFollowUpRequired ? handleToggleFollowUp(record) : openFollowUpModal(record._id, record.followUpDate)}
                              className={`flex items-center gap-2 ${record.isFollowUpRequired ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600'} bg-white/80 backdrop-blur-sm`}
                            >
                              <AlertCircle className="h-4 w-4" />
                              <span className="hidden lg:inline">{record.isFollowUpRequired ? 'Hủy tái khám' : 'Cần tái khám'}</span>
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
        <ExportMedicalRecord recordId={selectedRecord._id} onClose={() => setShowExportModal(false)} />
      )}
      {/* Follow-up modal for record-level 'Tái khám' actions */}
      <FollowUpModal
        open={followUpModal.open}
        recordId={followUpModal.recordId}
        date={followUpModal.date}
        onClose={closeFollowUpModal}
        onSave={saveFollowUpFromModal}
      />
    </div>
  );
}

// Local FollowUpModal (copied from patient detail page implementation)
function FollowUpModal({ open, recordId, date, onClose, onSave }: { open: boolean; recordId?: string; date?: string; onClose: () => void; onSave: (id?: string, date?: string, time?: string) => Promise<boolean> | boolean }) {
  const [selectedDate, setSelectedDate] = useState<string>(date || '');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  useEffect(() => setSelectedDate(date || ''), [date]);

  // when modal opens or selectedDate changes, fetch record to get doctorId and fetch doctor's appointments for that day
  useEffect(() => {
    if (!open || !recordId) return;

    // if no selectedDate, default to +1 month so doctors see a sensible default schedule
    let queryDate = selectedDate;
    if (!queryDate) {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      queryDate = d.toISOString().slice(0,10);
      setSelectedDate(queryDate);
    }

    let cancelled = false;

    (async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // load medical-record to extract doctorId (if present)
        const recRes = await fetch(`/api/medical-records/${recordId}`, { headers });
        if (!recRes.ok) return;
        const rec = await recRes.json();
        const resolvedDoctorId = rec?.doctorId?._id || rec?.doctorId || null;
        if (cancelled) return;
        setDoctorId(resolvedDoctorId);

        if (!resolvedDoctorId) return;

        // fetch doctor's appointments for selected date to compute busy slots
  const dayIso = new Date(queryDate).toISOString().slice(0,10);
  const apptRes = await sendRequest<any>({ method: 'GET', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${resolvedDoctorId}`, queryParams: { date: dayIso } });
    const appts = apptRes?.data || apptRes || [];
        if (cancelled) return;

        // normalize busy start times
        const busy: string[] = (Array.isArray(appts) ? appts : (appts?.data || appts || [])).map((a: any) => (a.startTime || a.time || '').toString().slice(0,5));
        setBusySlots(busy.filter(Boolean));
      } catch (e) {
        console.error('Failed to load follow-up slots', e);
      }
    })();

    return () => { cancelled = true; };
  }, [open, recordId, selectedDate]);

  if (!open) return null;

  const choose = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setSelectedDate(d.toISOString().slice(0,10));
  };

  const toggleSlot = (time: string) => {
    if (busySlots.includes(time)) return; // can't pick occupied
    setSelectedTime((prev) => prev === time ? null : time);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg z-60 p-6 w-full max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Đặt lịch tái khám</h3>
            <p className="text-sm text-gray-600">Chọn lộ trình (1 / 3 / 6 tháng) hoặc đặt ngày cụ thể, sau đó chọn khung giờ trống của bác sĩ.</p>
          </div>
          <div>
            <button onClick={onClose} className="text-gray-500">Đóng</button>
          </div>
        </div>

        <div className="flex gap-2 mt-4 mb-4">
          {[1, 3, 6].map((m) => {
            const d = new Date();
            d.setMonth(d.getMonth() + m);
            const iso = d.toISOString().slice(0, 10);
            const monthSelected = selectedDate === iso;
            return (
              <Button
                key={m}
                size="sm"
                onClick={() => choose(m)}
                aria-pressed={monthSelected}
                title={monthSelected ? `+${m} tháng - Đã chọn` : `+${m} tháng`}
                className={`px-3 py-1 border rounded transition-colors duration-150 ease-in-out ${monthSelected ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300 transform scale-105' : 'hover:bg-blue-50 hover:border-blue-200 text-gray-700'}`}
              >
                +{m} tháng
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="text-sm">Ngày tái khám</label>
            <input type="date" className="block mt-1 p-2 border rounded w-full" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <p className="text-xs text-gray-500 mt-2">Bác sĩ: {doctorId || 'Chưa xác định'}</p>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm">Chọn khung giờ trống của bác sĩ</label>
            <div className="grid grid-cols-4 gap-2 mt-2 max-h-56 overflow-y-auto">
              {timeSlots.map((t) => {
                const occupied = busySlots.includes(t);
                const selected = selectedTime === t;
                return (
                  <button
                    key={t}
                    onClick={() => toggleSlot(t)}
                    disabled={occupied}
                    aria-pressed={selected}
                    title={occupied ? `${t} - Đã có lịch` : selected ? `${t} - Đã chọn` : `${t} - Trống`}
                    className={`p-2 text-sm rounded border transition-colors duration-150 ease-in-out flex items-center justify-center ${occupied ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70' : selected ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300 transform scale-105' : 'bg-white hover:bg-blue-50 hover:border-blue-200 text-gray-700 cursor-pointer'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Các khung giờ xám là đã có lịch; chọn khung giờ để hẹn tái khám.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => { if (!saving) onClose(); }} disabled={saving}>Hủy</Button>
          <Button size="sm" className="btn-healthcare-primary" onClick={async () => {
            if (!recordId) return;
            setSaving(true);
            try {
              const ok = await onSave(recordId, selectedDate || undefined, selectedTime || undefined);
              if (ok) onClose();
            } finally {
              setSaving(false);
            }
          }} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </div>
      </div>
    </div>
  );
}
