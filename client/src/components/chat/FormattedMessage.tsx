"use client";

interface FormattedMessageProps {
  content: string;
  role: 'user' | 'assistant';
}

export default function FormattedMessage({ content, role }: FormattedMessageProps) {
  // Helper function to clean markdown formatting
  const cleanMarkdown = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1');
  };

  // Function to format the analysis result with clean, simple styling
  const formatAnalysisContent = (text: string) => {
    // Split content into sections
    const sections = text.split(/(?=📋|📊|💡|🔧)/);
    
    return sections.map((section, index) => {
      if (section.trim() === '') return null;
      
      // Header section
      if (section.includes('KẾT QUẢ PHÂN TÍCH ẢNH')) {
        return (
          <div key={index} className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
              KẾT QUẢ PHÂN TÍCH ẢNH
            </h2>
            <div className="w-16 h-0.5 bg-gray-300 mx-auto"></div>
          </div>
        );
      }
      
      // Chẩn đoán section
      if (section.includes('📋 **CHẨN ĐOÁN:**')) {
        const diagnosis = section.replace('📋 **CHẨN ĐOÁN:**', '').trim();
        return (
          <div key={index} className="mb-4">
            <div className="bg-blue-50 border-l-3 border-blue-400 p-3 rounded-r">
              <h3 className="text-base font-semibold text-blue-800 mb-1 flex items-center">
                <span className="mr-2">📋</span>
                CHẨN ĐOÁN
              </h3>
              <p className="text-blue-900 text-sm">{cleanMarkdown(diagnosis)}</p>
            </div>
          </div>
        );
      }
      
      // Chi tiết phân tích section
      if (section.includes('📊 **CHI TIẾT PHÂN TÍCH:**')) {
        const details = section.replace('📊 **CHI TIẾT PHÂN TÍCH:**', '').trim();
        const lines = details.split('\n').filter(line => line.trim());
        
        return (
          <div key={index} className="mb-4">
            <div className="bg-green-50 border-l-3 border-green-400 p-3 rounded-r">
              <h3 className="text-base font-semibold text-green-800 mb-2 flex items-center">
                <span className="mr-2">📊</span>
                CHI TIẾT PHÂN TÍCH
              </h3>
              <div className="space-y-2">
                {lines.map((line, lineIndex) => {
                  // Check if it's a numbered item with markdown formatting and colon
                  const numberedWithColonMatch = line.match(/^(\d+)\.\s\*\*(.+?)\*\*\s*:\s*(.+)$/);
                  if (numberedWithColonMatch) {
                    const [, number, heading, text] = numberedWithColonMatch;
                    return (
                      <div key={lineIndex} className="bg-white p-2 rounded border border-green-200">
                        <h4 className="font-medium text-green-800 mb-1 text-sm">
                          {number}. {cleanMarkdown(heading)}:
                        </h4>
                        <p className="text-green-700 text-sm ml-4">{cleanMarkdown(text)}</p>
                      </div>
                    );
                  }
                  
                  // Check if it's a numbered item with markdown formatting (no colon)
                  const numberedMatch = line.match(/^(\d+)\.\s\*\*(.+?)\*\*\s*(.+)$/);
                  if (numberedMatch) {
                    const [, number, heading, text] = numberedMatch;
                    return (
                      <div key={lineIndex} className="bg-white p-2 rounded border border-green-200">
                        <h4 className="font-medium text-green-800 mb-1 text-sm">
                          {number}. {cleanMarkdown(heading)}
                        </h4>
                        <p className="text-green-700 text-sm ml-4">{cleanMarkdown(text)}</p>
                      </div>
                    );
                  }
                  
                  // Check if it's a numbered item without text (just heading)
                  const numberedHeadingMatch = line.match(/^(\d+)\.\s\*\*(.+?)\*\*$/);
                  if (numberedHeadingMatch) {
                    const [, number, heading] = numberedHeadingMatch;
                    return (
                      <div key={lineIndex} className="bg-white p-2 rounded border border-green-200">
                        <h4 className="font-medium text-green-800 text-sm">
                          {number}. {cleanMarkdown(heading)}
                        </h4>
                      </div>
                    );
                  }
                  
                  // Check if it's a bullet point
                  if (line.trim().startsWith('•')) {
                    return (
                      <div key={lineIndex} className="flex items-start bg-white p-2 rounded border border-green-200">
                        <span className="text-green-500 mr-2 mt-0.5">•</span>
                        <span className="text-green-700 text-sm">{cleanMarkdown(line.replace('•', '').trim())}</span>
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
      if (section.includes('💡 **KHUYẾN NGHỊ:**')) {
        const recommendations = section.replace('💡 **KHUYẾN NGHỊ:**', '').trim();
        const lines = recommendations.split('\n').filter(line => line.trim());
        
        return (
          <div key={index} className="mb-4">
            <div className="bg-amber-50 border-l-3 border-amber-400 p-3 rounded-r">
              <h3 className="text-base font-semibold text-amber-800 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                KHUYẾN NGHỊ
              </h3>
              <ul className="space-y-1">
                {lines.map((line, lineIndex) => {
                  if (line.trim().startsWith('•')) {
                    return (
                      <li key={lineIndex} className="flex items-start bg-white p-2 rounded border border-amber-200">
                        <span className="text-amber-500 mr-2 mt-0.5">•</span>
                        <span className="text-amber-800 text-sm">
                          {cleanMarkdown(line.replace('•', '').trim())}
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
      if (section.includes('🔧 **CÁC HÀNH ĐỘNG TIẾP THEO:**')) {
        const actions = section.replace('🔧 **CÁC HÀNH ĐỘNG TIẾP THEO:**', '').trim();
        
        return (
          <div key={index} className="mb-4">
            <div className="bg-purple-50 border-l-3 border-purple-400 p-3 rounded-r">
              <h3 className="text-base font-semibold text-purple-800 mb-1 flex items-center">
                <span className="mr-2">🔧</span>
                CÁC HÀNH ĐỘNG TIẾP THEO
              </h3>
              <p className="text-purple-800 text-sm">{cleanMarkdown(actions)}</p>
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
  const isAnalysisResult = content.includes('KẾT QUẢ PHÂN TÍCH ẢNH');
  
  if (isAnalysisResult) {
    return (
      <div className="space-y-2">
        {formatAnalysisContent(content)}
      </div>
    );
  }

  // Regular message - just return with basic formatting
  return (
    <div className="whitespace-pre-wrap text-gray-700 text-sm">
      {cleanMarkdown(content)}
    </div>
  );
}
