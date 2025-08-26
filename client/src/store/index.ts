import { configureStore } from '@reduxjs/toolkit';
import appointmentSlice from './slices/appointmentSlice';
import imageAnalysisSlice from './slices/imageAnalysisSlice';

export const store = configureStore({
  reducer: {
    appointment: appointmentSlice,
    imageAnalysis: imageAnalysisSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
