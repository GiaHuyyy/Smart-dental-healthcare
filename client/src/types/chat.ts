export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string; // Add optional image URL field
  actionButtons?: string[]; // Add optional action buttons
  quickActions?: string[]; // Add quick action buttons
  followUpQuestions?: string[]; // Add follow-up questions
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
  context?: any;
  quickActions?: string[];
  followUpQuestions?: string[];
  urgencyLevel?: "low" | "medium" | "high";
  confidence?: number;
  nextSteps?: string[];
}
