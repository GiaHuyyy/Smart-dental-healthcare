"use client";

import Image from "next/image";
import { Search, FileText, BarChart2, Lightbulb, Wrench, Stethoscope, Calendar, Check } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  actionButtons?: string[];
  onActionClick?: (action: string) => void;
  isAnalysisResult?: boolean;
  analysisData?: any;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  imageUrl,
  actionButtons,
  onActionClick,
  isAnalysisResult,
  analysisData,
}: ChatMessageProps) {
  const isUser = role === "user";
  const hasActions = actionButtons && actionButtons.length > 0;

  const getButtonIcon = (buttonText: string) => {
    if (buttonText.includes("Giải thích")) return <Lightbulb className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Đặt lịch")) return <Calendar className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Hướng dẫn")) return <Wrench className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Gợi ý bác sĩ")) return <Stethoscope className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Kết thúc")) return <Check className="w-4 h-4 mr-1" />;
    return <Wrench className="w-4 h-4 mr-1" />;
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
          isUser
            ? "msg-outgoing"
            : hasActions || isAnalysisResult
            ? "bg-white text-gray-900 border border-gray-200 shadow-lg"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {/* Image if available */}
        {imageUrl && (
          <div className="mb-3">
            <Image
              src={imageUrl}
              alt="Uploaded image"
              width={200}
              height={200}
              className="max-w-full h-auto rounded-lg border object-cover"
              style={{ maxHeight: "200px" }}
            />
          </div>
        )}

        {/* Analysis result với spacing nhỏ hơn */}
        {isAnalysisResult && analysisData ? (
          <div className="space-y-2">
            {/* Header */}
            <div
              className="flex items-center justify-center p-2 rounded-lg"
              style={{ background: "linear-gradient(90deg, var(--color-primary-outline), #f0fbff)" }}
            >
              <span
                className="font-bold text-base inline-flex items-center"
                style={{ color: "var(--color-primary-600)" }}
              >
                <Search className="w-4 h-4 mr-2" />
                Kết quả phân tích ảnh
              </span>
            </div>

            {/* Chẩn đoán */}
            {analysisData.richContent?.analysis && (
              <div
                className="p-2 rounded-lg"
                style={{
                  background: "linear-gradient(90deg,var(--color-primary-outline),#f0fbff)",
                  borderLeft: "4px solid var(--color-primary-600)",
                }}
              >
                <div
                  className="text-sm font-semibold mb-1 flex items-center"
                  style={{ color: "var(--color-primary-600)" }}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  CHẨN ĐOÁN
                </div>
                <p className="leading-normal text-sm" style={{ color: "var(--color-primary-contrast)" }}>
                  {analysisData.richContent.analysis}
                </p>
              </div>
            )}

            {/* Chi tiết - Hiển thị tất cả */}
            {analysisData.richContent?.sections && analysisData.richContent.sections.length > 0 && (
              <div className="p-2 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                <div className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                  <BarChart2 className="w-4 h-4 mr-1" />
                  CHI TIẾT PHÂN TÍCH
                </div>
                <div className="space-y-1">
                  {analysisData.richContent.sections.map((section: any, index: number) => (
                    <div key={index} className="bg-white rounded-md p-2 border border-gray-200">
                      {section.heading && (
                        <div className="font-semibold text-gray-800 mb-1 text-sm">
                          {index + 1}. {section.heading}
                        </div>
                      )}
                      {section.text && <div className="text-gray-700 mb-1 leading-normal text-sm">{section.text}</div>}
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="space-y-0">
                          {section.bullets.map((bullet: string, bulletIndex: number) => (
                            <li key={bulletIndex} className="text-gray-700 flex items-start text-sm">
                              <span className="mr-1 mt-0" style={{ color: "var(--color-primary)" }}>
                                •
                              </span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Khuyến nghị - Hiển thị tất cả */}
            {analysisData.richContent?.recommendations && (
              <div
                className="p-2 bg-primary-100 rounded-lg border-l-4"
                style={{ borderColor: "var(--color-primary-600)" }}
              >
                <div className="text-sm font-semibold text-primary mb-1 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  KHUYẾN NGHỊ
                </div>
                <div className="space-y-0">
                  {analysisData.richContent.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start" style={{ color: "var(--color-primary-contrast)" }}>
                      <span className="mr-2 mt-0 font-bold" style={{ color: "var(--color-primary)" }}>
                        •
                      </span>
                      <span className="text-sm leading-normal">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action prompt */}
            <div
              className="text-center p-2 rounded-lg"
              style={{ background: "var(--color-accent)", border: "1px solid #ffedd5" }}
            >
              <p
                className="font-medium flex items-center justify-center text-sm"
                style={{ color: "var(--color-warning)" }}
              >
                <Wrench className="w-4 h-4 mr-1" />
                Sử dụng các nút bên dưới để tương tác
              </p>
            </div>
          </div>
        ) : (
          /* Regular message content - Original format with proper colors */
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        )}

        {/* Action buttons */}
        {hasActions && onActionClick && (
          <div className="mt-4 flex flex-wrap gap-2">
            {actionButtons.map((buttonText, index) => (
              <button
                key={index}
                onClick={() => onActionClick(buttonText)}
                className="px-3 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm transition-transform duration-150 hover:scale-105 btn-primary-small"
              >
                <span className="mr-1">{getButtonIcon(buttonText)}</span>
                {buttonText}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${isUser ? "text-white" : "text-gray-500"}`}
          style={isUser ? { color: "rgba(255,255,255,0.9)" } : undefined}
        >
          {timestamp instanceof Date
            ? timestamp.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : new Date(timestamp).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
        </div>
      </div>
    </div>
  );
}
