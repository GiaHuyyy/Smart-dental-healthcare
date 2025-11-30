"use client";

import Image from "next/image";
import { FileText, BarChart2, Lightbulb, Search } from "lucide-react";

interface AnalysisSection {
  heading?: string;
  text?: string;
  bullets?: string[];
}

interface RichContent {
  analysis?: string;
  sections?: AnalysisSection[];
  recommendations?: string[];
}

interface AnalysisResult {
  analysis?: string;
  richContent?: RichContent;
}

interface AIAnalysisSummaryProps {
  analysisResult: AnalysisResult;
  uploadedImage?: string;
}

export default function AIAnalysisSummary({ analysisResult, uploadedImage }: AIAnalysisSummaryProps) {
  if (!analysisResult) return null;

  // Function to render rich content sections - COMPACT VERSION
  const renderRichContent = () => {
    if (!analysisResult.richContent) {
      // Fallback to simple analysis text if no rich content
      if (analysisResult.analysis) {
        return (
          <div
            className="p-2 rounded-r-lg text-xs"
            style={{
              background: "linear-gradient(90deg, var(--color-primary-outline), var(--color-primary-surface))",
              borderLeft: "3px solid var(--color-primary-600)",
            }}
          >
            <h4 className="text-xs font-bold mb-1 flex items-center text-primary">
              <FileText className="w-3 h-3 mr-1" />
              KẾT QUẢ PHÂN TÍCH
            </h4>
            <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--color-primary-contrast)" }}>
              {analysisResult.analysis}
            </p>
          </div>
        );
      }
      return null;
    }

    const { analysis, sections, recommendations } = analysisResult.richContent;

    return (
      <div className="space-y-2">
        {/* Chẩn đoán - COMPACT */}
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

        {/* Chi tiết phân tích - COMPACT */}
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
                  {section.text && <p className="text-gray-700 text-xs leading-tight mb-1">{section.text}</p>}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-0.5">
                      {section.bullets.map((bullet: string, bulletIndex: number) => (
                        <li key={bulletIndex} className="flex items-start text-xs text-gray-700">
                          <span className="text-primary mr-1">•</span>
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

        {/* Khuyến nghị - COMPACT */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-green-50 border-l-3 border-green-500 p-2 rounded-lg">
            <h4 className="text-xs font-bold text-green-800 mb-2 flex items-center">
              <Lightbulb className="w-3 h-3 mr-1" />
              KHUYẾN NGHỊ
            </h4>
            <ul className="space-y-1">
              {recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex text-green-800 items-start bg-white/60">
                  <span className="mr-1 text-xs text-green-600">•</span>
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
    <div className="bg-white border border-blue-100 rounded-lg p-3 mb-3">
      {/* Header - COMPACT */}
      <div className="flex items-center mb-2 pb-2 border-b border-gray-200">
        <div className="p-1.5 rounded-full mr-2" style={{ background: "var(--color-primary-600)" }}>
          <Search className="w-3 h-3 text-white" />
        </div>
        <div>
          <h4 className="text-xs font-bold" style={{ color: "var(--color-primary-600)" }}>
            Kết quả phân tích của AI
          </h4>
          <p className="text-gray-500 text-[10px]">AI Analysis Result</p>
        </div>
      </div>

      <div className="space-y-2">
        {/* Hình ảnh X-quang - COMPACT */}
        {uploadedImage && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Hình ảnh X-quang:</p>
            <div className="relative h-32 bg-linear-to-br from-gray-100 to-gray-200 rounded overflow-hidden">
              <Image src={uploadedImage} alt="X-ray đã phân tích" fill className="object-contain" />
            </div>
          </div>
        )}

        {/* Kết quả phân tích */}
        {renderRichContent()}
      </div>
    </div>
  );
}
