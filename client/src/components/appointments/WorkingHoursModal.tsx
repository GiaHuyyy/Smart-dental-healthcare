"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Settings,
  CalendarOff,
  X,
  Loader2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface TimeSlot {
  time: string;
  isWorking: boolean;
}

interface DaySchedule {
  dayKey: string;
  dayName: string;
  dayIndex: number;
  isWorking: boolean;
  timeSlots: TimeSlot[];
}

interface BlockedTime {
  id: string;
  startDate: string;
  endDate: string;
  type: "full_day" | "time_range";
  startTime?: string;
  endTime?: string;
  reason?: string;
}

// Conflicting appointment interface
interface ConflictingAppointment {
  _id: string;
  patientId?: {
    _id: string;
    fullName: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    gender?: string;
    address?: string;
  };
  patientName?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType?: string;
  visitType?: string;
  reason?: string;
  status: string;
}

interface WorkingHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId?: string;
  accessToken?: string;
  onSave?: (weeklySchedule: DaySchedule[], blockedTimes: BlockedTime[]) => void;
  onViewAppointment?: (appointmentId: string) => void; // Callback to open appointment detail modal in parent
}

// Days of week in Vietnamese (Monday to Sunday)
const DAYS_OF_WEEK = [
  { key: "monday", name: "Thứ 2", dayIndex: 1 },
  { key: "tuesday", name: "Thứ 3", dayIndex: 2 },
  { key: "wednesday", name: "Thứ 4", dayIndex: 3 },
  { key: "thursday", name: "Thứ 5", dayIndex: 4 },
  { key: "friday", name: "Thứ 6", dayIndex: 5 },
  { key: "saturday", name: "Thứ 7", dayIndex: 6 },
  { key: "sunday", name: "Chủ Nhật", dayIndex: 7 }, // Use 7 instead of 0 to represent end of week
];

// Get date for a specific day of the current week (Monday-based week)
const getDateForDay = (dayIndex: number): string => {
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  // Convert Sunday (0) to 7 for calculation purposes
  const adjustedCurrentDay = currentDayIndex === 0 ? 7 : currentDayIndex;
  const adjustedTargetDay = dayIndex === 0 ? 7 : dayIndex;
  const diff = adjustedTargetDay - adjustedCurrentDay;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Get Date object for a specific day of the current week (Monday-based week)
const getDateObjectForDay = (dayIndex: number): Date => {
  const today = new Date();
  const currentDayIndex = today.getDay();
  // Convert Sunday (0) to 7 for calculation purposes
  const adjustedCurrentDay = currentDayIndex === 0 ? 7 : currentDayIndex;
  const adjustedTargetDay = dayIndex === 0 ? 7 : dayIndex;
  const diff = adjustedTargetDay - adjustedCurrentDay;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
};

// Check if a day is in the past
const isDayInPast = (dayIndex: number): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = getDateObjectForDay(dayIndex);
  return targetDate < today;
};

// Check if a specific time slot on a day is in the past
const isTimeSlotInPast = (dayIndex: number, time: string): boolean => {
  const now = new Date();
  const targetDate = getDateObjectForDay(dayIndex);
  const [hours, minutes] = time.split(":").map(Number);
  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate < now;
};

// Generate time slots from 08:00 to 17:00 (30 min intervals)
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour < 17; hour++) {
    slots.push({ time: `${hour.toString().padStart(2, "0")}:00`, isWorking: true });
    slots.push({ time: `${hour.toString().padStart(2, "0")}:30`, isWorking: true });
  }
  slots.push({ time: "17:00", isWorking: true }); // Last slot ends at 17:30
  return slots;
};

// Initialize weekly schedule
const initializeWeeklySchedule = (): DaySchedule[] => {
  return DAYS_OF_WEEK.map((day) => ({
    dayKey: day.key,
    dayName: day.name,
    dayIndex: day.dayIndex,
    isWorking: true, // Default: working days Mon-Sun
    timeSlots: generateTimeSlots(),
  }));
};

