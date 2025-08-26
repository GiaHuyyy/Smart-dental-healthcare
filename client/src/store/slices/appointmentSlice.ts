import { DoctorSuggestion } from '@/utils/aiChat';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppointmentState {
  selectedDoctor: DoctorSuggestion | null;
  symptoms: string;
  urgencyLevel: 'high' | 'medium' | 'low';
  chatHistory: string[];
  notes: string;
  appointmentData: {
    doctorId?: string;
    doctorName?: string;
    specialty?: string;
    symptoms?: string;
    urgency?: string;
    notes?: string;
    hasImageAnalysis?: boolean;
    // Thêm các trường mới cho hình ảnh và phân tích
    uploadedImage?: string;
    analysisResult?: any;
    imageUrl?: string;
  } | null;
}

const initialState: AppointmentState = {
  selectedDoctor: null,
  symptoms: '',
  urgencyLevel: 'low',
  chatHistory: [],
  notes: '',
  appointmentData: null,
};

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState,
  reducers: {
    setSelectedDoctor: (state, action: PayloadAction<DoctorSuggestion | null>) => {
      state.selectedDoctor = action.payload;
    },
    setSymptoms: (state, action: PayloadAction<string>) => {
      state.symptoms = action.payload;
    },
    setUrgencyLevel: (state, action: PayloadAction<'high' | 'medium' | 'low'>) => {
      state.urgencyLevel = action.payload;
    },
    addChatMessage: (state, action: PayloadAction<string>) => {
      state.chatHistory.push(action.payload);
    },
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    },
    setAppointmentData: (state, action: PayloadAction<AppointmentState['appointmentData']>) => {
      state.appointmentData = action.payload;
    },
    clearAppointmentData: (state) => {
      state.selectedDoctor = null;
      state.symptoms = '';
      state.urgencyLevel = 'low';
      state.chatHistory = [];
      state.notes = '';
      state.appointmentData = null;
    },
    updateAppointmentData: (state, action: PayloadAction<Partial<AppointmentState['appointmentData']>>) => {
      if (state.appointmentData) {
        state.appointmentData = { ...state.appointmentData, ...action.payload };
      } else {
        state.appointmentData = action.payload;
      }
    },
  },
});

export const {
  setSelectedDoctor,
  setSymptoms,
  setUrgencyLevel,
  addChatMessage,
  setNotes,
  setAppointmentData,
  clearAppointmentData,
  updateAppointmentData,
} = appointmentSlice.actions;

export default appointmentSlice.reducer;
