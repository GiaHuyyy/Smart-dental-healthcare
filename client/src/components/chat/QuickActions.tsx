"use client";

interface QuickActionsProps {
  actions: string[];
  onActionClick: (action: string) => void;
  title?: string;
  className?: string;
}

export default function QuickActions({
  actions,
  onActionClick,
  title = "Hành động nhanh",
  className = "",
}: QuickActionsProps) {
  if (!actions || actions.length === 0) return null;

  const getActionIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes("đau")) return "😖";
    if (lowerAction.includes("răng khôn")) return "🦷";
    if (lowerAction.includes("tẩy trắng")) return "✨";
    if (lowerAction.includes("niềng")) return "🦿";
    if (lowerAction.includes("chảy máu")) return "🩸";
    if (lowerAction.includes("chăm sóc")) return "🏠";
    if (lowerAction.includes("phân tích")) return "📸";
    if (lowerAction.includes("tư vấn")) return "💬";
    if (lowerAction.includes("đặt lịch")) return "📅";
    if (lowerAction.includes("gọi")) return "📞";
    if (lowerAction.includes("cấp cứu")) return "🚑";
    if (lowerAction.includes("tìm")) return "📍";
    if (lowerAction.includes("báo cáo")) return "📋";
    if (lowerAction.includes("xem lịch")) return "📅";
    if (lowerAction.includes("thanh toán")) return "💳";
    if (lowerAction.includes("câu hỏi")) return "❓";
    return "🔧";
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onActionClick(action)}
            className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:from-blue-100 hover:to-blue-200 transition-all duration-200 flex items-center space-x-2 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <span className="text-lg">{getActionIcon(action)}</span>
            <span>{action}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
