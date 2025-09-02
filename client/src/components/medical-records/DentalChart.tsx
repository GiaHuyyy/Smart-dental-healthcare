'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DentalChartProps {
  records: Array<{
    dentalChart: Array<{
      toothNumber: number;
      condition: string;
      treatment: string;
      notes: string;
    }>;
  }>;
}

export default function DentalChart({ records }: DentalChartProps) {
  // Tạo sơ đồ răng từ tất cả hồ sơ
  const allTeeth = new Map<number, any>();
  
  records.forEach(record => {
    record.dentalChart.forEach(tooth => {
      if (!allTeeth.has(tooth.toothNumber)) {
        allTeeth.set(tooth.toothNumber, {
          condition: tooth.condition,
          treatment: tooth.treatment,
          notes: tooth.notes,
          lastUpdated: new Date()
        });
      }
    });
  });

  // Tạo mảng 32 răng (1-32)
  const teethArray = Array.from({ length: 32 }, (_, i) => {
    const toothNumber = i + 1;
    const toothData = allTeeth.get(toothNumber);
    
    return {
      number: toothNumber,
      condition: toothData?.condition || 'normal',
      treatment: toothData?.treatment || '',
      notes: toothData?.notes || '',
      hasData: !!toothData
    };
  });

  const getToothColor = (condition: string, hasTreatment: boolean) => {
    if (hasTreatment) {
      return 'border-blue-500 bg-blue-50 text-blue-700 shadow-md';
    }
    
    switch (condition) {
      case 'cavity':
        return 'border-red-500 bg-red-50 text-red-700 shadow-md';
      case 'missing':
        return 'border-gray-500 bg-gray-100 text-gray-600';
      case 'crown':
        return 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-md';
      case 'filling':
        return 'border-green-500 bg-green-50 text-green-700 shadow-md';
      case 'root_canal':
        return 'border-purple-500 bg-purple-50 text-purple-700 shadow-md';
      default:
        return 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 transition-colors';
    }
  };

  const getConditionLabel = (condition: string) => {
    const labels = {
      normal: 'Bình thường',
      cavity: 'Sâu răng',
      missing: 'Mất răng',
      crown: 'Chụp răng',
      filling: 'Trám răng',
      root_canal: 'Chữa tủy'
    };
    return labels[condition as keyof typeof labels] || condition;
  };

  // Tạo layout vòng cung cho hàm răng
  const createArcLayout = (teeth: any[], isUpper: boolean) => {
    const radius = 120;
    const centerX = 200;
    const centerY = isUpper ? 80 : 120;
    const startAngle = isUpper ? Math.PI : 0;
    const endAngle = isUpper ? 0 : Math.PI;
    const angleStep = (endAngle - startAngle) / (teeth.length - 1);

    return teeth.map((tooth, index) => {
      const angle = startAngle + (index * angleStep);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      return {
        ...tooth,
        x: x - 12, // Offset để center răng
        y: y - 12,
        angle: angle
      };
    });
  };

  const upperTeeth = createArcLayout(teethArray.slice(0, 16), true);
  const lowerTeeth = createArcLayout(teethArray.slice(16, 32), false);

  return (
    <div className="space-y-6">
      {/* Dental Chart Visualization */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-center text-xl font-bold text-gray-800">
            🦷 Sơ đồ răng
          </CardTitle>
          <p className="text-center text-sm text-gray-600">
            Hiển thị tình trạng răng từ tất cả hồ sơ điều trị
          </p>
        </CardHeader>
        <CardContent className="p-8">
          {/* Upper Teeth Arc */}
          <div className="mb-12 relative">
            <h4 className="text-center text-sm font-semibold text-gray-700 mb-6">
              Hàm trên (Răng 1-16)
            </h4>
            <div className="relative w-full h-48 flex justify-center items-center">
              {/* Arc line for visual reference */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <path
                  d="M 80 80 Q 200 20 320 80"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                />
              </svg>
              
              {/* Teeth positioned in arc */}
              {upperTeeth.map((tooth) => (
                <div
                  key={tooth.number}
                  className={`
                    absolute w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                    ${getToothColor(tooth.condition, !!tooth.treatment)}
                    ${tooth.hasData ? 'ring-2 ring-offset-1 ring-blue-200 animate-pulse' : ''}
                    cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg
                  `}
                  style={{
                    left: `${tooth.x}px`,
                    top: `${tooth.y}px`,
                    transform: `rotate(${tooth.angle * 180 / Math.PI}deg)`
                  }}
                  title={`Răng ${tooth.number}: ${getConditionLabel(tooth.condition)}${tooth.treatment ? ` - ${tooth.treatment}` : ''}`}
                >
                  {tooth.number}
                </div>
              ))}
            </div>
          </div>

          {/* Lower Teeth Arc */}
          <div className="relative">
            <h4 className="text-center text-sm font-semibold text-gray-700 mb-6">
              Hàm dưới (Răng 17-32)
            </h4>
            <div className="relative w-full h-48 flex justify-center items-center">
              {/* Arc line for visual reference */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <path
                  d="M 80 120 Q 200 180 320 120"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                />
              </svg>
              
              {/* Teeth positioned in arc */}
              {lowerTeeth.map((tooth) => (
                <div
                  key={tooth.number}
                  className={`
                    absolute w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                    ${getToothColor(tooth.condition, !!tooth.treatment)}
                    ${tooth.hasData ? 'ring-2 ring-offset-1 ring-blue-200 animate-pulse' : ''}
                    cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg
                  `}
                  style={{
                    left: `${tooth.x}px`,
                    top: `${tooth.y}px`,
                    transform: `rotate(${tooth.angle * 180 / Math.PI}deg)`
                  }}
                  title={`Răng ${tooth.number}: ${getConditionLabel(tooth.condition)}${tooth.treatment ? ` - ${tooth.treatment}` : ''}`}
                >
                  {tooth.number}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">Chú thích</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-gray-300 bg-white rounded-full"></div>
                <span className="font-medium">Bình thường</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-red-500 bg-red-50 rounded-full"></div>
                <span className="font-medium">Sâu răng</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-green-500 bg-green-50 rounded-full"></div>
                <span className="font-medium">Trám răng</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-yellow-500 bg-yellow-50 rounded-full"></div>
                <span className="font-medium">Chụp răng</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-purple-500 bg-purple-50 rounded-full"></div>
                <span className="font-medium">Chữa tủy</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <div className="w-4 h-4 border-2 border-gray-500 bg-gray-100 rounded-full"></div>
                <span className="font-medium">Mất răng</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-500 bg-blue-50 rounded-full ring-2 ring-offset-1 ring-blue-200"></div>
                <span className="font-medium">Đã điều trị</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{allTeeth.size}</div>
            <div className="text-sm opacity-90">Răng có dữ liệu</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {Array.from(allTeeth.values()).filter(t => t.treatment).length}
            </div>
            <div className="text-sm opacity-90">Răng đã điều trị</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {Array.from(allTeeth.values()).filter(t => t.condition === 'cavity').length}
            </div>
            <div className="text-sm opacity-90">Răng sâu</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{32 - allTeeth.size}</div>
            <div className="text-sm opacity-90">Răng bình thường</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tooth Information */}
      {allTeeth.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Chi tiết tình trạng răng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(allTeeth.entries())
                .sort(([a], [b]) => a - b)
                .map(([toothNumber, toothData]) => (
                  <div key={toothNumber} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-lg">🦷 Răng {toothNumber}</span>
                      <Badge variant="outline" className="text-xs">
                        {getConditionLabel(toothData.condition)}
                      </Badge>
                    </div>
                    {toothData.treatment && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">💊 Điều trị:</span> {toothData.treatment}
                      </p>
                    )}
                    {toothData.notes && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        📝 {toothData.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

