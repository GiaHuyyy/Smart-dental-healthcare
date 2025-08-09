"use client";

import { ReactNode } from "react";

interface BaseStepModalProps {
  isModalOpen: boolean;
  onClose: () => void;
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  stepIndicatorColor?: string;
}

export default function BaseStepModal({
  isModalOpen,
  onClose,
  currentStep,
  totalSteps,
  children,
  stepIndicatorColor = "blue",
}: BaseStepModalProps) {
  if (!isModalOpen) return null;

  const getStepColors = () => {
    switch (stepIndicatorColor) {
      case "orange":
        return {
          active: "bg-orange-600 text-white",
          inactive: "bg-gray-200 text-gray-500",
          line: "bg-orange-600",
        };
      case "blue":
      default:
        return {
          active: "bg-blue-600 text-white",
          inactive: "bg-gray-200 text-gray-500",
          line: "bg-blue-600",
        };
    }
  };

  const colors = getStepColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black opacity-55 transition-opacity"></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-6">
          {Array.from({ length: totalSteps }, (_, index) => {
            const step = index + 1;
            return (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? colors.active : colors.inactive
                  }`}
                >
                  {step < currentStep ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {step < totalSteps && (
                  <div className={`w-8 h-0.5 mx-2 ${step < currentStep ? colors.line : "bg-gray-200"}`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {children}
      </div>
    </div>
  );
}
