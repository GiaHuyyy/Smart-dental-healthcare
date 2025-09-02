'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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
  patientId: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  doctorId: {
    _id: string;
    fullName: string;
    email: string;
    specialty: string;
  };
  diagnosis: string;
  prescriptionDate: string;
  medications: Medication[];
  instructions: string;
  notes: string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
}

interface PrescriptionPrintProps {
  prescription: Prescription;
}

export default function PrescriptionPrint({ prescription }: PrescriptionPrintProps) {
  return (
    <div className="print-container p-8 max-w-4xl mx-auto bg-white">
      {/* Header */}
              <div className="text-center border-b-4 border-blue-600 pb-6 mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
          ĐƠN THUỐC
        </h1>
        <p className="text-xl text-gray-600 font-medium">PHIẾU KÊ ĐƠN THUỐC</p>
        <div className="mt-6 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg inline-block">
          <p className="font-medium">Ngày: {format(new Date(prescription.prescriptionDate), 'dd/MM/yyyy', { locale: vi })}</p>
          <p className="font-medium">Mã đơn thuốc: {prescription._id}</p>
        </div>
      </div>

      {/* Patient Information */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
          <h3 className="text-xl font-bold text-blue-800 mb-4 border-b-2 border-blue-300 pb-3">
            THÔNG TIN BỆNH NHÂN
          </h3>
          <div className="space-y-3">
            <p className="text-lg"><span className="font-bold text-blue-700">Họ tên:</span> {prescription.patientId.fullName}</p>
            <p className="text-lg"><span className="font-bold text-blue-700">Email:</span> {prescription.patientId.email}</p>
            <p className="text-lg"><span className="font-bold text-blue-700">Số điện thoại:</span> {prescription.patientId.phone}</p>
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
          <h3 className="text-xl font-bold text-green-800 mb-4 border-b-2 border-green-300 pb-3">
            THÔNG TIN BÁC SĨ
          </h3>
          <div className="space-y-3">
            <p className="text-lg"><span className="font-bold text-green-700">Họ tên:</span> {prescription.doctorId.fullName}</p>
            <p className="text-lg"><span className="font-bold text-green-700">Chuyên khoa:</span> {prescription.doctorId.specialty}</p>
            <p className="text-lg"><span className="font-bold text-green-700">Email:</span> {prescription.doctorId.email}</p>
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-red-800 mb-4 border-b-2 border-red-300 pb-3">
          CHẨN ĐOÁN
        </h3>
        <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-lg shadow-sm">
          <p className="text-xl text-red-800 font-bold">{prescription.diagnosis}</p>
        </div>
      </div>

      {/* Medications */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-green-800 mb-4 border-b-2 border-green-300 pb-3">
          DANH SÁCH THUỐC
        </h3>
        <div className="space-y-6">
          {prescription.medications.map((med, index) => (
            <div key={index} className="border-2 border-green-200 p-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-all duration-300">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <h4 className="font-semibold text-lg text-blue-800">{med.name}</h4>
                  <p className="text-sm text-gray-600">Liều lượng: {med.dosage}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {med.quantity} {med.unit}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="font-medium">Tần suất:</span> {med.frequency}
                </div>
                <div>
                  <span className="font-medium">Thời gian:</span> {med.duration}
                </div>
              </div>
              
              {med.instructions && (
                <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Hướng dẫn sử dụng:</span> {med.instructions}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* General Instructions */}
      {prescription.instructions && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-green-800 mb-4 border-b-2 border-green-300 pb-3">
            HƯỚNG DẪN CHUNG
          </h3>
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg shadow-sm">
            <p className="text-xl text-green-800 font-medium">{prescription.instructions}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {prescription.notes && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-yellow-800 mb-4 border-b-2 border-yellow-300 pb-3">
            GHI CHÚ
          </h3>
          <div className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-lg shadow-sm">
            <p className="text-xl text-yellow-800 font-medium">{prescription.notes}</p>
          </div>
        </div>
      )}

      {/* Follow-up */}
      {prescription.isFollowUpRequired && prescription.followUpDate && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-blue-800 mb-4 border-b-2 border-blue-300 pb-3">
            LỊCH TÁI KHÁM
          </h3>
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg shadow-sm">
            <p className="text-lg text-blue-800 font-medium">
              Ngày tái khám: {format(new Date(prescription.followUpDate), 'dd/MM/yyyy', { locale: vi })}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Vui lòng đặt lịch tái khám theo đúng thời gian trên
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t-4 border-blue-600">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t-2 border-blue-400 pt-4 mt-8">
              <p className="text-lg font-bold text-blue-700">Chữ ký bác sĩ</p>
              <p className="text-xl font-bold text-blue-800 mt-3">{prescription.doctorId.fullName}</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="border-t-2 border-green-400 pt-4 mt-8">
              <p className="text-lg font-bold text-green-700">Chữ ký bệnh nhân</p>
              <p className="text-xl font-bold text-green-800 mt-3">{prescription.patientId.fullName}</p>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
          <p className="text-lg font-medium text-gray-700 mb-2">Đơn thuốc này có hiệu lực trong vòng 30 ngày kể từ ngày kê đơn</p>
          <p className="text-base text-gray-600">Vui lòng tuân thủ đúng hướng dẫn sử dụng thuốc</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .print-container {
            padding: 20px;
            margin: 0;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
