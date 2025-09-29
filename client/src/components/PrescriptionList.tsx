import { useEffect, useState } from "react";
import { User, Stethoscope, X, Pill, Calendar, Check } from "lucide-react";

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
  patientId: any;
  doctorId: any;
  prescriptionDate: string;
  diagnosis: string;
  medications: Medication[];
  instructions: string;
  notes: string;
  status: string;
  isDispensed: boolean;
  dispensedDate?: string;
  dispensedBy?: any;
  createdAt: string;
  updatedAt: string;
}

interface PrescriptionListProps {
  patientId?: string;
  doctorId?: string;
  showPatientInfo?: boolean;
  showDoctorInfo?: boolean;
  limit?: number;
}

export default function PrescriptionList({
  patientId,
  doctorId,
  showPatientInfo = false,
  showDoctorInfo = true,
  limit,
}: PrescriptionListProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    fetchPrescriptions();
  }, [patientId, doctorId]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (patientId) params.append("patientId", patientId);
      if (doctorId) params.append("doctorId", doctorId);
      if (limit) params.append("limit", limit.toString());

      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      const response = await fetch(`/api/prescriptions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể tải danh sách đơn thuốc");
      }

      const result = await response.json();
      setPrescriptions(result.data || result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, isDispensed: boolean) => {
    if (isDispensed) return "text-green-600 bg-green-100";
    if (status === "active") return "text-blue-600 bg-blue-100";
    if (status === "expired") return "text-red-600 bg-red-100";
    return "text-gray-600 bg-gray-100";
  };

  const getStatusText = (status: string, isDispensed: boolean) => {
    if (isDispensed) return "Đã phát thuốc";
    if (status === "active") return "Chưa phát thuốc";
    if (status === "expired") return "Đã hết hạn";
    return status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">{error}</div>;
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        <div className="text-4xl mb-2">
          <Pill className="w-8 h-8 mx-auto" />
        </div>
        <p>Chưa có đơn thuốc nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <div
          key={prescription._id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">Đơn thuốc #{prescription._id.slice(-6)}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    prescription.status,
                    prescription.isDispensed
                  )}`}
                >
                  {getStatusText(prescription.status, prescription.isDispensed)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                <Calendar className="inline w-4 h-4 mr-1" />
                {formatDate(prescription.prescriptionDate)}
              </p>
              {showDoctorInfo && prescription.doctorId && (
                <p className="text-sm text-gray-600">
                  <Stethoscope className="inline w-4 h-4 mr-1" />
                  BS. {prescription.doctorId.fullName || "Không xác định"}
                </p>
              )}
              {showPatientInfo && prescription.patientId && (
                <p className="text-sm text-gray-600">
                  <User className="inline w-4 h-4 mr-1" />
                  {prescription.patientId.fullName || "Không xác định"}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedPrescription(prescription)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Xem chi tiết
            </button>
          </div>

          {prescription.diagnosis && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700">Chẩn đoán:</p>
              <p className="text-sm text-gray-600">{prescription.diagnosis}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Thuốc ({prescription.medications.length}):</p>
            <div className="space-y-1">
              {prescription.medications.slice(0, 3).map((med, index) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <span className="font-medium">{med.name}</span>
                  {med.dosage && <span> - {med.dosage}</span>}
                  {med.frequency && <span> - {med.frequency}</span>}
                  {med.duration && <span> - {med.duration}</span>}
                </div>
              ))}
              {prescription.medications.length > 3 && (
                <p className="text-xs text-gray-500">...và {prescription.medications.length - 3} thuốc khác</p>
              )}
            </div>
          </div>

          {prescription.isDispensed && prescription.dispensedDate && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-green-600">
                <Check className="inline w-4 h-4 mr-1" />
                Đã phát thuốc vào {formatDate(prescription.dispensedDate)}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Chi tiết đơn thuốc</h2>
                <button onClick={() => setSelectedPrescription(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Mã đơn thuốc:</span>
                    <p>#{selectedPrescription._id.slice(-8)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Ngày kê đơn:</span>
                    <p>{formatDate(selectedPrescription.prescriptionDate)}</p>
                  </div>
                  {showDoctorInfo && selectedPrescription.doctorId && (
                    <div>
                      <span className="font-medium">Bác sĩ:</span>
                      <p>BS. {selectedPrescription.doctorId.fullName}</p>
                    </div>
                  )}
                  {showPatientInfo && selectedPrescription.patientId && (
                    <div>
                      <span className="font-medium">Bệnh nhân:</span>
                      <p>{selectedPrescription.patientId.fullName}</p>
                    </div>
                  )}
                </div>

                {selectedPrescription.diagnosis && (
                  <div>
                    <span className="font-medium">Chẩn đoán:</span>
                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedPrescription.diagnosis}</p>
                  </div>
                )}

                <div>
                  <span className="font-medium">Danh sách thuốc:</span>
                  <div className="mt-2 space-y-3">
                    {selectedPrescription.medications.map((med, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3">
                        <div className="font-medium text-blue-600 mb-2">{med.name}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>Liều dùng: {med.dosage || "—"}</div>
                          <div>Tần suất: {med.frequency || "—"}</div>
                          <div>Thời gian: {med.duration || "—"}</div>
                          <div>
                            Số lượng: {med.quantity || 1} {med.unit || "viên"}
                          </div>
                        </div>
                        {med.instructions && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Hướng dẫn:</span> {med.instructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPrescription.instructions && (
                  <div>
                    <span className="font-medium">Hướng dẫn chung:</span>
                    <p className="mt-1 p-2 bg-blue-50 rounded">{selectedPrescription.instructions}</p>
                  </div>
                )}

                {selectedPrescription.notes && (
                  <div>
                    <span className="font-medium">Ghi chú:</span>
                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedPrescription.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      selectedPrescription.status,
                      selectedPrescription.isDispensed
                    )}`}
                  >
                    {getStatusText(selectedPrescription.status, selectedPrescription.isDispensed)}
                  </div>
                  {selectedPrescription.isDispensed && selectedPrescription.dispensedDate && (
                    <div className="text-sm text-green-600">
                      Đã phát thuốc: {formatDate(selectedPrescription.dispensedDate)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
