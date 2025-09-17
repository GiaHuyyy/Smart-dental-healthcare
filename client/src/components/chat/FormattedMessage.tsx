"use client";

import { FileText, BarChart2, Lightbulb, Wrench } from "lucide-react";

interface FormattedMessageProps {
  content: string;
  role: "user" | "assistant";
}

export default function FormattedMessage({ content, role }: FormattedMessageProps) {
  // Helper function to clean markdown formatting
  const cleanMarkdown = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, "$1");
  };

  // Function to format the analysis result with clean, simple styling
  const formatAnalysisContent = (text: string) => {
    // Split content into sections by known headings
    const sections = text.split(/(?=CHẨN ĐOÁN|CHI TIẾT PHÂN TÍCH|KHUYẾN NGHỊ|CÁC HÀNH ĐỘNG TIẾP THEO)/);

    return sections.map((section, index) => {
      if (section.trim() === "") return null;

      // Header section
      if (section.includes("KẾT QUẢ PHÂN TÍCH ẢNH")) {
        return (
          <div key={index} className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">KẾT QUẢ PHÂN TÍCH ẢNH</h2>
            <div className="w-16 h-0.5 bg-gray-300 mx-auto"></div>
          </div>
        );
      }

      // Chẩn đoán section
      if (section.includes("CHẨN ĐOÁN")) {
        const diagnosis = section.replace(/CHẨN ĐOÁN:?/i, "").trim();
        return (
          <div key={index} className="mb-4">
            <div
              className="p-3 rounded-r"
              style={{ background: "var(--color-primary-outline)", borderLeft: "3px solid rgba(0,166,244,0.12)" }}
            >
              <h3
                className="text-base font-semibold mb-1 flex items-center"
                style={{ color: "var(--color-primary-600)" }}
              >
                <FileText className="w-4 h-4 mr-2" />
                CHẨN ĐOÁN
              </h3>
              <p className="text-sm" style={{ color: "var(--color-primary-contrast)" }}>
                {cleanMarkdown(diagnosis)}
              </p>
            </div>
          </div>
        );
      }

      // Chi tiết phân tích section
      if (section.includes("CHI TIẾT PHÂN TÍCH")) {
        const details = section.replace(/CHI TIẾT PHÂN TÍCH:?/i, "").trim();
        const lines = details.split("\n").filter((line) => line.trim());

        return (
          <div key={index} className="mb-4">
            <div
              className="p-3 rounded-r"
              style={{ background: "#ecfdf5", borderLeft: "3px solid rgba(16,185,129,0.12)" }}
            >
              <h3 className="text-base font-semibold mb-2 flex items-center" style={{ color: "#047857" }}>
                <BarChart2 className="w-4 h-4 mr-2" />
                CHI TIẾT PHÂN TÍCH
              </h3>
              <div className="space-y-2">
                {lines.map((line, lineIndex) => {
                  // Check if it's a numbered item with markdown formatting and colon
                  const numberedWithColonMatch = line.match(/^(\d+)\.\s\*\*(.+?)\*\*\s*:\s*(.+)$/);
                  if (numberedWithColonMatch) {
                    const [, number, heading, text] = numberedWithColonMatch;
                    return (
                      <div
                        key={lineIndex}
                        className="bg-white p-2 rounded"
                        style={{ border: "1px solid rgba(16,185,129,0.08)" }}
                      >
                        <h4 className="font-medium mb-1 text-sm" style={{ color: "#047857" }}>
                          {number}. {cleanMarkdown(heading)}:
                        </h4>
                        <p className="text-sm ml-4" style={{ color: "#065f46" }}>
                          {cleanMarkdown(text)}
                        </p>
                      </div>
                    );
                  }

                  // Check if it's a numbered item with markdown formatting (no colon)
                  const numberedMatch = line.match(/^(\d+)\.\s\*\*(.+?)\*\*\s*(.+)$/);
                  if (numberedMatch) {
                    const [, number, heading, text] = numberedMatch;
                    return (
                      <div
                        key={lineIndex}
                        className="bg-white p-2 rounded"
                        style={{ border: "1px solid rgba(16,185,129,0.08)" }}
                      >
                        <h4 className="font-medium mb-1 text-sm" style={{ color: "#047857" }}>
                          {number}. {cleanMarkdown(heading)}
                        </h4>
                        <p className="text-sm ml-4" style={{ color: "#065f46" }}>
                          {cleanMarkdown(text)}
                        </p>
                      </div>
                    );
                  }

                  // Check if it's a numbered item without text (just heading)
                  const numberedHeadingMatch = line.match(/^(\d+)\.\s\*\*(.+?)\*\*$/);
                  if (numberedHeadingMatch) {
                    const [, number, heading] = numberedHeadingMatch;
                    return (
                      <div
                        key={lineIndex}
                        className="bg-white p-2 rounded"
                        style={{ border: "1px solid rgba(16,185,129,0.08)" }}
                      >
                        <h4 className="font-medium text-sm" style={{ color: "#047857" }}>
                          {number}. {cleanMarkdown(heading)}
                        </h4>
                      </div>
                    );
                  }

                  // Check if it's a bullet point
                  if (line.trim().startsWith("•")) {
                    return (
                      <div
                        key={lineIndex}
                        className="flex items-start bg-white p-2 rounded"
                        style={{ border: "1px solid rgba(16,185,129,0.08)" }}
                      >
                        <span className="mr-2 mt-0.5" style={{ color: "var(--color-primary)" }}>
                          •
                        </span>
                        <span className="text-sm" style={{ color: "#065f46" }}>
                          {cleanMarkdown(line.replace("•", "").trim())}
                        </span>
                      </div>
                    );
                  }

                  // Regular text
                  if (line.trim()) {
                    return (
                      <p key={lineIndex} className="text-green-700 text-sm">
                        {cleanMarkdown(line)}
                      </p>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        );
      }

      // Khuyến nghị section
      if (section.includes("KHUYẾN NGHỊ")) {
        const recommendations = section.replace(/KHUYẾN NGHỊ:?/i, "").trim();
        const lines = recommendations.split("\n").filter((line) => line.trim());

        return (
          <div key={index} className="mb-4">
            <div
              className="p-3 rounded-r"
              style={{ background: "#fff7ed", borderLeft: "3px solid rgba(245,158,11,0.12)" }}
            >
              <h3 className="text-base font-semibold mb-2 flex items-center" style={{ color: "#92400e" }}>
                <Lightbulb className="w-4 h-4 mr-2" />
                KHUYẾN NGHỊ
              </h3>
              <ul className="space-y-1">
                {lines.map((line, lineIndex) => {
                  if (line.trim().startsWith("•")) {
                    return (
                      <li
                        key={lineIndex}
                        className="flex items-start bg-white p-2 rounded"
                        style={{ border: "1px solid rgba(245,158,11,0.08)" }}
                      >
                        <span className="mr-2 mt-0.5" style={{ color: "var(--color-primary)" }}>
                          •
                        </span>
                        <span className="text-sm" style={{ color: "#92400e" }}>
                          {cleanMarkdown(line.replace("•", "").trim())}
                        </span>
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            </div>
          </div>
        );
      }

      // Hành động tiếp theo section
      if (section.includes("CÁC HÀNH ĐỘNG TIẾP THEO")) {
        const actions = section.replace(/CÁC HÀNH ĐỘNG TIẾP THEO:?/i, "").trim();

        return (
          <div key={index} className="mb-4">
            <div
              className="p-3 rounded-r"
              style={{ background: "#f5f3ff", borderLeft: "3px solid rgba(124,58,237,0.12)" }}
            >
              <h3 className="text-base font-semibold mb-1 flex items-center" style={{ color: "#4c1d95" }}>
                <Wrench className="w-4 h-4 mr-2" />
                CÁC HÀNH ĐỘNG TIẾP THEO
              </h3>
              <p className="text-sm" style={{ color: "#4c1d95" }}>
                {cleanMarkdown(actions)}
              </p>
            </div>
          </div>
        );
      }

      // Default case - regular text
      return (
        <div key={index} className="mb-2">
          <p className="text-gray-700 text-sm">{cleanMarkdown(section)}</p>
        </div>
      );
    });
  };

  // Check if this is an analysis result message
  const isAnalysisResult = content.includes("KẾT QUẢ PHÂN TÍCH ẢNH");

  if (isAnalysisResult) {
    return <div className="space-y-2">{formatAnalysisContent(content)}</div>;
  }

  // Regular message - just return with basic formatting
  return <div className="whitespace-pre-wrap text-gray-700 text-sm">{cleanMarkdown(content)}</div>;
}
