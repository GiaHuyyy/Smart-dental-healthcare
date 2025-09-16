import { User } from "lucide-react";

("use client");

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  }, [appointmentId, patientId]);

  const fetchAppointmentDetails = async () => {
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
  };

  const fetchPatientDetails = async () => {
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
  };

  const handleInputChange = (field: keyof MedicalRecordForm, value: any) => {
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

  const handleDentalChartUpdate = (toothNumber: number, field: string, value: string) => {
    const existingIndex = medicalRecord.dentalChart.findIndex((item) => item.toothNumber === toothNumber);

    if (existingIndex >= 0) {
      const newDentalChart = [...medicalRecord.dentalChart];
      newDentalChart[existingIndex] = {
        ...newDentalChart[existingIndex],
        [field]: value,
      };
      setMedicalRecord((prev) => ({
        ...prev,
        dentalChart: newDentalChart,
      }));
    } else {
      const newItem = {
        toothNumber,
        condition: field === "condition" ? value : "",
        treatment: field === "treatment" ? value : "",
        notes: field === "notes" ? value : "",
      };
      setMedicalRecord((prev) => ({
        ...prev,
        dentalChart: [...prev.dentalChart, newItem],
      }));
    }
  };

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

        router.push("/doctor/schedule");
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => router.push("/doctor/schedule")}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Quay lại lịch khám
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Thăm khám và điều trị</h1>
          <p className="text-gray-600">Tạo hồ sơ bệnh án cho cuộc hẹn</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => router.push("/doctor/schedule")}>
            Hủy
          </Button>
          <Button onClick={saveMedicalRecord} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Đang lưu..." : "Lưu hồ sơ"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" /> Thông tin bệnh nhân
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
                      <p className="text-gray-900">
                        {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} tuổi` : "Chưa cập nhật"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Giới tính</label>
                      <p className="text-gray-900">
                        {patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                      <p className="text-gray-900">{patient.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{patient.email}</p>
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
          <Card>
            <CardHeader>
              <CardTitle>📋 Thông tin khám bệnh</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                💊 Thuốc điều trị
                <Button variant="outline" size="sm" onClick={addMedication}>
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
          <Card>
            <CardHeader>
              <CardTitle>🔄 Lịch tái khám</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>📝 Ghi chú thêm</CardTitle>
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
  );
}
