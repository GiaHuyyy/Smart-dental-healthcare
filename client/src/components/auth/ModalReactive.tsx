/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { sendRequest } from "@/utils/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import BaseStepModal from "./BaseStepModal";
import { AlertTriangle, CheckCircle, Loader2, Check } from "lucide-react";

interface ModalReactiveProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  userEmail?: string;
}

export default function ModalReactive({ isModalOpen, setIsModalOpen, userEmail = "" }: ModalReactiveProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSendVerification = async () => {
    setIsLoading(true);
    try {
      //   await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log("Verification email sent to:", userEmail);
      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/retry-code`,
        method: "POST",
        body: {
          email: userEmail,
        },
      });

      console.log("Response from server:", res);

      if (res.data) {
        setUserId(res.data._id);
        setCurrentStep(2);
        setCountdown(60);
      } else {
        toast.error(res.error || "Gửi mã xác thực thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Error sending verification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    try {
      //   await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/check-code`,
        method: "POST",
        body: {
          id: userId,
          code: verificationCode.trim(),
        },
      });

      console.log("Verification response:", res);
      if (res?.statusCode === 201) {
        toast.success("Xác thực thành công! Tài khoản đã được kích hoạt.");
        setCurrentStep(3);
      } else {
        toast.error(res?.message || "Mã xác thực không đúng hoặc đã hết hạn");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setVerificationCode("");
    setCountdown(0);
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Xác thực tài khoản</h3>
              <p className="text-gray-600 text-sm">Nhập email để nhận mã xác thực</p>
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 text-gray-600 cursor-not-allowed focus:outline-none"
                placeholder="Nhập email của bạn"
              />
            </div>

            <button
              onClick={handleSendVerification}
              disabled={isLoading || !userEmail || countdown > 0}
              className={"w-full btn-primary-filled"}
              style={isLoading || !userEmail || countdown > 0 ? { opacity: 0.6, pointerEvents: "none" } : undefined}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Đang gửi...
                </span>
              ) : countdown > 0 ? (
                `Gửi lại sau ${countdown}s`
              ) : (
                "Gửi mã xác thực"
              )}
            </button>
          </>
        );

      case 2:
        return (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" style={{ color: "var(--color-primary-600)" }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nhập mã xác thực</h3>
              <p className="text-gray-600 text-sm">
                Mã xác thực đã được gửi đến email: <span className="font-medium">{userEmail}</span>
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Mã xác thực
              </label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập mã xác thực"
              />
              <p className="text-xs text-gray-500 mt-1">Nhập mã 6 chữ số</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBackStep}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Quay lại
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={isLoading}
                className={"flex-1 btn-primary-filled"}
                style={isLoading ? { opacity: 0.6, pointerEvents: "none" } : undefined}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Đang xác thực...
                  </span>
                ) : (
                  "Xác thực"
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={handleSendVerification}
                disabled={countdown > 0}
                className={"text-sm font-medium"}
                style={
                  countdown > 0
                    ? { color: "var(--color-muted)", pointerEvents: "none" }
                    : { color: "var(--color-primary)" }
                }
              >
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã xác thực"}
              </button>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Xác thực thành công!</h3>
              <p className="text-gray-600 text-sm">
                Tài khoản của bạn đã được xác thực thành công. Bạn có thể đăng nhập ngay bây giờ.
              </p>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Hoàn tất
            </button>

            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 text-center">
                <span className="font-medium">Chúc mừng!</span> Bạn có thể đăng nhập và sử dụng tất cả các tính năng.
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <BaseStepModal
      isModalOpen={isModalOpen}
      onClose={handleCloseModal}
      currentStep={currentStep}
      totalSteps={3}
      stepIndicatorColor="blue"
    >
      {renderStepContent()}
    </BaseStepModal>
  );
}
