"use client";

import { useState } from "react";
import { ArrowLeft, User, Calendar, FileText } from "lucide-react";
import PatientOverview from "./PatientOverview";
import PatientAppointments from "./PatientAppointments";
import PatientMedicalRecords from "./PatientMedicalRecords";

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

interface Appointment {
  _id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  appointmentType?: string;
  consultationFee?: number;
  notes?: string;
  paymentStatus?: string;
  duration?: number;
  doctorId: {
    _id: string;
    fullName: string;
    specialty: string;
  };
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
  medications?: string[];
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

interface Payment {
  _id: string;
  amount: number;
  status: string;
  type: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  refId?: string;
  refModel?: string;
}

interface PatientDetailViewProps {
  patient: Patient;
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  payments: Payment[];
  loading: boolean;
  onBack: () => void;
  onRefresh?: () => void;
}

export default function PatientDetailView({
  patient,
  appointments,
  medicalRecords,
  payments,
  loading,
  onBack,
  onRefresh,
}: PatientDetailViewProps) {
  const [activeTab, setActiveTab] = useState("overview");

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

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
          Đang hoạt động
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          Không hoạt động
        </span>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {patient.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{patient.fullName}</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} tuổi` : "Chưa cập nhật"}
                {patient.gender && ` • ${patient.gender === "male" ? "Nam" : "Nữ"}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">{getStatusBadge(patient.isActive)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-2 px-4">
            {[
              { id: "overview", label: "Tổng quan", icon: User },
              { id: "appointments", label: "Lịch khám", icon: Calendar },
              { id: "medical-records", label: "Hồ sơ bệnh án", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 border-b-2 text-base flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-gray-600 hover:text-primary hover:border-primary/30"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <PatientOverview
                  patient={patient}
                  appointments={appointments}
                  medicalRecords={medicalRecords}
                  payments={payments}
                />
              )}

              {activeTab === "appointments" && (
                <PatientAppointments appointments={appointments} patientId={patient._id} onRefresh={onRefresh} />
              )}

              {activeTab === "medical-records" && (
                <PatientMedicalRecords medicalRecords={medicalRecords} patient={patient} onRefresh={onRefresh} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
