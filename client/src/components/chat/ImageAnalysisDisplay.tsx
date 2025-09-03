"use client";

import Image from 'next/image';

interface ImageAnalysisDisplayProps {
  analysisResult: any;
  uploadedImage: string | null;
  onActionClick: (action: string) => void;
}

export default function ImageAnalysisDisplay({
  analysisResult,
  uploadedImage,
  onActionClick,
}: ImageAnalysisDisplayProps) {
  if (!analysisResult) return null;

  const isCloudinaryError = analysisResult.error?.includes('Cloudinary') || 
                           analysisResult.error?.includes('cấu hình') ||
                           analysisResult.error?.includes('lưu trữ');

  if (isCloudinaryError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Lỗi cấu hình dịch vụ lưu trữ ảnh
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p className="mb-2">
                {analysisResult.error || 'Dịch vụ lưu trữ ảnh chưa được cấu hình đúng cách.'}
              </p>
              <div className="bg-white p-3 rounded border border-red-200">
                <p className="font-medium text-red-800 mb-2">Cách khắc phục:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Tạo tài khoản Cloudinary tại <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">cloudinary.com</a></li>
                  <li>Lấy thông tin cấu hình từ Dashboard</li>
                  <li>Cập nhật file .env trong thư mục server</li>
                  <li>Restart server</li>
                </ol>
                <p className="text-xs text-red-600 mt-2">
                  💡 Xem file <code className="bg-red-100 px-1 rounded">CLOUDINARY_SETUP.md</code> để biết chi tiết
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Function to render rich content sections
  const renderRichContent = () => {
    if (!analysisResult.richContent) return null;

    const { analysis, sections, recommendations } = analysisResult.richContent;

    return (
      <div className="space-y-6">
        {/* Chẩn đoán */}
        {analysis && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <h4 className="text-lg font-bold text-blue-800 mb-2 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              CHẨN ĐOÁN
            </h4>
            <p className="text-blue-900 font-medium leading-relaxed">{analysis}</p>
          </div>
        )}

        {/* Chi tiết phân tích */}
        {sections && sections.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
            <h4 className="text-lg font-bold text-emerald-800 mb-3 flex items-center">
              <span className="text-2xl mr-2">📊</span>
              CHI TIẾT PHÂN TÍCH
            </h4>
            <div className="space-y-3">
              {sections.map((section: any, index: number) => (
                <div key={index} className="bg-white/60 p-3 rounded-lg border border-emerald-200">
                  {section.heading && (
                    <h5 className="font-semibold text-emerald-900 mb-2">
                      {index + 1}. {section.heading}
                    </h5>
                  )}
                  {section.text && (
                    <p className="text-emerald-800 text-sm leading-relaxed mb-2">
                      {section.text}
                    </p>
                  )}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-1">
                      {section.bullets.map((bullet: string, bulletIndex: number) => (
                        <li key={bulletIndex} className="flex items-start text-sm text-emerald-700">
                          <span className="text-emerald-500 mr-2 mt-1">•</span>
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
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h4 className="text-lg font-bold text-amber-800 mb-3 flex items-center">
              <span className="text-2xl mr-2">💡</span>
              KHUYẾN NGHỊ
            </h4>
            <ul className="space-y-2">
              {recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start bg-white/60 p-3 rounded-lg border border-amber-200">
                  <span className="text-amber-500 mr-3 mt-1 text-lg">•</span>
                  <span className="text-amber-900 font-medium leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hành động tiếp theo */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
          <h4 className="text-lg font-bold text-purple-800 mb-3 flex items-center">
            <span className="text-2xl mr-2">🔧</span>
            CÁC HÀNH ĐỘNG TIẾP THEO
          </h4>
          <p className="text-purple-900 mb-3">Sử dụng các nút bên dưới để tương tác</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 mb-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full mr-4">
            <span className="text-white text-2xl">🔍</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              KẾT QUẢ PHÂN TÍCH ẢNH
            </h3>
            <p className="text-gray-600 text-sm">AI Analysis Result</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
          AI Powered
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hình ảnh */}
        {uploadedImage && (
          <div className="relative h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-lg">
            <Image
              src={uploadedImage}
              alt="Uploaded X-ray"
              fill
              className="object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
          </div>
        )}

        {/* Kết quả phân tích */}
        <div className="space-y-4">
          {renderRichContent()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => onActionClick("Giải thích thêm")}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center"
          >
            <span className="text-xl mr-2">💡</span>
            Giải thích thêm
          </button>
          <button
            onClick={() => onActionClick("Hướng dẫn chăm sóc")}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center"
          >
            <span className="text-xl mr-2">🏠</span>
            Hướng dẫn chăm sóc
          </button>
          <button
            onClick={() => onActionClick("Gợi ý bác sĩ")}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center"
          >
            <span className="text-xl mr-2">👨‍⚕️</span>
            Gợi ý bác sĩ
          </button>
          <button
            onClick={() => onActionClick("Đặt lịch khám")}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center"
          >
            <span className="text-xl mr-2">📅</span>
            Đặt lịch khám
          </button>
        </div>
      </div>
    </div>
  );
}
