import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export class CreateAIFeedbackDto {
  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  originalAIAnalysis?: {
    symptoms?: string;
    analysisResult?: {
      diagnosis?: string;
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
  };

  @IsNumber()
  @Min(1)
  @Max(5)
  accuracyRating: number;

  @IsEnum(['correct', 'partially_correct', 'incorrect'])
  diagnosisAccuracy: string;

  @IsOptional()
  @IsString()
  actualDiagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  correctPoints?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incorrectPoints?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missedPoints?: string[];

  @IsOptional()
  @IsEnum(['appropriate', 'partially_appropriate', 'inappropriate'])
  recommendationsQuality?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalRecommendations?: string[];

  @IsOptional()
  @IsString()
  detailedComment?: string;

  @IsOptional()
  @IsString()
  improvementSuggestions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateAIFeedbackDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  accuracyRating?: number;

  @IsOptional()
  @IsEnum(['correct', 'partially_correct', 'incorrect'])
  diagnosisAccuracy?: string;

  @IsOptional()
  @IsString()
  actualDiagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  correctPoints?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incorrectPoints?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missedPoints?: string[];

  @IsOptional()
  @IsEnum(['appropriate', 'partially_appropriate', 'inappropriate'])
  recommendationsQuality?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalRecommendations?: string[];

  @IsOptional()
  @IsString()
  detailedComment?: string;

  @IsOptional()
  @IsString()
  improvementSuggestions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class QueryAIFeedbackDto {
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsEnum(['correct', 'partially_correct', 'incorrect'])
  diagnosisAccuracy?: string;

  @IsOptional()
  @IsString()
  usedForTraining?: string; // 'true' | 'false'

  @IsOptional()
  @IsEnum(['high', 'medium', 'low'])
  trainingPriority?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
