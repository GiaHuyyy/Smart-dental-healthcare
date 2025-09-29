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
import { useEffect, useState } from "react";
// removed useRouter import because we no longer navigate after saving follow-ups

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
  // helper wrapper to bypass strict Toast typing in some places where 'variant' is used
  const toastAny = (payload: any) => (toast as any)(payload);
  // no client-side navigation needed after saving follow-ups
  const [followUpModal, setFollowUpModal] = useState<{ open: boolean; recordId?: string; date?: string }>({ open: false });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  // keep the doctor's view in sync: refresh on focus/visibility and poll periodically
  useEffect(() => {
    const onFocus = () => fetchMedicalRecords();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchMedicalRecords(); };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const intervalId = setInterval(() => {
      fetchMedicalRecords();
    }, 20000); // 20s

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(intervalId as any);
    };
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
          const rec = (records || []).find((x) => x._id === recordId) as any;
          const patientId = rec?.patientId?._id || (rec?.patientId || (updated.patientId && updated.patientId._id)) || undefined;
          const doctorId = updated.doctorId?._id || rec?.doctorId?._id || undefined;

          if (patientId && doctorId) {
            // appointmentDate should be the date portion from followUpDate, keep time from followUpTime
            const appointmentDateObj = new Date(updated.followUpDate);
            // build ISO appointmentDate with the same date and zeroed time (server expects a Date)
            const dayIso = new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate()).toISOString();
            const startTime = followUpTime || '09:00';
            // compute end time by adding 30 minutes
            const [h, m] = startTime.split(':').map((s) => parseInt(s, 10));
            const endDate = new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate(), h, m + 30);
            const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            const isoDate = dayIso;

            const token = localStorage.getItem('token');
            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

              const body = {
              patientId,
              doctorId,
              appointmentDate: isoDate,
              startTime,
              endTime,
              duration: 30,
              appointmentType: 'follow-up',
              notes: 'Tái khám từ hồ sơ',
              status: 'pending'
            };

            const apptRes = await fetch('/api/appointments', { method: 'POST', headers, body: JSON.stringify(body) });
            if (apptRes.ok) {
              // stay on the current doctor UI; only notify success
              toast({ title: 'Lịch hẹn', description: 'Đã tạo lịch tái khám tự động' });
            } else {
              const txt = await apptRes.text();
              // not critical, just inform
              toastAny({ title: 'Lưu ý', description: 'Không tạo được lịch tái khám tự động: ' + (txt || apptRes.statusText), variant: 'default' });
            }
          }
        }
      } catch (e) {
        console.error('Auto-create appointment failed', e);
      }

      setFollowUpModal({ open: false });
      return true;
    } catch (err) {
      console.error('Error saving follow-up from modal', err);
  toastAny({ title: 'Lỗi', description: 'Có lỗi khi lưu tái khám', variant: 'destructive' });
      return false;
    }
  };

  const cancelFollowUp = async (recordId?: string) => {
    if (!recordId) return false;
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/medical-records/${recordId}/follow-up`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isFollowUpRequired: false, followUpDate: null })
      });

      if (!res.ok) {
        const txt = await res.text();
        toastAny({ title: 'Lỗi', description: txt || 'Không thể hủy tái khám', variant: 'destructive' });
        return false;
      }

      // refresh list
      toast({ title: 'Thành công', description: 'Đã hủy tái khám' });
      // also remove any upcoming appointment(s) for this patient/doctor on the follow-up date
      try {
        const updated = await res.json();
        // determine patient and doctor ids
  const rec = (records || []).find((r) => r._id === recordId) as any;
  const patientId = rec?.patientId?._id || (rec?.patientId || {})._id || rec?.patientId;
        const doctorId = (updated && updated.doctorId && updated.doctorId._id) ? updated.doctorId._id : (rec && rec.doctorId && rec.doctorId._id) ? rec.doctorId._id : rec?.doctorId;
        // follow-up date may be in the previous rec.followUpDate or updated.followUpDate
        const followUpDate = (rec && rec.followUpDate) || (updated && updated.followUpDate) || null;

        if (patientId && doctorId && followUpDate) {
          // normalize to ISO date string 'YYYY-MM-DD'
          const fd = new Date(followUpDate);
          const isoDay = fd.toISOString().slice(0,10);
          // Prefer using client proxy route to fetch upcoming appointments (keeps auth and CORS local)
          const authHeader = (headers as any)?.Authorization || '';
          let apptsList: any[] = [];
          try {
            const proxyRes = await fetch(`/api/appointments/patient/${patientId}/history?status=upcoming`, { headers: { Authorization: authHeader } });
            if (proxyRes.ok) {
              const payload = await proxyRes.json();
              // payload may be { success: true, data: [...] } or raw array
              const arr = payload?.data ?? payload?.results ?? payload ?? [];
              apptsList = Array.isArray(arr) ? arr : [];
            } else {
              // fallback to backend direct call
              const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
              if (apiBase) {
                const apptRes = await fetch(`${apiBase}/api/v1/appointments/patient/${patientId}/upcoming`, { headers });
                if (apptRes.ok) {
                  const appts = await apptRes.json();
                  apptsList = Array.isArray(appts?.data) ? appts.data : Array.isArray(appts) ? appts : (appts?.appointments || []);
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fetch upcoming appointments for cancellation sync', e);
          }

          const toCancel = (apptsList || []).filter((a: any) => {
            const apptDay = a?.appointmentDate ? new Date(a.appointmentDate).toISOString().slice(0,10) : null;
            const sameDay = apptDay === isoDay;
            const apptDoctorId = a?.doctorId?._id || a?.doctorId || (a?.doctorId && a.doctorId.id) || null;
            const sameDoctor = apptDoctorId ? String(apptDoctorId) === String(doctorId) : false;
            return sameDay && sameDoctor;
          });

          for (const a of toCancel) {
            try {
              const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
              if (apiBase) {
                await fetch(`${apiBase}/api/v1/appointments/${a._id}/cancel`, {
                  method: 'DELETE',
                  headers: headers,
                  body: JSON.stringify({ reason: 'Hủy tái khám bởi bác sĩ' }),
                });
              } else {
                // try proxy cancel via appointments id route
                await fetch(`/api/appointments/${a._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Hủy tái khám bởi bác sĩ' }) });
              }
            } catch (e) {
              // non-fatal
              console.warn('Failed to cancel appointment during follow-up cancel', e);
            }
          }
        }

        fetchMedicalRecords();
      } catch (e) {
        // if parsing or cancellation fails, still refresh
        fetchMedicalRecords();
      }
      return true;
    } catch (err) {
      console.error('Error cancelling follow-up', err);
      toastAny({ title: 'Lỗi', description: 'Có lỗi khi hủy tái khám', variant: 'destructive' });
      return false;
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
  const { roots, childrenMap } = (() => {
    const map: Record<string, any> = {};
    const children: Record<string, any[]> = {};
    const roots: any[] = [];

    const candidateKeys = ['parentId', 'originalRecordId', 'sourceRecordId', 'followUpOf', 'followUpOfId', 'parentRecordId', 'rootRecordId', 'relatedRecordId'];

    // index records
    for (const r of filteredRecords) {
      map[r._id] = r;
    }

    for (const r of filteredRecords) {
      let parentFound: string | undefined = undefined;
      for (const k of candidateKeys) {
        // @ts-ignore - dynamic field lookup, backend may provide one of these
        const v = r[k];
        if (v) {
          // if object with _id, extract
          const id = typeof v === 'string' ? v : (v && v._id) ? v._id : undefined;
          if (id && map[id]) {
            parentFound = id as string;
            break;
          }
        }
      }

      if (parentFound) {
        children[parentFound] = children[parentFound] || [];
        children[parentFound].push(r);
      } else {
        roots.push(r);
      }
    }

    // If nothing was linked via explicit fields, try a heuristic fallback:
    // For each patient, consider earlier records (status completed or isFollowUpRequired)
    // as potential parent ('hồ sơ góc') for later records within a time window.
    if (Object.keys(children).length === 0) {
      const byPatient: Record<string, any[]> = {};
      for (const r of filteredRecords) {
        const pid = typeof r.patientId === 'string' ? r.patientId : (r.patientId && r.patientId._id) ? r.patientId._id : (r.patientId?._id || r.patientId?._id);
        if (!pid) continue;
        byPatient[pid] = byPatient[pid] || [];
        byPatient[pid].push(r);
      }

      const fallbackChildren: Record<string, any[]> = {};
      const fallbackRoots: any[] = [];

      const DAY = 24 * 60 * 60 * 1000;
      const WINDOW = 120 * DAY; // 120 days

      for (const pid of Object.keys(byPatient)) {
        const arr = byPatient[pid].slice().sort((a,b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime());
        for (let i = 0; i < arr.length; i++) {
          const candidateParent = arr[i];
          // choose candidate parents that either are completed or explicitly requested follow-up
          if (!(candidateParent.status === 'completed' || candidateParent.isFollowUpRequired)) continue;
          for (let j = i+1; j < arr.length; j++) {
            const possibleChild = arr[j];
            const pd = new Date(possibleChild.recordDate).getTime();
            const ppd = new Date(candidateParent.recordDate).getTime();
            if (pd >= ppd && (pd - ppd) <= WINDOW) {
              fallbackChildren[candidateParent._id] = fallbackChildren[candidateParent._id] || [];
              fallbackChildren[candidateParent._id].push(possibleChild);
            }
          }
        }
      }

      // Now build roots as those not used as children
      const childIds = new Set<string>();
      for (const k of Object.keys(fallbackChildren)) {
        for (const c of fallbackChildren[k]) childIds.add(c._id);
      }

      for (const r of filteredRecords) {
        if (childIds.has(r._id)) continue;
        // also avoid making a parent appear as child mistakenly
        fallbackRoots.push(r);
      }

      // if fallback found anything, use it
      if (Object.keys(fallbackChildren).length > 0) {
        return { roots: fallbackRoots, childrenMap: fallbackChildren };
      }

    }

    return { roots, childrenMap: children };
  })();

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
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                Hồ sơ góc
                                <span className="ml-1 text-xs text-gray-500">({kids.length})</span>
                              </button>
                            ) : (
                              <span className="text-sm text-gray-600 px-2 py-1">Hồ sơ</span>
                            )}
                          </div>

                          <div className="text-sm text-gray-500">{record.patientId?.fullName || 'Chưa cập nhật'}</div>
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token');
                                      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                                      if (token) headers['Authorization'] = `Bearer ${token}`;

                                      const res = await fetch(`/api/medical-records/${record._id}`, {
                                        method: 'PATCH',
                                        headers,
                                        body: JSON.stringify({ status: 'completed', isFollowUpRequired: false, followUpDate: null })
                                      });

                                      if (!res.ok) {
                                        const txt = await res.text();
                                        toastAny({ title: 'Lỗi', description: txt || 'Không thể cập nhật trạng thái', variant: 'destructive' });
                                        return;
                                      }

                                      toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái là Hoàn thành' });
                                      fetchMedicalRecords();
                                    } catch (err) {
                                      console.error('Failed to mark completed', err);
                                      toastAny({ title: 'Lỗi', description: 'Có lỗi khi cập nhật trạng thái', variant: 'destructive' });
                                    }
                                  }}
                                  className="flex items-center gap-2 hover:bg-gray-50 hover:border-gray-200 text-gray-700 bg-white/80 backdrop-blur-sm"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="hidden lg:inline">Đã điều trị</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (record.isFollowUpRequired) {
                                      await cancelFollowUp(record._id);
                                    } else {
                                      const oneMonth = new Date();
                                      oneMonth.setMonth(oneMonth.getMonth() + 1);
                                      openFollowUpModal(record._id, oneMonth.toISOString());
                                    }
                                  }}
                                  className="flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 bg-white/80 backdrop-blur-sm"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="hidden lg:inline">{record.isFollowUpRequired ? 'Hủy tái khám' : 'Cần tái khám'}</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Children follow-up cards rendered as full records (indented) */}
                        {isExpanded && kids.length > 0 && (
                          <div className="space-y-4 mt-3">
                            {kids.map((child: any) => (
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
                                            {(child.patientId?.fullName || "U").charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                              {child.patientId?.fullName || "Chưa cập nhật"}
                                            </h3>
                                            <p className="text-gray-500 text-sm">{child.patientId?.email || ""}</p>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {getStatusBadge(child.status)}
                                          {child.isFollowUpRequired && (
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
                                            <span>{format(new Date(child.recordDate), "dd/MM/yyyy", { locale: vi })}</span>
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
                                              <span>{format(new Date(child.followUpDate), "dd/MM/yyyy", { locale: vi })}</span>
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
                                              <p className="text-gray-600 mt-1 leading-relaxed">{child.treatmentPlan}</p>
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
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          try {
                                            const token = localStorage.getItem('token');
                                            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                                            if (token) headers['Authorization'] = `Bearer ${token}`;

                                            const res = await fetch(`/api/medical-records/${child._id}`, {
                                              method: 'PATCH',
                                              headers,
                                              body: JSON.stringify({ status: 'completed', isFollowUpRequired: false, followUpDate: null })
                                            });

                                            if (!res.ok) {
                                              const txt = await res.text();
                                              toastAny({ title: 'Lỗi', description: txt || 'Không thể cập nhật trạng thái', variant: 'destructive' });
                                              return;
                                            }

                                            toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái là Hoàn thành' });
                                            fetchMedicalRecords();
                                          } catch (err) {
                                            console.error('Failed to mark completed', err);
                                            toastAny({ title: 'Lỗi', description: 'Có lỗi khi cập nhật trạng thái', variant: 'destructive' });
                                          }
                                        }}
                                        className="flex items-center gap-2 hover:bg-gray-50 hover:border-gray-200 text-gray-700 bg-white/80 backdrop-blur-sm"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="hidden lg:inline">Đã điều trị</span>
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          if (child.isFollowUpRequired) {
                                            await cancelFollowUp(child._id);
                                          } else {
                                            const oneMonth = new Date();
                                            oneMonth.setMonth(oneMonth.getMonth() + 1);
                                            openFollowUpModal(child._id, oneMonth.toISOString());
                                          }
                                        }}
                                        className="flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 bg-white/80 backdrop-blur-sm"
                                      >
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="hidden lg:inline">{child.isFollowUpRequired ? 'Hủy tái khám' : 'Cần tái khám'}</span>
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
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelectedDate(date || ''), [date]);

  if (!open) return null;

  const choose = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setSelectedDate(d.toISOString().slice(0,10));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg z-60 p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Đặt lịch tái khám</h3>
        <div className="flex gap-2 mb-3">
          <button onClick={() => choose(1)} className="px-3 py-1 border rounded">+1 tháng</button>
          <button onClick={() => choose(3)} className="px-3 py-1 border rounded">+3 tháng</button>
          <button onClick={() => choose(6)} className="px-3 py-1 border rounded">+6 tháng</button>
        </div>
        <div className="mb-4">
          <label className="text-sm">Ngày tái khám (tùy chọn)</label>
          <input type="date" className="block mt-1 p-2 border rounded w-full" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="text-sm">Giờ (tùy chọn)</label>
          <input type="time" className="block mt-1 p-2 border rounded w-full" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => { if (!saving) onClose(); }} className="px-3 py-1 border rounded" disabled={saving}>Hủy</button>
          <button onClick={async () => { setSaving(true); try { const ok = await onSave(recordId, selectedDate, selectedTime); if (ok) onClose(); } finally { setSaving(false); } }} className="px-3 py-1 bg-blue-600 text-white rounded" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  );
}