// Helper function to format time input (e.g., "12" -> "12:00", "8" -> "08:00")
const formatTimeInput = (value: string): string => {
  if (!value) return "";
  // Remove any non-digit and non-colon characters
  const cleaned = value.replace(/[^0-9:]/g, "");

  // If already in HH:MM format, return as is
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(cleaned)) {
    const [h, m] = cleaned.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }

  // If just a number (hour), add :00
  if (/^([0-1]?[0-9]|2[0-3])$/.test(cleaned)) {
    return `${cleaned.padStart(2, "0")}:00`;
  }

  // If partial format like "12:3", complete it
  if (/^([0-1]?[0-9]|2[0-3]):[0-5]$/.test(cleaned)) {
    const [h, m] = cleaned.split(":");
    return `${h.padStart(2, "0")}:${m}0`;
  }

  return cleaned;
};

export default function WorkingHoursModal({
  isOpen,
  onClose,
  doctorId,
  accessToken,
  onSave,
  onViewAppointment,
}: WorkingHoursModalProps) {
  const [activeTab, setActiveTab] = useState("weekly");

  // Cache fetched appointments for time slot conflict check
  const [cachedAppointments, setCachedAppointments] = useState<ConflictingAppointment[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(initializeWeeklySchedule);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Track original data to detect changes
  const [originalSchedule, setOriginalSchedule] = useState<string>("");
  const [originalBlockedTimes, setOriginalBlockedTimes] = useState<string>("");

  // Conflict warning modal states
  const [conflictWarningOpen, setConflictWarningOpen] = useState(false);
  const [conflictingAppointments, setConflictingAppointments] = useState<ConflictingAppointment[]>([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  // Track which source triggered the conflict warning (for weekly tab vs blocked time tab)
  const [conflictSource, setConflictSource] = useState<"weekly" | "blocked">("blocked");

  // Check if there are unsaved changes
  const hasChanges = () => {
    const currentSchedule = JSON.stringify(weeklySchedule);
    const currentBlockedTimes = JSON.stringify(blockedTimes);
    return currentSchedule !== originalSchedule || currentBlockedTimes !== originalBlockedTimes;
  };

  // New blocked time form
  const [newBlockedTime, setNewBlockedTime] = useState<Partial<BlockedTime>>({
    startDate: "",
    endDate: "",
    type: "full_day",
    startTime: "08:00",
    endTime: "17:00",
    reason: "",
  });

  // Fetch schedule from API
  const fetchSchedule = useCallback(async () => {
    if (!doctorId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-schedule/${doctorId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        // Support both data.data (wrapped) and data (direct) response formats
        const scheduleData = responseData.data || responseData;
        if (scheduleData) {
          // Merge API response with default schedule structure
          if (scheduleData.weeklySchedule?.length > 0) {
            const apiSchedule = scheduleData.weeklySchedule;
            // Merge with defaults to ensure proper structure
            const mergedSchedule = DAYS_OF_WEEK.map((day) => {
              const apiDay = apiSchedule.find((d: DaySchedule) => d.dayKey === day.key);
              if (apiDay) {
                return {
                  ...apiDay,
                  dayName: day.name, // Ensure Vietnamese name
                  dayIndex: day.dayIndex, // Ensure correct dayIndex
                };
              }
              // Return default if not found in API
              return {
                dayKey: day.key,
                dayName: day.name,
                dayIndex: day.dayIndex,
                isWorking: true,
                timeSlots: generateTimeSlots(),
              };
            });
            setWeeklySchedule(mergedSchedule);
            // Save original schedule for change detection
            setOriginalSchedule(JSON.stringify(mergedSchedule));
          } else {
            // No schedule from API, use default
            const defaultSchedule = initializeWeeklySchedule();
            setWeeklySchedule(defaultSchedule);
            setOriginalSchedule(JSON.stringify(defaultSchedule));
          }
          if (scheduleData.blockedTimes) {
            setBlockedTimes(scheduleData.blockedTimes);
            setOriginalBlockedTimes(JSON.stringify(scheduleData.blockedTimes));
          } else {
            setOriginalBlockedTimes(JSON.stringify([]));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Fetch appointments for conflict checking
  const fetchAppointments = useCallback(async () => {
    if (!doctorId || !accessToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}?populate=patientId`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const appointments = data.data || data || [];
        // Filter only pending and confirmed appointments
        const activeAppointments = appointments.filter(
          (apt: ConflictingAppointment) => apt.status === "pending" || apt.status === "confirmed"
        );
        setCachedAppointments(activeAppointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  }, [doctorId, accessToken]);

  // Fetch schedule when modal opens
  useEffect(() => {
    if (isOpen && doctorId) {
      fetchSchedule();
      fetchAppointments();
      setExpandedDay(null);
    }
  }, [isOpen, doctorId, fetchSchedule, fetchAppointments]);

  // Toggle day working status
  const toggleDayWorking = (dayKey: string) => {
    setWeeklySchedule((prev) =>
      prev.map((day) => (day.dayKey === dayKey ? { ...day, isWorking: !day.isWorking } : day))
    );
  };

  // Toggle individual time slot
  const toggleTimeSlot = (dayKey: string, time: string) => {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.dayKey === dayKey
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot) =>
                slot.time === time ? { ...slot, isWorking: !slot.isWorking } : slot
              ),
            }
          : day
      )
    );
  };

  // Check if a time slot has appointments (from cached appointments)
  const getAppointmentsAtTimeSlot = (dayIndex: number, time: string): ConflictingAppointment[] => {
    if (cachedAppointments.length === 0) return [];

    // Get the date for this day
    const targetDate = getDateObjectForDay(dayIndex);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const targetDateStr = `${year}-${month}-${day}`;

    // Calculate end time for the slot (30 min duration)
    const endTime = calculateEndTime(time);

    return cachedAppointments.filter((apt) => {
      const aptDateStr = apt.appointmentDate.split("T")[0];
      if (aptDateStr !== targetDateStr) return false;

      // Check if appointment overlaps with this time slot
      const aptStart = apt.startTime;
      const aptEnd = apt.endTime;

      // Overlap: apt starts before slot ends AND apt ends after slot starts
      return aptStart < endTime && aptEnd > time;
    });
  };

  // Handle time slot click - check for appointments first
  const handleTimeSlotClick = (dayKey: string, dayIndex: number, time: string) => {
    const appointmentsAtSlot = getAppointmentsAtTimeSlot(dayIndex, time);

    if (appointmentsAtSlot.length > 0) {
      // Show conflict warning modal
      setConflictingAppointments(appointmentsAtSlot);
      setConflictSource("weekly");
      setConflictWarningOpen(true);
    } else {
      // No conflicts, toggle the time slot
      toggleTimeSlot(dayKey, time);
    }
  };

  // Toggle expand day
  const toggleExpandDay = (dayKey: string) => {
    setExpandedDay((prev) => (prev === dayKey ? null : dayKey));
  };

  // Check for conflicting appointments before adding blocked time
  const checkForConflictingAppointments = async (
    startDate: string,
    endDate: string,
    type: "full_day" | "time_range",
    startTime?: string,
    endTime?: string
  ): Promise<ConflictingAppointment[]> => {
    if (!doctorId || !accessToken) return [];

    try {
      // Fetch appointments for the doctor
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}?populate=patientId`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const appointments = data.data || data || [];
      console.log("Fetched appointments for conflict check:", appointments);
      // Filter appointments that conflict with the blocked time
      const conflicting = appointments.filter((apt: ConflictingAppointment) => {
        // Parse appointment date - handle both ISO format and yyyy-mm-dd
        const aptDateStr = apt.appointmentDate.split("T")[0];

        // Check if appointment is within blocked date range
        if (aptDateStr < startDate || aptDateStr > endDate) {
          return false;
        }

        // Only check pending or confirmed appointments
        if (apt.status !== "pending" && apt.status !== "confirmed") {
          return false;
        }

        // If full day block, all appointments on those days conflict
        if (type === "full_day") {
          return true;
        }

        // If time range block, check if appointment time overlaps
        if (type === "time_range" && startTime && endTime) {
          const aptStart = apt.startTime;
          const aptEnd = apt.endTime;

          // Check for overlap: apt starts before block ends AND apt ends after block starts
          return aptStart < endTime && aptEnd > startTime;
        }

        return false;
      });

      return conflicting;
    } catch (error) {
      console.error("Error checking for conflicting appointments:", error);
      return [];
    }
  };

  // Pending blocked time to be added after confirmation
  const [pendingBlockedTime, setPendingBlockedTime] = useState<BlockedTime | null>(null);

  // Add blocked time
  const addBlockedTime = async () => {
    if (!newBlockedTime.startDate) {
      toast.error("Vui lòng chọn ngày bắt đầu");
      return;
    }

    // Format time inputs
    const formattedStartTime = formatTimeInput(newBlockedTime.startTime || "");
    const formattedEndTime = formatTimeInput(newBlockedTime.endTime || "");

    // Validate time range
    if (newBlockedTime.type === "time_range") {
      if (!formattedStartTime || !formattedEndTime) {
        toast.error("Vui lòng nhập thời gian bắt đầu và kết thúc");
        return;
      }
      if (formattedStartTime >= formattedEndTime) {
        toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
        return;
      }
    }

    const blockedTime: BlockedTime = {
      id: Date.now().toString(),
      startDate: newBlockedTime.startDate,
      endDate: newBlockedTime.endDate || newBlockedTime.startDate,
      type: newBlockedTime.type || "full_day",
      startTime: newBlockedTime.type === "time_range" ? formattedStartTime : undefined,
      endTime: newBlockedTime.type === "time_range" ? formattedEndTime : undefined,
      reason: newBlockedTime.reason,
    };

    // Check for conflicting appointments
    setIsCheckingConflict(true);
    const conflicts = await checkForConflictingAppointments(
      blockedTime.startDate,
      blockedTime.endDate,
      blockedTime.type,
      blockedTime.startTime,
      blockedTime.endTime
    );
    setIsCheckingConflict(false);

    if (conflicts.length > 0) {
      // Show warning modal
      setConflictingAppointments(conflicts);
      setPendingBlockedTime(blockedTime);
      setConflictSource("blocked");
      setConflictWarningOpen(true);
      return;
    }

    // No conflicts, add directly
    finalizeAddBlockedTime(blockedTime);
  };

  // Finalize adding blocked time (after confirmation or no conflicts)
  const finalizeAddBlockedTime = (blockedTime: BlockedTime) => {
    setBlockedTimes((prev) => [...prev, blockedTime]);
    setNewBlockedTime({
      startDate: "",
      endDate: "",
      type: "full_day",
      startTime: "08:00",
      endTime: "17:00",
      reason: "",
    });
    setPendingBlockedTime(null);
    setConflictWarningOpen(false);
    setConflictingAppointments([]);
    toast.success("Đã thêm lịch nghỉ");
  };

  // Handle view appointment from warning modal - calls parent's onViewAppointment
  const handleViewConflictAppointment = (appointment: ConflictingAppointment) => {
    // Close warning modal and working hours modal
    setConflictWarningOpen(false);
    setConflictingAppointments([]);
    setPendingBlockedTime(null);
    onClose(); // Close working hours modal

    // Call parent callback to open appointment detail modal
    if (onViewAppointment) {
      onViewAppointment(appointment._id);
    }
  };

  // Close conflict warning modal
  const closeConflictWarning = () => {
    setConflictWarningOpen(false);
    setConflictingAppointments([]);
    setPendingBlockedTime(null);
  };

  // Remove blocked time
  const removeBlockedTime = (id: string) => {
    setBlockedTimes((prev) => prev.filter((bt) => bt.id !== id));
    toast.success("Đã xóa lịch nghỉ");
  };

  // Save all changes
  const handleSave = async () => {
    if (!doctorId || !accessToken) {
      console.log("Missing authentication information", { doctorId, accessToken: accessToken ? "present" : "missing" });
      toast.error("Thiếu thông tin xác thực");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Saving schedule...", {
        doctorId,
        weeklySchedule: weeklySchedule.length,
        blockedTimes: blockedTimes.length,
      });
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          weeklySchedule,
          blockedTimes,
        }),
      });

      console.log("Save response status:", response.status);
      const responseData = await response.json();
      console.log("Save response data:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to save schedule");
      }

      if (onSave) {
        onSave(weeklySchedule, blockedTimes);
      }

      // Update original data after successful save
      setOriginalSchedule(JSON.stringify(weeklySchedule));
      setOriginalBlockedTimes(JSON.stringify(blockedTimes));

      toast.success("Đã lưu lịch làm việc");
      // Keep modal open after save - user can close manually
    } catch (error) {
      console.error("Error saving working hours:", error);
      toast.error("Không thể lưu lịch làm việc");
    } finally {
      setIsSaving(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Calculate end time (30 min after start)
  const calculateEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + 30;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  // Check if a time slot is blocked by blockedTimes
  const isTimeSlotBlocked = (dayIndex: number, time: string): boolean => {
    if (blockedTimes.length === 0) return false;

    // Get the date for this day
    const targetDate = getDateObjectForDay(dayIndex);
    // Format as YYYY-MM-DD in local timezone (not UTC)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const targetDateStr = `${year}-${month}-${day}`;

    for (const blocked of blockedTimes) {
      // Check if the target date falls within the blocked date range
      const startDate = blocked.startDate;
      const endDate = blocked.endDate || blocked.startDate;

      if (targetDateStr >= startDate && targetDateStr <= endDate) {
        // Date matches, now check the type
        if (blocked.type === "full_day") {
          return true; // Full day is blocked
        } else if (blocked.type === "time_range" && blocked.startTime && blocked.endTime) {
          // Check if the time slot falls within the blocked time range
          if (time >= blocked.startTime && time < blocked.endTime) {
            return true;
          }
        }
      }
    }

    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-primary">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Quản lý Giờ làm việc</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-gray-500">Đang tải lịch làm việc...</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full border-0 gap-2 rounded-0 p-0 grid-cols-2 bg-gray-100">
                <TabsTrigger
                  value="weekly"
                  className="flex items-center gap-2 p-2 border-0 data-[state=active]:bg-[#00a6f4] data-[state=active]:text-white"
                >
                  <Clock className="w-4 h-4" />
                  Lịch làm việc tuần
                </TabsTrigger>
                <TabsTrigger
                  value="blocked"
                  className="flex items-center gap-2 p-2 border-0 data-[state=active]:bg-[#00a6f4] data-[state=active]:text-white"
                >
                  <CalendarOff className="w-4 h-4" />
                  Lịch nghỉ cụ thể
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Weekly Schedule */}
              <TabsContent value="weekly" className="flex-1 overflow-y-auto mt-4 pr-2">
                <div className="space-y-3">
                  {weeklySchedule.map((day) => (
                    <div
                      key={day.dayKey}
                      className={`border rounded-lg transition-all ${
                        day.isWorking ? "border-primary/30 bg-primary/5" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {/* Toggle Switch */}
                          <button
                            onClick={() => !isDayInPast(day.dayIndex) && toggleDayWorking(day.dayKey)}
                            disabled={isDayInPast(day.dayIndex)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              isDayInPast(day.dayIndex)
                                ? "bg-gray-200 cursor-not-allowed opacity-50"
                                : day.isWorking
                                ? "bg-primary"
                                : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                day.isWorking ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                isDayInPast(day.dayIndex)
                                  ? "text-gray-400"
                                  : day.isWorking
                                  ? "text-gray-900"
                                  : "text-gray-500"
                              }`}
                            >
                              {day.dayName}
                            </span>
                            <span
                              className={`text-sm ${
                                isDayInPast(day.dayIndex)
                                  ? "text-gray-400"
                                  : day.isWorking
                                  ? "text-primary"
                                  : "text-gray-400"
                              }`}
                            >
                              ({getDateForDay(day.dayIndex)})
                            </span>
                            {isDayInPast(day.dayIndex) && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Đã qua</span>
                            )}
                          </div>
                        </div>

                        {day.isWorking && (
                          <button
                            onClick={() => toggleExpandDay(day.dayKey)}
                            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                          >
                            <span>{day.timeSlots.filter((s) => s.isWorking).length} khung giờ</span>
                            {expandedDay === day.dayKey ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Time Slots - Expanded */}
                      {day.isWorking && expandedDay === day.dayKey && (
                        <div className="px-4 pb-4 border-t border-primary/20">
                          <p className="text-xs text-gray-500 mt-3 mb-3">Click vào khung giờ để bật/tắt làm việc</p>

                          {/* Morning Slots */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Buổi sáng</h4>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {day.timeSlots
                                .filter((slot) => {
                                  const hour = parseInt(slot.time.split(":")[0]);
                                  return hour < 12;
                                })
                                .map((slot) => {
                                  const isPast = isTimeSlotInPast(day.dayIndex, slot.time);
                                  const isBlocked = isTimeSlotBlocked(day.dayIndex, slot.time);
                                  const hasAppointment = getAppointmentsAtTimeSlot(day.dayIndex, slot.time).length > 0;
                                  return (
                                    <button
                                      key={slot.time}
                                      onClick={() => {
                                        if (isPast || isBlocked) return;
                                        handleTimeSlotClick(day.dayKey, day.dayIndex, slot.time);
                                      }}
                                      disabled={isPast || isBlocked}
                                      className={`px-2 py-2 rounded-lg text-sm font-medium transition-all border ${
                                        isPast
                                          ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-50"
                                          : isBlocked
                                          ? "bg-red-100 text-red-500 border-red-300 cursor-not-allowed"
                                          : hasAppointment
                                          ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                                          : slot.isWorking
                                          ? "bg-primary text-white border-primary hover:bg-primary/90"
                                          : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                                      }`}
                                      title={
                                        isBlocked ? "Đã đặt lịch nghỉ" : hasAppointment ? "Có lịch hẹn" : undefined
                                      }
                                    >
                                      <div>{slot.time}</div>
                                      <div className="text-xs opacity-80">{calculateEndTime(slot.time)}</div>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>

                          {/* Afternoon Slots */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Buổi chiều</h4>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {day.timeSlots
                                .filter((slot) => {
                                  const hour = parseInt(slot.time.split(":")[0]);
                                  return hour >= 12;
                                })
                                .map((slot) => {
                                  const isPast = isTimeSlotInPast(day.dayIndex, slot.time);
                                  const isBlocked = isTimeSlotBlocked(day.dayIndex, slot.time);
                                  const hasAppointment = getAppointmentsAtTimeSlot(day.dayIndex, slot.time).length > 0;
                                  return (
                                    <button
                                      key={slot.time}
                                      onClick={() => {
                                        if (isPast || isBlocked) return;
                                        handleTimeSlotClick(day.dayKey, day.dayIndex, slot.time);
                                      }}
                                      disabled={isPast || isBlocked}
                                      className={`px-2 py-2 rounded-lg text-sm font-medium transition-all border ${
                                        isPast
                                          ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-50"
                                          : isBlocked
                                          ? "bg-red-100 text-red-500 border-red-300 cursor-not-allowed"
                                          : hasAppointment
                                          ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                                          : slot.isWorking
                                          ? "bg-primary text-white border-primary hover:bg-primary/90"
                                          : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                                      }`}
                                      title={
                                        isBlocked ? "Đã đặt lịch nghỉ" : hasAppointment ? "Có lịch hẹn" : undefined
                                      }
                                    >
                                      <div>{slot.time}</div>
                                      <div className="text-xs opacity-80">{calculateEndTime(slot.time)}</div>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="mt-4 flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-primary rounded" />
                              <span className="text-gray-600">Làm việc</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
                              <span className="text-gray-600">Nghỉ</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                              <span className="text-gray-600">Lịch nghỉ cụ thể</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded" />
                              <span className="text-gray-600">Có lịch hẹn</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded opacity-50" />
                              <span className="text-gray-600">Đã qua</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Tab 2: Blocked Times */}
              <TabsContent value="blocked" className="flex-1 overflow-y-auto mt-4 pr-2">
                <div className="space-y-6">
                  {/* Add New Blocked Time Form */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      Thêm lịch nghỉ mới
                    </h3>

                    <div className="space-y-4">
                      {/* Date Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Từ ngày <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={newBlockedTime.startDate}
                            onChange={(e) => setNewBlockedTime((prev) => ({ ...prev, startDate: e.target.value }))}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                          <input
                            type="date"
                            value={newBlockedTime.endDate}
                            onChange={(e) => setNewBlockedTime((prev) => ({ ...prev, endDate: e.target.value }))}
                            min={newBlockedTime.startDate || new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                      </div>

                      {/* Block Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loại nghỉ</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="blockType"
                              checked={newBlockedTime.type === "full_day"}
                              onChange={() => setNewBlockedTime((prev) => ({ ...prev, type: "full_day" }))}
                              className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700">Nghỉ cả ngày</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="blockType"
                              checked={newBlockedTime.type === "time_range"}
                              onChange={() => setNewBlockedTime((prev) => ({ ...prev, type: "time_range" }))}
                              className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700">Nghỉ theo giờ</span>
                          </label>
                        </div>
                      </div>

                      {/* Time Range (if time_range selected) */}
                      {newBlockedTime.type === "time_range" && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">
                            * Sử dụng định dạng 24 giờ (VD: 08:00 = 8h sáng, 13:00 = 1h chiều, 17:00 = 5h chiều)
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Từ giờ</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={newBlockedTime.startTime}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow only valid time format HH:MM
                                    if (
                                      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value) ||
                                      /^([0-1]?[0-9]|2[0-3]):?[0-5]?$/.test(value) ||
                                      value === ""
                                    ) {
                                      setNewBlockedTime((prev) => ({ ...prev, startTime: value }));
                                    }
                                  }}
                                  placeholder="VD: 08:00, 12:00, 14:30"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Đến giờ</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={newBlockedTime.endTime}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow only valid time format HH:MM
                                    if (
                                      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value) ||
                                      /^([0-1]?[0-9]|2[0-3]):?[0-5]?$/.test(value) ||
                                      value === ""
                                    ) {
                                      setNewBlockedTime((prev) => ({ ...prev, endTime: value }));
                                    }
                                  }}
                                  placeholder="VD: 12:00, 17:00, 18:30"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reason */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lý do (tùy chọn)</label>
                        <input
                          type="text"
                          value={newBlockedTime.reason}
                          onChange={(e) => setNewBlockedTime((prev) => ({ ...prev, reason: e.target.value }))}
                          placeholder="VD: Họp, nghỉ phép, ..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Add Button */}
                      <button
                        onClick={addBlockedTime}
                        disabled={isCheckingConflict}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCheckingConflict ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang kiểm tra...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Thêm lịch nghỉ
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* List of Blocked Times */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Danh sách lịch nghỉ đã đặt ({blockedTimes.length})
                    </h3>

                    {blockedTimes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <CalendarOff className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Chưa có lịch nghỉ nào được đặt</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {blockedTimes.map((bt) => (
                          <div
                            key={bt.id}
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-primary/30 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <CalendarOff className="w-4 h-4 text-red-500" />
                                <span className="font-medium text-gray-900">
                                  {bt.startDate === bt.endDate
                                    ? formatDate(bt.startDate)
                                    : `${formatDate(bt.startDate)} - ${formatDate(bt.endDate)}`}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1 ml-6">
                                {bt.type === "full_day" ? (
                                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                                    Nghỉ cả ngày
                                  </span>
                                ) : (
                                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">
                                    {bt.startTime} - {bt.endTime}
                                  </span>
                                )}
                                {bt.reason && <span className="ml-2 text-gray-400">• {bt.reason}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => removeBlockedTime(bt.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa lịch nghỉ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </button>
        </div>
      </div>

      {/* Conflict Warning Modal - Overlay on top of Working Hours Modal */}
      {conflictWarningOpen && (
        <div className="fixed inset-0 bg-black/40 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-amber-50 rounded-t-xl">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cảnh báo lịch hẹn</h3>
                <p className="text-sm text-gray-600">Đang có lịch hẹn trong khung giờ này</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-gray-700 mb-4">
                Có <span className="font-bold text-amber-600">{conflictingAppointments.length}</span> lịch hẹn{" "}
                {conflictSource === "blocked" ? "sẽ bị ảnh hưởng" : "trong khung giờ này"}:
              </p>

              {/* Appointment list */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {conflictingAppointments.map((apt) => (
                  <div
                    key={apt._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {(apt.patientId?.fullName || apt.patientName || "BN").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {apt.patientId?.fullName || apt.patientName || "Bệnh nhân"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(apt.appointmentDate).toLocaleDateString("vi-VN")} • {apt.startTime} -{" "}
                            {apt.endTime}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewConflictAppointment(apt)}
                      className="flex items-center gap-1 px-3 py-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Xem lịch hẹn
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeConflictWarning}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
