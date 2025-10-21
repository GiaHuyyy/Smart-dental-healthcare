import { ConsultType } from "@/types/appointment";

/**
 * Consultation fee calculator based on consult type and base fee
 * Giá khám theo hình thức và giá cơ bản của bác sĩ
 */

// Multipliers for each consult type (hệ số nhân theo hình thức khám)
const CONSULT_TYPE_MULTIPLIERS = {
  [ConsultType.TELEVISIT]: 0.6,      // Tư vấn từ xa: -40% (rẻ nhất)
  [ConsultType.ON_SITE]: 1.0,        // Khám tại phòng khám: 100% (giá chuẩn)
  [ConsultType.HOME_VISIT]: 2.0,     // Khám tại nhà: +100% (đắt nhất)
};

// Default fees if doctor doesn't have consultationFee (giá mặc định nếu bác sĩ chưa có giá)
const DEFAULT_BASE_FEE = 200000; // 200,000 VND

const DEFAULT_FEES = {
  [ConsultType.TELEVISIT]: 150000,   // 150,000 VND
  [ConsultType.ON_SITE]: 200000,     // 200,000 VND
  [ConsultType.HOME_VISIT]: 400000,  // 400,000 VND
};

/**
 * Calculate consultation fee based on type and doctor's base fee
 * @param consultType - Type of consultation
 * @param doctorBaseFee - Doctor's base consultation fee (optional)
 * @returns Calculated fee in VND
 */
export function calculateConsultationFee(
  consultType: ConsultType,
  doctorBaseFee?: number
): number {
  // If doctor has a base fee, apply multiplier
  if (doctorBaseFee && doctorBaseFee > 0) {
    const multiplier = CONSULT_TYPE_MULTIPLIERS[consultType] || 1.0;
    return Math.round(doctorBaseFee * multiplier);
  }
  
  // Otherwise use default fees
  return DEFAULT_FEES[consultType] || DEFAULT_BASE_FEE;
}

/**
 * Get all fees for a doctor across all consult types
 * @param doctorBaseFee - Doctor's base consultation fee
 * @returns Object with fees for each consult type
 */
export function getDoctorFeesByType(doctorBaseFee?: number) {
  return {
    televisit: calculateConsultationFee(ConsultType.TELEVISIT, doctorBaseFee),
    onSite: calculateConsultationFee(ConsultType.ON_SITE, doctorBaseFee),
    homeVisit: calculateConsultationFee(ConsultType.HOME_VISIT, doctorBaseFee),
  };
}

/**
 * Format fee to VND currency string
 * @param amount - Amount in VND
 * @returns Formatted string (e.g., "200,000₫")
 */
export function formatFee(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}₫`;
}

/**
 * Get consult type label in Vietnamese
 */
export function getConsultTypeLabel(consultType: ConsultType): string {
  switch (consultType) {
    case ConsultType.TELEVISIT:
      return "Tư vấn từ xa";
    case ConsultType.ON_SITE:
      return "Khám tại phòng khám";
    case ConsultType.HOME_VISIT:
      return "Khám tại nhà";
    default:
      return "";
  }
}

/**
 * Get consult type description
 */
export function getConsultTypeDescription(consultType: ConsultType): string {
  switch (consultType) {
    case ConsultType.TELEVISIT:
      return "Video call online";
    case ConsultType.ON_SITE:
      return "Đến phòng khám";
    case ConsultType.HOME_VISIT:
      return "Bác sĩ đến tận nơi";
    default:
      return "";
  }
}




