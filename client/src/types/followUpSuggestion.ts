// Follow-up suggestion types

export interface Doctor {
  _id: string;
  fullName: string;
  email: string;
  specialization?: string;
  specialty?: string;
  profileImage?: string;
}

export interface Voucher {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  value?: number;
  expiryDate?: string;
}

export interface FollowUpSuggestion {
  _id: string;
  patientId: string;
  doctorId: Doctor;
  parentAppointmentId: string;
  suggestedDate?: string;
  suggestedTime?: string;
  notes: string;
  status: FollowUpSuggestionStatus;
  scheduledAppointmentId?: string;
  voucherId?: Voucher;
  rejectedAt?: string;
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum FollowUpSuggestionStatus {
  PENDING = "pending",
  SCHEDULED = "scheduled",
  REJECTED = "rejected",
}
