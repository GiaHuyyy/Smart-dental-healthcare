// @/components/policy-modal.tsx
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PolicyContent } from "./PolicyContent";

interface PolicyModalProps {
  trigger?: React.ReactNode;
  buttonText?: string;
}

export function PolicyModal({ trigger, buttonText = "Xem Chính sách Đặt lịch & Hủy hẹn" }: PolicyModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          // Bạn có thể dùng `variant="link"` như cũ, hoặc `variant="outline"` tùy thiết kế
          <Button variant="link" className="text-sm text-blue-600 hover:underline h-auto p-0">
            {buttonText}
          </Button>
        )}
      </DialogTrigger>
      {/* - Thêm padding (p-6) cho nội dung bên trong
        - Dùng `DialogDescription` cho mục đích hỗ trợ tiếp cận (accessibility)
      */}
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center font-bold text-black">
            Chính sách Đặt lịch & Quản lý Hẹn
          </DialogTitle>
        </DialogHeader>
        {/* Cho phép cuộn nội dung bên trong nếu vượt quá chiều cao */}
        <div className="overflow-y-auto max-h-[calc(90vh-10rem)] p-6 pr-4">
          <PolicyContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}