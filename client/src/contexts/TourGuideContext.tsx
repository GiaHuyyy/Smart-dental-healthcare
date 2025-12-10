"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { driver, Driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

// Tour steps configuration
const TOUR_STEPS = {
  dashboard: [
    {
      element: "#chat-ai-button",
      popover: {
        title: "💬 Chat với AI",
        description:
          "Nhấn vào đây để trò chuyện với AI tư vấn nha khoa 24/7. AI sẽ giúp bạn phân tích triệu chứng, đưa ra lời khuyên và gợi ý bác sĩ phù hợp.",
        side: "bottom" as const,
        align: "center" as const,
      },
    },
  ],
  chat: [
    {
      element: "#image-analysis-button",
      popover: {
        title: "🔍 Phân tích ảnh X-quang/Răng",
        description:
          "Tải lên ảnh X-quang hoặc ảnh răng của bạn để AI phân tích tình trạng sức khỏe răng miệng. Kết quả phân tích sẽ giúp bạn hiểu rõ hơn về tình trạng hiện tại.",
        side: "top" as const,
        align: "center" as const,
      },
    },
  ],
};

// LocalStorage keys
const STORAGE_KEYS = {
  DASHBOARD_TOUR_COMPLETED: "smart-dental-dashboard-tour-completed",
  CHAT_TOUR_COMPLETED: "smart-dental-chat-tour-completed",
};

interface TourGuideContextType {
  // Start tour for specific page
  startDashboardTour: () => void;
  startChatTour: () => void;

  // Restart all tours
  restartAllTours: () => void;

  // Destroy current tour (for navigation) and optionally mark as completed
  destroyCurrentTour: (markCompleted?: "dashboard" | "chat") => void;

  // Check if tour is completed
  isDashboardTourCompleted: boolean;
  isChatTourCompleted: boolean;

  // Mark tour as completed
  markDashboardTourCompleted: () => void;
  markChatTourCompleted: () => void;

  // Check if tour is active
  isTourActive: boolean;
}

const TourGuideContext = createContext<TourGuideContextType | undefined>(undefined);

export const useTourGuide = () => {
  const context = useContext(TourGuideContext);
  if (!context) {
    throw new Error("useTourGuide must be used within TourGuideProvider");
  }
  return context;
};

interface TourGuideProviderProps {
  children: React.ReactNode;
}

