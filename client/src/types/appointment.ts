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
  profileImage?: string;
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
  doctorId: string;
  patientId: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  notes?: string;
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
