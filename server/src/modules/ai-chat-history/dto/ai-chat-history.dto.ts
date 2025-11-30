import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';

export class CreateAiChatSessionDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  urgencyLevel?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  suggestedDoctorId?: string;

  @IsOptional()
  suggestedDoctor?: any;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class CreateAiChatMessageDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  role: string; // 'user' or 'assistant'

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  messageType?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  analysisData?: any;

  @IsOptional()
  @IsArray()
  actionButtons?: string[];

  @IsOptional()
  @IsString()
  urgencyLevel?: string;

  @IsOptional()
  suggestedDoctor?: any;

  @IsOptional()
  @IsBoolean()
  isQuickSuggestion?: boolean;

  @IsOptional()
  @IsString()
  quickSuggestionType?: string;

  @IsOptional()
  metadata?: any;
}

export class UpdateAiChatSessionDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  finalAction?: string;

  @IsOptional()
  @IsNumber()
  messageCount?: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsBoolean()
  hasImageAnalysis?: boolean;

  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @IsOptional()
  analysisResults?: any;

  @IsOptional()
  @IsNumber()
  patientSatisfaction?: number;

  @IsOptional()
  @IsBoolean()
  followUpNeeded?: boolean;

  @IsOptional()
  suggestedDoctor?: any;

  @IsOptional()
  @IsString()
  suggestedDoctorId?: string;

  @IsOptional()
  @IsArray()
  suggestedDoctors?: any[];

  @IsOptional()
  @IsArray()
  tags?: string[];
}
