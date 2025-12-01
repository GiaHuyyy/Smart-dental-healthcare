"use client";

import { useState } from "react";
import { X, Star, CheckCircle, AlertTriangle, XCircle, Loader2, MessageSquarePlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import aiFeedbackService, { CreateAIFeedbackDto, AIFeedbackData } from "@/services/aiFeedbackService";

interface AIAnalysisData {
  symptoms?: string;
  uploadedImage?: string;
  analysisResult?: {
    analysis?: string;
    richContent?: {
      analysis?: string;
      sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
      recommendations?: string[];
    };
  };
  urgency?: string;
  hasImageAnalysis?: boolean;
}

interface DoctorAIFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  aiData: AIAnalysisData;
  onFeedbackSubmitted?: (feedback: AIFeedbackData) => void;
}

export default function DoctorAIFeedbackModal({
  isOpen,
  onClose,
  appointmentId,
  aiData,
  onFeedbackSubmitted,
}: DoctorAIFeedbackModalProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [accuracyRating, setAccuracyRating] = useState<number>(3);
  const [diagnosisAccuracy, setDiagnosisAccuracy] = useState<"correct" | "partially_correct" | "incorrect">("correct");
  const [actualDiagnosis, setActualDiagnosis] = useState("");
  const [correctPoints, setCorrectPoints] = useState("");
  const [incorrectPoints, setIncorrectPoints] = useState("");
  const [missedPoints, setMissedPoints] = useState("");
  const [recommendationsQuality, setRecommendationsQuality] = useState<
    "appropriate" | "partially_appropriate" | "inappropriate"
  >("appropriate");
  const [additionalRecommendations, setAdditionalRecommendations] = useState("");
  const [detailedComment, setDetailedComment] = useState("");
  const [improvementSuggestions, setImprovementSuggestions] = useState("");

  const handleSubmit = async () => {
    if (!appointmentId) {
      toast.error("Không tìm thấy thông tin lịch hẹn");
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = (session as { access_token?: string })?.access_token;

      const feedbackData: CreateAIFeedbackDto = {
        appointmentId,
        imageUrl: aiData.uploadedImage,
        originalAIAnalysis: {
          symptoms: aiData.symptoms,
          analysisResult: aiData.analysisResult,
          urgency: aiData.urgency,
        },
        accuracyRating,
        diagnosisAccuracy,
        actualDiagnosis: actualDiagnosis || undefined,
        correctPoints: correctPoints ? correctPoints.split("\n").filter((p) => p.trim()) : [],
        incorrectPoints: incorrectPoints ? incorrectPoints.split("\n").filter((p) => p.trim()) : [],
        missedPoints: missedPoints ? missedPoints.split("\n").filter((p) => p.trim()) : [],
        recommendationsQuality,
        additionalRecommendations: additionalRecommendations
          ? additionalRecommendations.split("\n").filter((r) => r.trim())
          : [],
        detailedComment: detailedComment || undefined,
        improvementSuggestions: improvementSuggestions || undefined,
      };

      const result = await aiFeedbackService.createFeedback(feedbackData, accessToken);

      if (result.success && result.data) {
        toast.success("Đã gửi đánh giá thành công!");
        toast.success("Cảm ơn bạn đã đóng góp ý kiến!");
        onFeedbackSubmitted?.(result.data);
        onClose();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Có lỗi xảy ra khi gửi đánh giá");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <MessageSquarePlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Đánh giá kết quả phân tích AI</h2>
              <p className="text-sm text-gray-500">Đánh giá này sẽ được sử dụng để cải thiện AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Accuracy Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Độ chính xác tổng thể của AI <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setAccuracyRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= accuracyRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">({accuracyRating}/5)</span>
              </div>
            </div>

            {/* Diagnosis Accuracy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI chẩn đoán có chính xác không? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDiagnosisAccuracy("correct")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    diagnosisAccuracy === "correct"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Đúng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiagnosisAccuracy("partially_correct")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    diagnosisAccuracy === "partially_correct"
                      ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                      : "border-gray-200 hover:border-yellow-300"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Đúng một phần</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiagnosisAccuracy("incorrect")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    diagnosisAccuracy === "incorrect"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Sai</span>
                </button>
              </div>
            </div>

            {/* Actual Diagnosis (if different) */}
            {diagnosisAccuracy !== "correct" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chẩn đoán thực tế của bác sĩ</label>
                <textarea
                  value={actualDiagnosis}
                  onChange={(e) => setActualDiagnosis(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Nhập chẩn đoán chính xác..."
                />
              </div>
            )}

            {/* Correct Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Những điểm AI phân tích đúng
                <span className="text-xs text-gray-500 ml-1">(mỗi điểm một dòng)</span>
              </label>
              <textarea
                value={correctPoints}
                onChange={(e) => setCorrectPoints(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ví dụ: Phát hiện đúng vị trí sâu răng&#10;Đánh giá đúng mức độ nghiêm trọng"
              />
            </div>

            {/* Incorrect Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Những điểm AI phân tích sai
                <span className="text-xs text-gray-500 ml-1">(mỗi điểm một dòng)</span>
              </label>
              <textarea
                value={incorrectPoints}
                onChange={(e) => setIncorrectPoints(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ví dụ: Nhầm lẫn vị trí răng&#10;Đánh giá quá mức nghiêm trọng"
              />
            </div>

            {/* Missed Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Những điểm AI bỏ sót
                <span className="text-xs text-gray-500 ml-1">(mỗi điểm một dòng)</span>
              </label>
              <textarea
                value={missedPoints}
                onChange={(e) => setMissedPoints(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ví dụ: Không phát hiện viêm nướu&#10;Bỏ sót răng khôn mọc lệch"
              />
            </div>

            {/* Recommendations Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Khuyến nghị của AI có phù hợp?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRecommendationsQuality("appropriate")}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    recommendationsQuality === "appropriate"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  Phù hợp
                </button>
                <button
                  type="button"
                  onClick={() => setRecommendationsQuality("partially_appropriate")}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    recommendationsQuality === "partially_appropriate"
                      ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                      : "border-gray-200 hover:border-yellow-300"
                  }`}
                >
                  Phù hợp một phần
                </button>
                <button
                  type="button"
                  onClick={() => setRecommendationsQuality("inappropriate")}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    recommendationsQuality === "inappropriate"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  Không phù hợp
                </button>
              </div>
            </div>

            {/* Additional Recommendations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khuyến nghị bổ sung từ bác sĩ
                <span className="text-xs text-gray-500 ml-1">(mỗi khuyến nghị một dòng)</span>
              </label>
              <textarea
                value={additionalRecommendations}
                onChange={(e) => setAdditionalRecommendations(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ví dụ: Cần chụp X-quang thêm&#10;Nên tái khám sau 2 tuần"
              />
            </div>

            {/* Detailed Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nhận xét chi tiết</label>
              <textarea
                value={detailedComment}
                onChange={(e) => setDetailedComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Nhập nhận xét tổng quan về kết quả phân tích AI..."
              />
            </div>

            {/* Improvement Suggestions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gợi ý cải thiện cho AI</label>
              <textarea
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ví dụ: AI cần cải thiện khả năng phát hiện viêm nướu giai đoạn đầu..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              "Gửi đánh giá"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
