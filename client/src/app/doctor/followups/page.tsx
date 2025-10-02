"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type FollowUpWindow = "oneMonth" | "threeMonths" | "sixMonths";

interface FollowUpPatientSummary {
  _id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
}

type FollowUpSchedule = Partial<Record<FollowUpWindow, string | null | undefined>>;

interface FollowUpItem {
  patient: FollowUpPatientSummary;
  lastAppointmentDate?: string | null;
  followUps: FollowUpSchedule;
}

interface FollowUpStatus {
  label: string;
  color: string;
}

const FOLLOW_UP_WINDOWS: ReadonlyArray<{ key: FollowUpWindow; label: string }> = [
  { key: "oneMonth", label: "1 tháng" },
  { key: "threeMonths", label: "3 tháng" },
  { key: "sixMonths", label: "6 tháng" },
];

const isFollowUpSchedule = (value: unknown): value is FollowUpSchedule => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return FOLLOW_UP_WINDOWS.every(({ key }) => {
    const entry = (value as Record<string, unknown>)[key];
    return entry === undefined || entry === null || typeof entry === "string";
  });
};

const isFollowUpPatientSummary = (value: unknown): value is FollowUpPatientSummary => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate._id === "string" && typeof candidate.fullName === "string";
};

const isFollowUpItem = (value: unknown): value is FollowUpItem => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const lastAppointment = candidate.lastAppointmentDate;
  const hasValidLastAppointment =
    lastAppointment === undefined ||
    lastAppointment === null ||
    typeof lastAppointment === "string";

  return (
    isFollowUpPatientSummary(candidate.patient) &&
    hasValidLastAppointment &&
    isFollowUpSchedule(candidate.followUps)
  );
};

const formatDate = (value?: string | Date | null) => {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("vi-VN");
};

const statusFor = (dateStr?: string | null): FollowUpStatus => {
  if (!dateStr) {
    return { label: "N/A", color: "gray" };
  }
  const targetDate = new Date(dateStr);
  if (Number.isNaN(targetDate.getTime())) {
    return { label: "Không hợp lệ", color: "gray" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Quá hạn", color: "red" };
  if (diff <= 7) return { label: "Sắp đến", color: "orange" };
  if (diff <= 30) return { label: "Trong tháng", color: "#d97706" };
  return { label: "Đã sắp xếp", color: "green" };
};

const fetchFollowUps = async (doctorId: string): Promise<FollowUpItem[]> => {
  const response = await fetch(`/api/appointments/followup/doctor/${doctorId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu (mã ${response.status})`);
  }
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.filter(isFollowUpItem);
};

export default function DoctorFollowupsPage() {
  const searchParams = useSearchParams();
  const doctorId = useMemo(
    () => searchParams.get("doctorId") ?? "",
    [searchParams],
  );

  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!doctorId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let isSubscribed = true;
    setLoading(true);
    fetchFollowUps(doctorId)
      .then((data) => {
        if (isSubscribed) {
          setItems(data);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        if (isSubscribed) {
          setItems([]);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [doctorId, refreshToken]);

  useEffect(() => {
    if (!doctorId) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setRefreshToken((prev) => prev + 1);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [doctorId]);

  const openPatient = useCallback(
    (patientId: string) => {
      router.push(`/doctor/patients/${patientId}`);
    },
    [router],
  );

  const bookForPatient = useCallback(
    (patientId: string) => {
      const query = new URLSearchParams({ patientId });
      if (doctorId) {
        query.set("doctorId", doctorId);
      }
      router.push(`/patient/appointments?${query.toString()}`);
    },
    [doctorId, router],
  );

  const handleRefresh = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="healthcare-card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Lộ trình tái khám - Bác sĩ</h2>
            <p className="text-sm text-gray-500">Hiển thị lộ trình tái khám 1/3/6 tháng dựa trên lần khám gần nhất</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-healthcare-secondary px-3 py-1 text-sm"
            disabled={loading || !doctorId}
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        <div className="healthcare-card p-4">
          {loading ? (
            <div>Đang tải...</div>
          ) : items.length === 0 ? (
            <div>Không có dữ liệu tái khám</div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.patient._id} className="p-3 border rounded-md flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.patient.fullName}</div>
                    <div className="text-sm text-gray-600">Gần nhất: {formatDate(item.lastAppointmentDate)}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.patient.phone || item.patient.email || ""}</div>
                  </div>
                  <div className="text-right text-sm flex flex-col items-end gap-2">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {FOLLOW_UP_WINDOWS.map(({ key, label }) => {
                        const scheduledDate = item.followUps[key] ?? null;
                        const status = statusFor(scheduledDate);
                        return (
                          <div key={key} className="px-2 py-1 rounded-md border" style={{ minWidth: 110 }}>
                            <div className="text-[11px] text-gray-500">{label}</div>
                            <div className="font-medium text-sm">{formatDate(scheduledDate)}</div>
                            <div className="mt-1">
                              <span style={{ color: status.color }} className="text-xs">
                                {status.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => openPatient(item.patient._id)}
                        className="btn-healthcare-secondary px-3 py-1 text-sm"
                      >
                        Xem bệnh nhân
                      </button>
                      <button
                        type="button"
                        onClick={() => bookForPatient(item.patient._id)}
                        className="btn-healthcare-primary px-3 py-1 text-sm"
                        disabled={!doctorId}
                      >
                        Đặt lịch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
