"use client";

import React, { useEffect, useState } from "react";
import { ChatIntegration } from "@/components/chat/ChatIntegration";
import { sendRequest } from "@/utils/api";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "patient" | "doctor";
  specialization?: string;
}

// Component này có thể được thêm vào bất kỳ trang nào cần chat
export const PageWithChat: React.FC = () => {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load doctors and patients list for chat
  useEffect(() => {
    const loadUsersForChat = async () => {
      try {
        setIsLoading(true);

        // Load doctors list (for patients to chat with)
        const doctorsResponse = await sendRequest({
          url: "/users",
          method: "GET",
          params: { role: "doctor" },
        });

        if (doctorsResponse?.data) {
          setDoctors(doctorsResponse.data);
        }

        // Load patients list (for doctors to chat with)
        const patientsResponse = await sendRequest({
          url: "/users",
          method: "GET",
          params: { role: "patient" },
        });

        if (patientsResponse?.data) {
          setPatients(patientsResponse.data);
        }
      } catch (error) {
        console.error("Failed to load users for chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsersForChat();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your page content here */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Trang với tính năng Chat Realtime</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Nội dung trang</h2>
          <p className="text-gray-600 mb-4">
            Đây là nội dung chính của trang. Nút chat sẽ xuất hiện ở góc dưới bên phải để bạn có thể nhắn tin với bác sĩ
            hoặc bệnh nhân.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Hướng dẫn sử dụng Chat:</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Nhấp vào nút chat màu xanh để xem danh sách cuộc trò chuyện</li>
                <li>• Nhấp vào nút chat màu xanh lá để bắt đầu cuộc trò chuyện mới</li>
                <li>• Tin nhắn sẽ được gửi và nhận trong thời gian thực</li>
                <li>• Bạn có thể thu nhỏ hoặc đóng cửa sổ chat bất cứ lúc nào</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Tính năng có sẵn:</h3>
              <ul className="text-green-800 text-sm space-y-1">
                <li>• Nhắn tin văn bản realtime</li>
                <li>• Hiển thị trạng thái đang nhập</li>
                <li>• Đánh dấu tin nhắn đã đọc</li>
                <li>• Danh sách cuộc trò chuyện với số tin nhắn chưa đọc</li>
                <li>• Thu nhỏ/phóng to cửa sổ chat</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">Lưu ý:</h3>
              <ul className="text-yellow-800 text-sm space-y-1">
                <li>• Cần đăng nhập để sử dụng tính năng chat</li>
                <li>• Kết nối internet ổn định để chat hoạt động tốt nhất</li>
                <li>• Tin nhắn sẽ được lưu trữ và đồng bộ trên các thiết bị</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Integration - Always render at the bottom */}
      {!isLoading && <ChatIntegration doctorsList={doctors} patientsList={patients} />}
    </div>
  );
};

export default PageWithChat;
