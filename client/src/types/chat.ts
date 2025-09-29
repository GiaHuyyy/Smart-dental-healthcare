export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string; // Add optional image URL field
  actionButtons?: string[]; // Add optional action buttons
  quickActions?: string[]; // Add quick action buttons
  followUpQuestions?: string[]; // Add follow-up questions
  // Additional fields used by AI/image analysis features
  isAnalysisResult?: boolean;
  analysisData?: AnalysisData;
  messageType?: "normal" | "urgent" | "analysis" | "suggestion";
  urgencyLevel?: "low" | "medium" | "high";
  confidence?: number;
}

export interface AnalysisRichSection {
  heading?: string;
  text?: string;
  bullets?: string[];
}

export interface AnalysisRichContent {
  analysis?: string;
  sections?: AnalysisRichSection[];
  recommendations?: string[];
}

export interface AnalysisData {
  richContent?: AnalysisRichContent;
  suggestedDoctor?: DoctorSuggestion;
  urgencyLevel?: "low" | "medium" | "high";
  analysis?: string;
}

export interface DoctorSuggestion {
  _id?: string;
  fullName: string;
  specialty: string;
  keywords: string[];
  email?: string;
  phone?: string;
}

export interface AiResponse {
  message: string;
  suggestedDoctor: DoctorSuggestion | null;
  timestamp: Date;
  context?: unknown;
  quickActions?: string[];
  followUpQuestions?: string[];
  urgencyLevel?: "low" | "medium" | "high";
  confidence?: number;
  nextSteps?: string[];
}
