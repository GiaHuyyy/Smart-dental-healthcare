"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, ChevronDown, ChevronUp, Trash2, Plus, Settings, CalendarOff, X, Loader2 } from "lucide-react";
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

interface WorkingHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId?: string;
  accessToken?: string;
  onSave?: (weeklySchedule: DaySchedule[], blockedTimes: BlockedTime[]) => void;
}

// Days of week in Vietnamese
const DAYS_OF_WEEK = [
  { key: "monday", name: "Thứ 2", dayIndex: 1 },
  { key: "tuesday", name: "Thứ 3", dayIndex: 2 },
  { key: "wednesday", name: "Thứ 4", dayIndex: 3 },
  { key: "thursday", name: "Thứ 5", dayIndex: 4 },
  { key: "friday", name: "Thứ 6", dayIndex: 5 },
  { key: "saturday", name: "Thứ 7", dayIndex: 6 },
  { key: "sunday", name: "Chủ Nhật", dayIndex: 0 },
];

// Get date for a specific day of the current week
const getDateForDay = (dayIndex: number): string => {
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = dayIndex - currentDayIndex;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
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

export default function WorkingHoursModal({ isOpen, onClose, doctorId, accessToken, onSave }: WorkingHoursModalProps) {
  const [activeTab, setActiveTab] = useState("weekly");
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(initializeWeeklySchedule);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          // Map API response to component state
          if (data.data.weeklySchedule?.length > 0) {
            setWeeklySchedule(data.data.weeklySchedule);
          }
          if (data.data.blockedTimes) {
            setBlockedTimes(data.data.blockedTimes);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Fetch schedule when modal opens
  useEffect(() => {
    if (isOpen && doctorId) {
      fetchSchedule();
      setExpandedDay(null);
    }
  }, [isOpen, doctorId, fetchSchedule]);

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

  // Toggle expand day
  const toggleExpandDay = (dayKey: string) => {
    setExpandedDay((prev) => (prev === dayKey ? null : dayKey));
  };

  // Add blocked time
  const addBlockedTime = () => {
    if (!newBlockedTime.startDate) {
      toast.error("Vui lòng chọn ngày bắt đầu");
      return;
    }

    const blockedTime: BlockedTime = {
      id: Date.now().toString(),
      startDate: newBlockedTime.startDate,
      endDate: newBlockedTime.endDate || newBlockedTime.startDate,
      type: newBlockedTime.type || "full_day",
      startTime: newBlockedTime.type === "time_range" ? newBlockedTime.startTime : undefined,
      endTime: newBlockedTime.type === "time_range" ? newBlockedTime.endTime : undefined,
      reason: newBlockedTime.reason,
    };

    setBlockedTimes((prev) => [...prev, blockedTime]);
    setNewBlockedTime({
      startDate: "",
      endDate: "",
      type: "full_day",
      startTime: "08:00",
      endTime: "17:00",
      reason: "",
    });
    toast.success("Đã thêm lịch nghỉ");
  };

  // Remove blocked time
  const removeBlockedTime = (id: string) => {
    setBlockedTimes((prev) => prev.filter((bt) => bt.id !== id));
    toast.success("Đã xóa lịch nghỉ");
  };

  // Save all changes
  const handleSave = async () => {
    if (!doctorId || !accessToken) {
        console.log("Missing authentication information", accessToken);
      toast.error("Thiếu thông tin xác thực");
      return;
    }

    setIsSaving(true);
    try {
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

      if (!response.ok) {
        throw new Error("Failed to save schedule");
      }

      if (onSave) {
        onSave(weeklySchedule, blockedTimes);
      }
      toast.success("Đã lưu lịch làm việc");
      onClose();
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
                            onClick={() => toggleDayWorking(day.dayKey)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              day.isWorking ? "bg-primary" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                day.isWorking ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${day.isWorking ? "text-gray-900" : "text-gray-500"}`}>
                              {day.dayName}
                            </span>
                            <span className={`text-sm ${day.isWorking ? "text-primary" : "text-gray-400"}`}>
                              ({getDateForDay(day.dayIndex)})
                            </span>
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
                                .map((slot) => (
                                  <button
                                    key={slot.time}
                                    onClick={() => toggleTimeSlot(day.dayKey, slot.time)}
                                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-all border ${
                                      slot.isWorking
                                        ? "bg-primary text-white border-primary hover:bg-primary/90"
                                        : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                                    }`}
                                  >
                                    <div>{slot.time}</div>
                                    <div className="text-xs opacity-80">{calculateEndTime(slot.time)}</div>
                                  </button>
                                ))}
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
                                .map((slot) => (
                                  <button
                                    key={slot.time}
                                    onClick={() => toggleTimeSlot(day.dayKey, slot.time)}
                                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-all border ${
                                      slot.isWorking
                                        ? "bg-primary text-white border-primary hover:bg-primary/90"
                                        : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                                    }`}
                                  >
                                    <div>{slot.time}</div>
                                    <div className="text-xs opacity-80">{calculateEndTime(slot.time)}</div>
                                  </button>
                                ))}
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="mt-4 flex gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-primary rounded" />
                              <span className="text-gray-600">Làm việc</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
                              <span className="text-gray-600">Nghỉ</span>
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Từ giờ</label>
                            <input
                              type="time"
                              value={newBlockedTime.startTime}
                              onChange={(e) => setNewBlockedTime((prev) => ({ ...prev, startTime: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Đến giờ</label>
                            <input
                              type="time"
                              value={newBlockedTime.endTime}
                              onChange={(e) => setNewBlockedTime((prev) => ({ ...prev, endTime: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            />
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
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm lịch nghỉ
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
            disabled={isSaving}
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
    </div>
  );
}
