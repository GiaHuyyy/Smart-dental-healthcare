// Appointment types for booking system

export interface Doctor {
  _id: string;
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  specialty?: string;
  specialization?: string;
  gender?: "male" | "female" | "other";
  experienceYears?: number;
  rating?: number;
  reviewCount?: number;
  consultationFee?: number;
  clinicName?: string;
  clinicAddress?: string;
  address?: string;
  clinicCity?: string;
  clinicState?: string;
  clinicZip?: string;
  latitude?: number;
  longitude?: number;
  availableConsultTypes?: ConsultType[];
  bio?: string;
  languages?: string[];
  qualifications?: string[];
  acceptsInsurance?: boolean;
  avatarUrl?: string;
}

export interface TimeSlot {
  time: string; // e.g., "10:00 AM"
  available: boolean;
  booked?: boolean;
  selected?: boolean;
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD format
  dayOfWeek: string;
  slots: TimeSlot[];
}

export interface Appointment {
  _id?: string;
  id?: string;
  doctorId: string | Doctor;
  patientId: string | Patient;
  doctor?: Doctor;
  patient?: Patient;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm format
  endTime?: string;
  status: AppointmentStatus;
  consultType: ConsultType;
  chiefComplaint?: string;
  notes?: string;
  bookingId?: string;
  cancellationReason?: string; // Reason for cancellation
  duration?: number; // Duration in minutes
  appointmentType?: string; // Type description
  consultationFee?: number; // Fee for consultation
  paymentAmount?: number; // Actual amount paid (after discounts/vouchers)
  // Payment status (paid, refunded, unpaid, pending, etc.)
  paymentStatus?: "paid" | "refunded" | "unpaid" | "pending" | string;
  createdAt?: string;
  updatedAt?: string;

  // Follow-up fields
  isFollowUp?: boolean; // Is this a follow-up appointment
  isFollowUpSuggestion?: boolean; // Is this a follow-up suggestion from doctor
  followUpParentId?: string; // Parent appointment ID
  followUpDiscount?: number; // Discount percentage (usually 5%)
  suggestedFollowUpDate?: string; // Doctor's suggested date
  suggestedFollowUpTime?: string; // Doctor's suggested time
  appliedVoucherId?: string; // Applied voucher ID

  // AI Analysis Data - Thông tin phân tích AI
  aiAnalysisData?: {
    symptoms?: string;
    uploadedImage?: string;
    analysisResult?: {
      analysis?: string;
      richContent?: {
        analysis?: string;
        sections?: Array<{
          heading?: string;
          text?: string;
          bullets?: string[];
        }>;
        recommendations?: string[];
      };
    };
    urgency?: string;
    hasImageAnalysis?: boolean;
  };
}

export interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  address?: string;
}

export enum AppointmentStatus {
  PENDING = "pending",
  PENDING_PAYMENT = "pending_payment",
  PENDING_PATIENT_CONFIRMATION = "pending_patient_confirmation", // Waiting for patient to confirm follow-up suggestion
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no-show",
}

export enum ConsultType {
  TELEVISIT = "televisit",
  ON_SITE = "on-site",
  HOME_VISIT = "home-visit",
}

export interface FilterOptions {
  gender?: "all" | "male" | "female";
  experienceRange?: [number, number]; // [min, max] years
  feeRange?: [number, number]; // [min, max] fee
  availability?: "morning" | "afternoon" | "evening" | "all";
  consultType?: ConsultType | "all";
  distance?: number; // max distance in km
  rating?: number; // min rating
  acceptsInsurance?: boolean;
}

export interface SearchFilters extends FilterOptions {
  searchQuery?: string;
  specialty?: string;
  location?: {
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface BookingFormData {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  consultType: ConsultType;
  bookForSelf: boolean;
  patientFirstName?: string;
  patientLastName?: string;
  patientDOB?: string;
  patientGender?: "male" | "female" | "other";
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  chiefComplaint?: string;
  symptoms?: string; // Symptoms from AI chat (editable)
  notes?: string;
  paymentMethod?: "momo" | "cash" | "later" | "wallet";
  paymentAmount?: number;
  voucherCode?: string;
  voucherId?: string;
  discountAmount?: number;
  // AI Analysis Data - User choose to include AI data
  includeAIData?: boolean;
  aiAnalysisData?: {
    symptoms?: string;
    uploadedImage?: string;
    analysisResult?: any;
    urgency?: string;
    hasImageAnalysis?: boolean;
  };
}

export interface AppointmentConfirmation {
  appointment: Appointment;
  doctor: Doctor;
  bookingId: string;
  confirmationMessage: string;
  instructions?: string[];
  calendarLinks?: {
    google: string;
    ics: string;
  };
  receiptUrl?: string;
}

// Map-related types
export interface MapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  doctor: Doctor;
}

export interface MapViewport {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}