export const TourGuideProvider: React.FC<TourGuideProviderProps> = ({ children }) => {
  const [isDashboardTourCompleted, setIsDashboardTourCompleted] = useState(true);
  const [isChatTourCompleted, setIsChatTourCompleted] = useState(true);
  const [isTourActive, setIsTourActive] = useState(false);
  const driverInstanceRef = useRef<Driver | null>(null);
  const tourStartedRef = useRef<{ dashboard: boolean; chat: boolean }>({ dashboard: false, chat: false });
  const isTourActiveRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isTourActiveRef.current = isTourActive;
  }, [isTourActive]);

  // Load tour completion status from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dashboardCompleted = localStorage.getItem(STORAGE_KEYS.DASHBOARD_TOUR_COMPLETED) === "true";
      const chatCompleted = localStorage.getItem(STORAGE_KEYS.CHAT_TOUR_COMPLETED) === "true";
      setIsDashboardTourCompleted(dashboardCompleted);
      setIsChatTourCompleted(chatCompleted);
    }
  }, []);

  const createDriver = useCallback((steps: DriveStep[], onComplete?: () => void) => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: steps,
      nextBtnText: "Tiếp theo",
      prevBtnText: "Quay lại",
      doneBtnText: "Hoàn thành",
      progressText: "{{current}} / {{total}}",
      popoverClass: "smart-dental-tour-popover",
      // Overlay and highlight settings
      overlayColor: "rgba(0, 0, 0, 0.7)",
      stagePadding: 8,
      stageRadius: 8,
      allowClose: true,
      overlayOpacity: 0.7,
      smoothScroll: true,
      onDestroyStarted: () => {
        setIsTourActive(false);
        isTourActiveRef.current = false;
        if (onComplete) {
          onComplete();
        }
        driverObj.destroy();
      },
      onDestroyed: () => {
        setIsTourActive(false);
        isTourActiveRef.current = false;
      },
    });

    return driverObj;
  }, []);

  const startDashboardTour = useCallback(() => {
    // Prevent multiple tour starts using refs (no re-render dependency)
    if (tourStartedRef.current.dashboard || isTourActiveRef.current) {
      return;
    }
    tourStartedRef.current.dashboard = true;

    // Clean up previous driver if exists
    if (driverInstanceRef.current) {
      driverInstanceRef.current.destroy();
    }

    // Wait for element to be available
    setTimeout(() => {
      const chatButton = document.getElementById("chat-ai-button");
      if (!chatButton) {
        console.log("Chat AI button not found, skipping dashboard tour");
        tourStartedRef.current.dashboard = false;
        return;
      }

      const newDriver = createDriver(TOUR_STEPS.dashboard, () => {
        setIsDashboardTourCompleted(true);
        localStorage.setItem(STORAGE_KEYS.DASHBOARD_TOUR_COMPLETED, "true");
        tourStartedRef.current.dashboard = false;
      });

      driverInstanceRef.current = newDriver;
      setIsTourActive(true);
      isTourActiveRef.current = true;
      newDriver.drive();
    }, 500);
  }, [createDriver]);

  const startChatTour = useCallback(() => {
    // Prevent multiple tour starts using refs (no re-render dependency)
    if (tourStartedRef.current.chat || isTourActiveRef.current) {
      return;
    }
    tourStartedRef.current.chat = true;

    // Clean up previous driver if exists
    if (driverInstanceRef.current) {
      driverInstanceRef.current.destroy();
    }

    // Wait for element to be available
    setTimeout(() => {
      const analysisButton = document.getElementById("image-analysis-button");
      if (!analysisButton) {
        console.log("Image analysis button not found, skipping chat tour");
        tourStartedRef.current.chat = false;
        return;
      }

      const newDriver = createDriver(TOUR_STEPS.chat, () => {
        // Mark both tours as completed when chat tour finishes
        setIsDashboardTourCompleted(true);
        setIsChatTourCompleted(true);
        localStorage.setItem(STORAGE_KEYS.DASHBOARD_TOUR_COMPLETED, "true");
        localStorage.setItem(STORAGE_KEYS.CHAT_TOUR_COMPLETED, "true");
        tourStartedRef.current.chat = false;
      });

      driverInstanceRef.current = newDriver;
      setIsTourActive(true);
      isTourActiveRef.current = true;
      newDriver.drive();
    }, 500);
  }, [createDriver]);

  const markDashboardTourCompleted = useCallback(() => {
    setIsDashboardTourCompleted(true);
    localStorage.setItem(STORAGE_KEYS.DASHBOARD_TOUR_COMPLETED, "true");
  }, []);

  const markChatTourCompleted = useCallback(() => {
    setIsChatTourCompleted(true);
    localStorage.setItem(STORAGE_KEYS.CHAT_TOUR_COMPLETED, "true");
  }, []);

  const destroyCurrentTour = useCallback((markCompleted?: "dashboard" | "chat") => {
    // Clean up any existing driver when navigating
    if (driverInstanceRef.current) {
      driverInstanceRef.current.destroy();
      driverInstanceRef.current = null;
    }
    setIsTourActive(false);
    isTourActiveRef.current = false;
    // Reset tour started refs
    tourStartedRef.current = { dashboard: false, chat: false };

    // Mark specific tour as completed if requested
    if (markCompleted === "dashboard") {
      setIsDashboardTourCompleted(true);
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_TOUR_COMPLETED, "true");
    } else if (markCompleted === "chat") {
      // Mark both tours as completed when chat tour is destroyed
      setIsDashboardTourCompleted(true);
      setIsChatTourCompleted(true);
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_TOUR_COMPLETED, "true");
      localStorage.setItem(STORAGE_KEYS.CHAT_TOUR_COMPLETED, "true");
    }
  }, []);

  const restartAllTours = useCallback(() => {
    // Clear all tour completion flags
    localStorage.removeItem(STORAGE_KEYS.DASHBOARD_TOUR_COMPLETED);
    localStorage.removeItem(STORAGE_KEYS.CHAT_TOUR_COMPLETED);
    setIsDashboardTourCompleted(false);
    setIsChatTourCompleted(false);

    // Reset tour started refs to allow restart
    tourStartedRef.current = { dashboard: false, chat: false };

    // Clean up any existing driver
    if (driverInstanceRef.current) {
      driverInstanceRef.current.destroy();
      driverInstanceRef.current = null;
    }
    setIsTourActive(false);
    isTourActiveRef.current = false;

    // Check current page context and start appropriate tour
    setTimeout(() => {
      const chatButton = document.getElementById("chat-ai-button");
      const analysisButton = document.getElementById("image-analysis-button");

      // If on chat page with AI chat open (has analysis button), start chat tour directly
      if (analysisButton) {
        startChatTour();
      } else if (chatButton) {
        // On dashboard or any page with Chat AI button - start dashboard tour
        startDashboardTour();
      } else {
        // On chat page without Chat AI button - start chat tour
        const analysisButton = document.getElementById("image-analysis-button");
        if (analysisButton) {
          startChatTour();
        }
      }
    }, 200);
  }, [startChatTour, startDashboardTour]);

  // Cleanup driver on unmount
  useEffect(() => {
    return () => {
      if (driverInstanceRef.current) {
        driverInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <TourGuideContext.Provider
      value={{
        startDashboardTour,
        startChatTour,
        restartAllTours,
        destroyCurrentTour,
        isDashboardTourCompleted,
        isChatTourCompleted,
        markDashboardTourCompleted,
        markChatTourCompleted,
        isTourActive,
      }}
    >
      {children}
    </TourGuideContext.Provider>
  );
};
