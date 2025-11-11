"use client";

import Image from "next/image";
import { Brain, FileText, BarChart2, Lightbulb, Image as ImageIcon } from "lucide-react";

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
}

export default function AppointmentAIDataDisplay({ aiData }: AppointmentAIDataDisplayProps) {
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
            className="p-3 rounded-r-lg"
            style={{
              background: "linear-gradient(90deg, var(--color-primary-outline), var(--color-primary-surface))",
              borderLeft: "3px solid var(--color-primary-600)",
            }}
          >
            <h4 className="text-sm font-bold mb-1 flex items-center" style={{ color: "var(--color-primary-600)" }}>
              <FileText className="w-4 h-4 mr-1.5" />
              CHẨN ĐOÁN
            </h4>
            <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--color-primary-contrast)" }}>
              {analysis}
            </p>
          </div>
        )}

        {/* Chi tiết phân tích */}
        {sections && sections.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-3 border-emerald-500 p-3 rounded-r-lg">
            <h4 className="text-sm font-bold text-emerald-800 mb-2 flex items-center">
              <BarChart2 className="w-4 h-4 mr-1.5" />
              CHI TIẾT PHÂN TÍCH
            </h4>
            <div className="space-y-2">
              {sections.map((section: AnalysisSection, index: number) => (
                <div key={index} className="bg-white/60 p-2 rounded-lg border border-emerald-200">
                  {section.heading && (
                    <h5 className="text-xs font-semibold text-emerald-900 mb-1">
                      {index + 1}. {section.heading}
                    </h5>
                  )}
                  {section.text && <p className="text-emerald-800 text-xs leading-relaxed mb-1">{section.text}</p>}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-0.5">
                      {section.bullets.map((bullet: string, bulletIndex: number) => (
                        <li key={bulletIndex} className="flex items-start text-xs text-emerald-700">
                          <span className="text-emerald-500 mr-1.5 mt-0.5">•</span>
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
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-3 border-amber-500 p-3 rounded-r-lg">
            <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center">
              <Lightbulb className="w-4 h-4 mr-1.5" />
              KHUYẾN NGHỊ
            </h4>
            <ul className="space-y-1.5">
              {recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start bg-white/60 p-2 rounded-lg border border-amber-200">
                  <span className="text-amber-500 mr-2 mt-0.5 text-sm">•</span>
                  <span className="text-amber-900 text-xs font-medium leading-relaxed">{rec}</span>
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
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <Brain className="w-4 h-4 text-blue-600" />
        </div>
        <h4 className="font-semibold text-gray-900 text-sm">Thông tin từ tư vấn AI</h4>
      </div>

      {/* Symptoms */}
      {aiData.symptoms && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-blue-900 mb-1">Triệu chứng:</p>
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
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
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
          <div className="mt-2 relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
            <Image src={aiData.uploadedImage} alt="X-ray" fill className="object-contain" />
          </div>
        </details>
      )}

      {/* AI Analysis Result - Collapsible */}
      {aiData.analysisResult && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors mb-2">
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
    </div>
  );
}
