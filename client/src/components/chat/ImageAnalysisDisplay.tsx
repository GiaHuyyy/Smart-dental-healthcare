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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Kết quả phân tích ảnh</h3>
        <span className="text-sm text-gray-500">AI Analysis</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hình ảnh */}
        {uploadedImage && (
          <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={uploadedImage}
              alt="Uploaded X-ray"
              fill
              className="object-contain"
            />
          </div>
        )}

        {/* Kết quả phân tích */}
        <div className="space-y-3">
          {analysisResult.richContent?.analysis && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Chẩn đoán</h4>
              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                {analysisResult.richContent.analysis}
              </p>
            </div>
          )}

          {analysisResult.richContent?.recommendations && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Khuyến nghị</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {analysisResult.richContent.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Các action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onActionClick("Giải thích thêm")}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          💡 Giải thích thêm
        </button>
        <button
          onClick={() => onActionClick("Hướng dẫn chăm sóc")}
          className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          🏠 Hướng dẫn chăm sóc
        </button>
        <button
          onClick={() => onActionClick("Gợi ý bác sĩ")}
          className="px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          👨‍⚕️ Gợi ý bác sĩ
        </button>
        <button
          onClick={() => onActionClick("Đặt lịch khám")}
          className="px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          📅 Đặt lịch khám
        </button>
      </div>
    </div>
  );
}
