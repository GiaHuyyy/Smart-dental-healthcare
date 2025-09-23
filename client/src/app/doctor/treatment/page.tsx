"use client";
import { User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

interface Appointment {
  _id: string;
  appointmentDate: string;
  startTime: string;
  appointmentType: string;
  status: string;
  notes?: string;
  patient: Patient;
}

interface MedicalRecordForm {
  patientId: string;
  appointmentId: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  medications: string[];
  notes: string;
  status: string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
  dentalChart: Array<{
    toothNumber: number;
    condition: string;
    treatment: string;
    notes: string;
  }>;
}

export default function TreatmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const patientId = searchParams.get("patientId");
  const { toast } = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordForm>({
    patientId: patientId || "",
    appointmentId: appointmentId || "",
    chiefComplaint: "",
    diagnosis: "",
    treatmentPlan: "",
    medications: [""],
    notes: "",
    status: "active",
    isFollowUpRequired: false,
    followUpDate: "",
    dentalChart: [],
  });

  const fetchAppointmentDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setAppointment(data);
      } else {
        // Fallback to mock data if API fails
        setAppointment({
          _id: appointmentId || "",
          appointmentDate: new Date().toISOString().split("T")[0],
          startTime: "09:00",
          appointmentType: "Khám tổng quát",
          status: "in-progress",
          patient: {
            _id: patientId || "",
            fullName: "Đang tải...",
            email: "",
            phone: "",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching appointment:", error);
      // Fallback to mock data
      setAppointment({
        _id: appointmentId || "",
        appointmentDate: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        appointmentType: "Khám tổng quát",
        status: "in-progress",
        patient: {
          _id: patientId || "",
          fullName: "Đang tải...",
          email: "",
          phone: "",
        },
      });
    }
  }, [appointmentId, patientId]);

  const fetchPatientDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/patients/${patientId}/details`);
      const data = await response.json();

      if (data.success) {
        setPatient(data.data);
        setAppointment((prev) => (prev ? { ...prev, patient: data.data } : null));
      }
    } catch (error) {
      console.error("Error fetching patient:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!appointmentId || !patientId) {
      toast({
        title: "Lỗi",
        description: "Thiếu thông tin cuộc hẹn hoặc bệnh nhân",
      });
      router.push("/doctor/schedule");
      return;
    }

    fetchAppointmentDetails();
    fetchPatientDetails();
  }, [appointmentId, patientId, fetchAppointmentDetails, fetchPatientDetails, router, toast]);

  const handleInputChange = (field: keyof MedicalRecordForm, value: string | boolean | string[]) => {
    setMedicalRecord((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMedicationChange = (index: number, value: string) => {
    const newMedications = [...medicalRecord.medications];
    newMedications[index] = value;
    setMedicalRecord((prev) => ({
      ...prev,
      medications: newMedications,
    }));
  };

  const addMedication = () => {
    setMedicalRecord((prev) => ({
      ...prev,
      medications: [...prev.medications, ""],
    }));
  };

  const removeMedication = (index: number) => {
    const newMedications = medicalRecord.medications.filter((_, i) => i !== index);
    setMedicalRecord((prev) => ({
      ...prev,
      medications: newMedications,
    }));
  };

  // Dental chart functionality - disabled for now
  // const handleDentalChartUpdate = (toothNumber: number, field: string, value: string) => { ... };

  const saveMedicalRecord = async () => {
    if (!medicalRecord.chiefComplaint || !medicalRecord.diagnosis) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ triệu chứng chính và chẩn đoán",
      });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...medicalRecord,
          medications: medicalRecord.medications.filter((med) => med.trim() !== ""),
          recordDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Đã lưu hồ sơ bệnh án thành công",
        });

        // Update appointment status to completed
        await updateAppointmentStatus("completed");

        const created = await response.json();

        // If follow-up was requested, call scheduleFollowUp
        if (created && created._id) {
          try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // send explicit payload containing both fields; if not required, send followUpDate=null to clear
            const payload = {
              isFollowUpRequired: !!medicalRecord.isFollowUpRequired,
              followUpDate: medicalRecord.isFollowUpRequired ? (medicalRecord.followUpDate || null) : null
            };

            await fetch(`/api/medical-records/${created._id}/follow-up`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(payload)
            });
          } catch (err) {
            console.error('Error scheduling follow-up after save:', err);
          }
        }

        // redirect back to schedule or follow-up details if desired
        if (medicalRecord.isFollowUpRequired && created && created._id) {
          router.push(`/doctor/medical-records/followups/${created._id}`);
        } else {
          router.push("/doctor/schedule");
        }
      } else {
        throw new Error("Failed to save medical record");
      }
    } catch (error) {
      console.error("Error saving medical record:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu hồ sơ bệnh án",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAppointmentStatus = async (status: string) => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error("Error updating appointment status:", error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: "var(--color-primary)" }}
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <button
                  onClick={() => router.push("/doctor/schedule")}
                  className="mb-2 inline-block hover:opacity-80 transition-opacity text-sm"
                  style={{ color: "var(--color-primary)" }}
                >
                  ← Quay lại lịch khám
                </button>
                <h1 className="healthcare-heading text-3xl">Thăm khám và điều trị</h1>
                <p className="healthcare-body mt-1">Tạo hồ sơ bệnh án cho cuộc hẹn</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push("/doctor/schedule")}
                className="btn-healthcare-secondary"
              >
                Hủy
              </Button>
              <Button onClick={saveMedicalRecord} disabled={saving} className="btn-healthcare-primary">
                {saving ? "Đang lưu..." : "Lưu hồ sơ"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="lg:col-span-1">
            <Card className="healthcare-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 healthcare-heading text-lg">
                  <User className="w-5 h-5" style={{ color: "var(--color-primary)" }} /> Thông tin bệnh nhân
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                      <p className="text-lg font-semibold">{patient.fullName}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Tuổi</label>
                        <p className="healthcare-body">
                          {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} tuổi` : "Chưa cập nhật"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Giới tính</label>
                        <p className="healthcare-body">
                          {patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                        <p className="healthcare-body">{patient.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="healthcare-body">{patient.email}</p>
                      </div>
                    </div>
                  </>
                )}

                {appointment && (
                  <>
                    <hr className="my-4" />
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cuộc hẹn</label>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm">📅 {formatDate(appointment.appointmentDate)}</p>
                        <p className="text-sm">⏰ {appointment.startTime}</p>
                        <p className="text-sm">🏥 {appointment.appointmentType}</p>
                        <Badge variant="secondary">{appointment.status}</Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Medical Record Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="healthcare-card">
              <CardHeader>
                <CardTitle className="healthcare-heading text-lg">📋 Thông tin khám bệnh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Triệu chứng chính <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={medicalRecord.chiefComplaint}
                    onChange={(e) => handleInputChange("chiefComplaint", e.target.value)}
                    placeholder="Mô tả triệu chứng chính mà bệnh nhân đến khám..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chẩn đoán <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={medicalRecord.diagnosis}
                    onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                    placeholder="Chẩn đoán bệnh lý sau khi thăm khám..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kế hoạch điều trị</label>
                  <Textarea
                    value={medicalRecord.treatmentPlan}
                    onChange={(e) => handleInputChange("treatmentPlan", e.target.value)}
                    placeholder="Mô tả kế hoạch điều trị chi tiết..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Medications */}
            <Card className="healthcare-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between healthcare-heading text-lg">
                  💊 Thuốc điều trị
                  <Button variant="outline" size="sm" onClick={addMedication} className="btn-healthcare-secondary">
                    + Thêm thuốc
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medicalRecord.medications.map((medication, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={medication}
                        onChange={(e) => handleMedicationChange(index, e.target.value)}
                        placeholder={`Thuốc ${index + 1} (tên thuốc, liều lượng, cách dùng)`}
                        className="flex-1"
                      />
                      {medicalRecord.medications.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMedication(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Xóa
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Follow-up */}
            <Card className="healthcare-card">
              <CardHeader>
                <CardTitle className="healthcare-heading text-lg">🔄 Lịch tái khám</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="followUp"
                    checked={medicalRecord.isFollowUpRequired}
                    onChange={(e) => handleInputChange("isFollowUpRequired", e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="followUp" className="text-sm font-medium text-gray-700">
                    Cần tái khám
                  </label>
                </div>

                {medicalRecord.isFollowUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày tái khám</label>
                    <Input
                      type="date"
                      value={medicalRecord.followUpDate}
                      onChange={(e) => handleInputChange("followUpDate", e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="healthcare-card">
              <CardHeader>
                <CardTitle className="healthcare-heading text-lg">📝 Ghi chú thêm</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={medicalRecord.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Ghi chú thêm về quá trình điều trị, lưu ý đặc biệt..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
