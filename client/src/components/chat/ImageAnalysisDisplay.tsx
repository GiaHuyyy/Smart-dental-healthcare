"use client";

import { useAppSelector } from "@/store/hooks";

export default function ImageAnalysisDisplay() {
  const { analysisResult, uploadedImage } = useAppSelector(state => state.imageAnalysis);

  if (!analysisResult) {
    return null;
  }

  return (
    <div className="p-4 bg-blue-50 border-t border-blue-200">
      <div className="flex items-start">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-xs">🔍</span>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">Kết quả phân tích hình ảnh</h4>
          
          {uploadedImage && (
            <div className="mt-2 mb-3">
              <img 
                src={uploadedImage} 
                alt="Uploaded image" 
                className="max-w-full h-auto rounded-lg border object-cover"
                style={{ maxHeight: "150px" }}
              />
            </div>
          )}

          {analysisResult.richContent && (
            <div className="space-y-2">
              {analysisResult.richContent.analysis && (
                <div>
                  <p className="text-sm font-medium text-blue-800">Chẩn đoán:</p>
                  <p className="text-sm text-blue-700">{analysisResult.richContent.analysis}</p>
                </div>
              )}

              {analysisResult.richContent.recommendations && analysisResult.richContent.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-800">Khuyến nghị:</p>
                  <ul className="text-sm text-blue-700 list-disc list-inside">
                    {analysisResult.richContent.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
