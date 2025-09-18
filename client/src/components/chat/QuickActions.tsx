"use client";

import {
  Frown,
  Smile,
  Sparkles,
  Wrench,
  Droplet,
  Pill,
  Camera,
  MessageSquare,
  Calendar,
  Phone,
  Truck,
  MapPin,
  Clipboard,
  CreditCard,
  HelpCircle,
} from "lucide-react";

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
    if (lowerAction.includes("sâu răng") || lowerAction.includes("ê buốt")) return <Frown className="w-5 h-5" />;
    if (lowerAction.includes("mọc lệch") || lowerAction.includes("chen chúc") || lowerAction.includes("khớp cắn"))
      return <Smile className="w-5 h-5" />;
    if (lowerAction.includes("ố vàng") || lowerAction.includes("xỉn màu") || lowerAction.includes("không đều"))
      return <Sparkles className="w-5 h-5" />;
    if (lowerAction.includes("hàm hô") || lowerAction.includes("hàm móm") || lowerAction.includes("chấn thương"))
      return <Wrench className="w-5 h-5" />;
    if (lowerAction.includes("chảy máu lợi") || lowerAction.includes("chải răng"))
      return <Droplet className="w-5 h-5" />;
    if (lowerAction.includes("răng sữa") || lowerAction.includes("trẻ") || lowerAction.includes("sợ đi khám"))
      return <Pill className="w-5 h-5" />;
    if (lowerAction.includes("phân tích") || lowerAction.includes("x-quang")) return <Camera className="w-5 h-5" />;
    if (lowerAction.includes("tư vấn")) return <MessageSquare className="w-5 h-5" />;
    if (lowerAction.includes("đặt lịch") || lowerAction.includes("xem lịch")) return <Calendar className="w-5 h-5" />;
    if (lowerAction.includes("gọi")) return <Phone className="w-5 h-5" />;
    if (lowerAction.includes("cấp cứu")) return <Truck className="w-5 h-5" />;
    if (lowerAction.includes("tìm")) return <MapPin className="w-5 h-5" />;
    if (lowerAction.includes("báo cáo")) return <Clipboard className="w-5 h-5" />;
    if (lowerAction.includes("thanh toán")) return <CreditCard className="w-5 h-5" />;
    if (lowerAction.includes("câu hỏi")) return <HelpCircle className="w-5 h-5" />;
    return <Wrench className="w-5 h-5" />;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onActionClick(action)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 shadow-sm transform hover:scale-105"
            style={{
              background: "linear-gradient(90deg,var(--color-primary-outline), var(--color-primary-surface))",
              color: "var(--color-primary-600)",
              border: "1px solid rgba(var(--color-primary-rgb),0.08)",
            }}
          >
            <span className="text-lg">{getActionIcon(action)}</span>
            <span>{action}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
