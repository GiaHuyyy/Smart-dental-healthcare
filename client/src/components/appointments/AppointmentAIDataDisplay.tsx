"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { FileText, BarChart2, Lightbulb, Image as ImageIcon, Drone, MessageSquarePlus } from "lucide-react";
import DoctorAIFeedbackModal from "./DoctorAIFeedbackModal";
import aiFeedbackService from "@/services/aiFeedbackService";

interface AnalysisSection {
  heading?: string;
  text?: string;
  bullets?: string[];
}

interface AIAnalysisData {
  symptoms?: string;
  uploadedImage?: string;
  analysisResult?: {
    analysis?: string;
    richContent?: {
      analysis?: string;
      sections?: AnalysisSection[];
      recommendations?: string[];
    };
  };
  urgency?: string;
  hasImageAnalysis?: boolean;
}

interface AppointmentAIDataDisplayProps {
  aiData: AIAnalysisData;
  appointmentId?: string;
  showDoctorFeedback?: boolean; // Chỉ hiện nút đánh giá cho bác sĩ
}

export default function AppointmentAIDataDisplay({
  aiData,
  appointmentId,
  showDoctorFeedback = false,
}: AppointmentAIDataDisplayProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);

  // Check if feedback already exists when component mounts
  useEffect(() => {
    if (showDoctorFeedback && appointmentId) {
      aiFeedbackService.checkFeedbackExists(appointmentId).then(setHasFeedback);
    }
  }, [showDoctorFeedback, appointmentId]);

  if (!aiData) return null;

  const renderRichContent = () => {
    if (!aiData.analysisResult?.richContent) {
      // Fallback to simple analysis text
      if (aiData.analysisResult?.analysis) {
        return (
          <div
            className="p-3 rounded-r-lg"
            style={{
              background: "linear-gradient(90deg, var(--color-primary-outline), var(--color-primary-surface))",
              borderLeft: "3px solid var(--color-primary-600)",
            }}
          >
            <h4 className="text-sm font-bold mb-1 flex items-center" style={{ color: "var(--color-primary-600)" }}>
              <FileText className="w-4 h-4 mr-1.5" />
              KẾT QUẢ PHÂN TÍCH
            </h4>
            <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--color-primary-contrast)" }}>
              {aiData.analysisResult.analysis}
            </p>
          </div>
        );
      }
      return null;
    }

    const { analysis, sections, recommendations } = aiData.analysisResult.richContent;

    return (
      <div className="space-y-3">
        {/* Chẩn đoán */}
        {analysis && (
          <div
            className="p-2 rounded-lg"
            style={{
              background: "linear-gradient(90deg, var(--color-primary-outline), var(--color-primary-surface))",
              borderLeft: "3px solid var(--color-primary-600)",
            }}
          >
            <h4 className="text-xs font-bold mb-1 flex items-center" style={{ color: "var(--color-primary-600)" }}>
              <FileText className="w-3 h-3 mr-1" />
              CHẨN ĐOÁN
            </h4>
            <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--color-primary-contrast)" }}>
              {analysis}
            </p>
          </div>
        )}

        {/* Chi tiết phân tích */}
        {sections && sections.length > 0 && (
          <div className="bg-gray-50  border-l-3 border-gray-500 p-2 rounded-lg">
            <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center">
              <BarChart2 className="w-3 h-3 mr-1" />
              CHI TIẾT PHÂN TÍCH
            </h4>
            <div className="space-y-2">
              {sections.map((section: AnalysisSection, index: number) => (
                <div key={index} className="bg-white p-2 rounded border border-gray-200">
                  {section.heading && (
                    <h5 className="font-semibold text-gray-800 mb-1 text-xs">
                      {index + 1}. {section.heading}
                    </h5>
                  )}
                  {section.text && <p className="text-gray-700 text-xs leading-relaxed mb-1">{section.text}</p>}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-0.5">
                      {section.bullets.map((bullet: string, bulletIndex: number) => (
                        <li key={bulletIndex} className="flex items-start text-xs text-gray-700">
                          <span className="text-gray-500 mr-1.5 mt-0.5">•</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Khuyến nghị */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-green-50 border-l-3 border-green-500 p-2 rounded-lg">
            <h4 className="text-xs font-bold text-green-800 mb-2 flex items-center">
              <Lightbulb className="w-3 h-3 mr-1" />
              KHUYẾN NGHỊ
            </h4>
            <ul className="space-y-1.5">
              {recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex text-green-800 items-start bg-white/60">
                  <span className="mr-1 text-xs text-green-600 ">•</span>
                  <span className="text-xs leading-normal">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Drone className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-semibold text-primary text-sm">Thông tin phân tích AI</h4>
        </div>

        {/* Doctor Feedback Button */}
        {showDoctorFeedback && appointmentId && !hasFeedback && (
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Đánh giá từ bác sĩ
          </button>
        )}

        {/* Show badge if already has feedback */}
        {showDoctorFeedback && hasFeedback && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
            ✓ Đã đánh giá
          </span>
        )}
      </div>

      {/* Symptoms */}
      {aiData.symptoms && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-primary mb-1">Triệu chứng:</p>
          <p className="text-sm text-gray-700 line-clamp-2">{aiData.symptoms}</p>
        </div>
      )}

      {/* Urgency Level */}
      {aiData.urgency && aiData.urgency !== "low" && (
        <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs font-medium text-yellow-900">
            ⚠️ Mức độ khẩn cấp: <span className="uppercase">{aiData.urgency}</span>
          </p>
        </div>
      )}

      {/* X-ray Image - Collapsible */}
      {aiData.uploadedImage && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-primary transition-colors">
            <ImageIcon className="w-4 h-4" />
            <span>Hình ảnh X-quang</span>
            <svg
              className="w-4 h-4 ml-auto transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-2 relative h-48 bg-linear-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
            <Image src={aiData.uploadedImage} alt="X-ray" fill className="object-contain" />
          </div>
        </details>
      )}

      {/* AI Analysis Result - Collapsible */}
      {aiData.analysisResult && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-primary transition-colors mb-2">
            <FileText className="w-4 h-4" />
            <span>Kết quả phân tích AI</span>
            <svg
              className="w-4 h-4 ml-auto transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="text-sm">{renderRichContent()}</div>
        </details>
      )}

      {/* Doctor AI Feedback Modal */}
      {showDoctorFeedback && appointmentId && !hasFeedback && (
        <DoctorAIFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          appointmentId={appointmentId}
          aiData={aiData}
          onFeedbackSubmitted={() => setHasFeedback(true)}
        />
      )}
    </div>
  );
}
