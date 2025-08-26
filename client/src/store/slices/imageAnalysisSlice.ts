import { ImageAnalysisResult } from '@/utils/imageAnalysis';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ImageAnalysisState {
  analysisResult: ImageAnalysisResult | null;
  uploadedImage: string | null;
  isAnalyzing: boolean;
  analysisHistory: ImageAnalysisResult[];
}

const initialState: ImageAnalysisState = {
  analysisResult: null,
  uploadedImage: null,
  isAnalyzing: false,
  analysisHistory: [],
};

const imageAnalysisSlice = createSlice({
  name: 'imageAnalysis',
  initialState,
  reducers: {
    setAnalysisResult: (state, action: PayloadAction<ImageAnalysisResult>) => {
      state.analysisResult = action.payload;
      state.analysisHistory.push(action.payload);
    },
    setUploadedImage: (state, action: PayloadAction<string>) => {
      state.uploadedImage = action.payload;
    },
    setIsAnalyzing: (state, action: PayloadAction<boolean>) => {
      state.isAnalyzing = action.payload;
    },
    clearAnalysisResult: (state) => {
      state.analysisResult = null;
      state.uploadedImage = null;
    },
    clearAllAnalysis: (state) => {
      state.analysisResult = null;
      state.uploadedImage = null;
      state.analysisHistory = [];
    },
  },
});

export const {
  setAnalysisResult,
  setUploadedImage,
  setIsAnalyzing,
  clearAnalysisResult,
  clearAllAnalysis,
} = imageAnalysisSlice.actions;

export default imageAnalysisSlice.reducer;
