"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle, MapPin, Phone, Mail, Calendar, Clock, Download, X } from "lucide-react";
import { AppointmentConfirmation } from "@/types/appointment";
import { getDoctorPlaceholder } from "@/utils/placeholder";

interface AppointmentConfirmationProps {
  confirmation: AppointmentConfirmation;
  onClose: () => void;
  onReschedule?: () => void;
  onDownloadReceipt?: () => void;
}

export default function AppointmentConfirmationComponent({
  confirmation,
  onClose,
  onReschedule,
  onDownloadReceipt,
}: AppointmentConfirmationProps) {
  const { appointment, doctor, bookingId, confirmationMessage, instructions, calendarLinks } = confirmation;

  const handleAddToGoogleCalendar = () => {
    if (calendarLinks?.google) {
      window.open(calendarLinks.google, "_blank");
    }
  };

  const handleDownloadICS = () => {
    if (calendarLinks?.ics) {
      window.open(calendarLinks.ics, "_blank");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-t-2xl border-b border-green-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt lịch thành công!</h2>
            <p className="text-gray-600">{confirmationMessage}</p>
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-white rounded-lg shadow-sm">
              <span className="text-sm text-gray-600">Mã đặt lịch:</span>
              <span className="ml-2 font-mono font-semibold text-gray-900">#{bookingId}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appointment Details */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết lịch hẹn</h3>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ngày khám</p>
                  <p className="font-semibold text-gray-900">{formatDate(appointment.appointmentDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Giờ khám</p>
                  <p className="font-semibold text-gray-900">{appointment.startTime}</p>
                </div>
              </div>
            </div>

            {/* Consult Type */}
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                {appointment.consultType === "televisit" && "Tư vấn từ xa"}
                {appointment.consultType === "on-site" && "Khám tại phòng khám"}
                {appointment.consultType === "home-visit" && "Khám tại nhà"}
              </span>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="healthcare-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin bác sĩ</h3>
            <div className="flex items-start gap-4">
              <Image
                src={getDoctorPlaceholder(doctor, 80)}
                alt={doctor.fullName}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-100"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-gray-900">{doctor.fullName}</h4>
                <p className="text-blue-600 font-medium mb-3">{doctor.specialty}</p>

                <div className="space-y-2">
                  {doctor.clinicName && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{doctor.clinicName}</span>
                    </div>
                  )}
                  {doctor.clinicAddress && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{doctor.clinicAddress}</span>
                    </div>
                  )}
                  {doctor.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${doctor.phone}`} className="hover:text-blue-600 transition-colors">
                        {doctor.phone}
                      </a>
                    </div>
                  )}
                  {doctor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${doctor.email}`} className="hover:text-blue-600 transition-colors">
                        {doctor.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {instructions && instructions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hướng dẫn cần lưu ý</h3>
              <ul className="space-y-2">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Thêm vào lịch</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToGoogleCalendar}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Google Calendar</span>
              </button>
              <button
                onClick={handleDownloadICS}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Download className="w-5 h-5" />
                <span className="font-medium">iOS Calendar</span>
              </button>
            </div>
          </div>

          {/* View Location Button */}
          {doctor.latitude && doctor.longitude && (
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
              <MapPin className="w-5 h-5" />
              Xem vị trí trên bản đồ
            </button>
          )}

          {/* Download Receipt */}
          {onDownloadReceipt && (
            <button
              onClick={onDownloadReceipt}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <Download className="w-5 h-5" />
              Tải xuống biên lai
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex flex-col sm:flex-row gap-3">
          {onReschedule && (
            <button
              onClick={onReschedule}
              className="flex-1 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Đổi lịch hẹn
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}

// Placeholder import for Building2 icon
import { Building2 } from "lucide-react";
