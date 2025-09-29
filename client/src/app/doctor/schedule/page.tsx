"use client";
import { User, Clock, Phone, Edit, Hospital, Calendar, X } from "lucide-react";

import { sendRequest } from "@/utils/api";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DoctorSchedule() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedView, setSelectedView] = useState("day");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apptLoading, setApptLoading] = useState<Record<string, boolean>>({});
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; text: string; type?: "success" | "error" }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [currentTreatmentAppointment, setCurrentTreatmentAppointment] = useState<any>(null);
  const [treatmentForm, setTreatmentForm] = useState({
    chiefComplaints: [] as string[],
    presentIllness: "",
    physicalExamination: "",
    diagnosisGroups: [
      {
        diagnosis: "",
        treatmentPlans: [""],
      },
    ] as { diagnosis: string; treatmentPlans: string[] }[],
    notes: "",
    medications: [] as { name: string; dosage: string; frequency: string; duration: string; instructions: string }[],
  });
  const [isSubmittingTreatment, setIsSubmittingTreatment] = useState(false);
  const [chiefComplaintInput, setChiefComplaintInput] = useState("");

  // Utility functions
  function validateObjectId(id: string | undefined | null): string {
    if (!id) {
      // Generate a valid MongoDB ObjectId format
      return "507f1f77bcf86cd799439011";
    }

    // Check if it's already a valid ObjectId (24 hex characters)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (objectIdRegex.test(id)) {
      return id;
    }

    // If not valid, generate a new one based on timestamp
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomHex = Math.random().toString(16).substring(2, 18);
    return (timestamp + randomHex).padEnd(24, "0").substring(0, 24);
  }

  // Helper function to get auth token from localStorage
  function getAuthToken() {
    // Try localStorage first
    let token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt");

    // If no localStorage token, try session
    if (!token && session) {
      token =
        (session as any)?.access_token ||
        (session as any)?.user?.access_token ||
        (session as any)?.user?.accessToken ||
        (session as any)?.token?.access_token;
    }

    return token;
  }

  const [suggestions, setSuggestions] = useState({
    chiefComplaints: [] as string[],
    diagnoses: [] as string[],
    treatmentPlans: [] as string[],
    medications: [] as string[],
    diagnosisTreatmentMap: {} as Record<string, string[]>,
    diagnosisMedicationMap: {} as Record<
      string,
      Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string }>
    >,
    treatmentMedicationMap: {} as Record<
      string,
      Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string }>
    >,
  });
  const [showSuggestions, setShowSuggestions] = useState({
    chiefComplaint: false,
    diagnosis: false,
    treatmentPlan: false,
    medication: false,
  });
  const [filteredSuggestions, setFilteredSuggestions] = useState({
    chiefComplaints: [] as string[],
    diagnoses: [] as string[],
    treatmentPlans: [] as string[],
    medications: [] as string[],
  });
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({
    chiefComplaint: -1,
    diagnosis: -1,
    treatmentPlan: -1,
    medication: -1,
  });

  function addToast(text: string, type: "success" | "error" = "success") {
    setToasts((prev) => [{ id: `${Date.now()}-${Math.random()}`, text, type }, ...prev].slice(0, 5));
  }

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  function normalizeStatus(rawStatus: any) {
    const r = (rawStatus || "").toString().toLowerCase();
    if (!r) return "";
    if (r === "waiting") return "pending";
    if (r === "inprogress") return "in-progress";
    return r;
  }

  const statusLabelMap: Record<string, string> = {
    pending: "Chờ khám",
    confirmed: "Đã xác nhận",
    "in-progress": "Đang khám",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let doctorId = session?.user?._id;

        // fallback: resolve doctor by email
        if (!doctorId && session?.user?.email) {
          try {
            const userRes = await sendRequest<any>({
              method: "GET",
              url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users`,
              queryParams: { email: session.user.email },
            });
            const usersList = userRes?.results || userRes?.data || userRes;
            const u = Array.isArray(usersList) ? usersList[0] : usersList?.[0] || null;
            if (u) doctorId = u._id || u.id;
          } catch (e) {
            console.warn("resolve doctorId failed", e);
          }
        }

        if (!doctorId) {
          setAppointments([]);
          return;
        }

        const res = await sendRequest<any>({
          method: "GET",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}`,
        });
        const list = res?.data || res || [];
        const arr = Array.isArray(list) ? list : list?.results || [];

        // filter by date
        const filtered = arr.filter((a: any) => {
          const d = a.appointmentDate || a.date;
          if (!d) return true;
          return new Date(d).toISOString().slice(0, 10) === selectedDate;
        });

        // if patient not populated, fetch missing users
        const missingPatientIds = Array.from(
          new Set(
            filtered
              .map((a: any) => {
                const pid =
                  (a.patient && (a.patient._id || a.patient.id)) ||
                  a.patientId ||
                  (typeof a.patient === "string" ? a.patient : null);
                return pid && typeof pid === "string" ? pid : null;
              })
              .filter(Boolean)
          )
        );

        if (missingPatientIds.length > 0) {
          const tokenForFetch =
            (session as any)?.access_token ||
            (session as any)?.user?.access_token ||
            (session as any)?.user?.accessToken ||
            (session as any)?.token?.access_token;
          const fetchHeaders = tokenForFetch ? { Authorization: `Bearer ${tokenForFetch}` } : {};
          const users = await Promise.all(
            missingPatientIds.map((id) =>
              sendRequest<any>({
                method: "GET",
                url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${id}`,
                headers: fetchHeaders,
              })
                .then((r) => r?.data || r)
                .catch(() => null)
            )
          );
          const byId: Record<string, any> = {};
          users.forEach((u) => {
            if (u && (u._id || u.id)) byId[u._id || u.id] = u;
          });
          const enriched = filtered.map((a: any) => {
            const pid =
              (a.patient && (a.patient._id || a.patient.id)) ||
              a.patientId ||
              (typeof a.patient === "string" ? a.patient : null);
            if (pid && typeof pid === "string" && byId[pid]) return { ...a, patient: byId[pid] };
            return a;
          });
          setAppointments(enriched);
        } else {
          setAppointments(filtered);
        }
      } catch (e) {
        console.error("load appointments failed", e);
        addToast("Không thể tải lịch khám", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session, selectedDate]);

  // aggregated counts
  const statusCounts = appointments.reduce((acc: Record<string, number>, a: any) => {
    const s = normalizeStatus(a?.status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  async function updateStatus(id: string, action: "confirm" | "complete" | "cancel") {
    try {
      setApptLoading((s) => ({ ...s, [id]: true }));
      let res;
      console.log("updateStatus", { id, action });
      const token =
        (session as any)?.access_token ||
        (session as any)?.user?.access_token ||
        (session as any)?.user?.accessToken ||
        (session as any)?.token?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (action === "confirm")
        res = await sendRequest<any>({
          method: "POST",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/confirm`,
          headers,
        });
      else if (action === "complete")
        res = await sendRequest<any>({
          method: "POST",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/complete`,
          headers,
        });
      else
        res = await sendRequest<any>({
          method: "DELETE",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/cancel`,
          body: { reason: "Hủy bởi bác sĩ" },
          headers,
        });

      const updated = res?.data || res;
      setAppointments((prev) => prev.map((p) => (p._id === id || p.id === id ? { ...p, ...(updated || {}) } : p)));
      addToast("Cập nhật thành công", "success");
    } catch (e) {
      console.error("updateStatus", e);
      addToast("Cập nhật thất bại", "error");
    } finally {
      setApptLoading((s) => ({ ...s, [id]: false }));
    }
  }

  async function rescheduleAppointment(id: string) {
    // open modal to choose date & slot
    console.log("open reschedule modal for", id);
    setRescheduleApptId(id);
    setRescheduleDate(selectedDate || new Date().toISOString().slice(0, 10));
    setRescheduleSlot(null);
    setRescheduleOpen(true);
  }

  function getAuthHeaders() {
    const token =
      (session as any)?.access_token ||
      (session as any)?.user?.access_token ||
      (session as any)?.user?.accessToken ||
      (session as any)?.token?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
  }

  function handleSlotDrop(e: React.DragEvent, time: string) {
    e.preventDefault();
    setRescheduleSlot(time);
  }

  function handleSlotClick(time: string) {
    setRescheduleSlot(time);
  }

  async function confirmReschedule() {
    if (!rescheduleApptId || !rescheduleSlot || !rescheduleDate)
      return addToast("Vui lòng chọn ngày và khung giờ", "error");
    try {
      setApptLoading((s) => ({ ...s, [rescheduleApptId]: true }));
      // capture old appointment date/time for notification
      const oldAppt = appointments.find((a) => (a._id || a.id) === rescheduleApptId);
      const oldDate = oldAppt?.appointmentDate || oldAppt?.date || "";
      const oldTime = oldAppt?.startTime || oldAppt?.time || "";
      const headers = getAuthHeaders();
      console.log("Reschedule request", {
        id: rescheduleApptId,
        appointmentDate: rescheduleDate,
        appointmentTime: rescheduleSlot,
        headers,
      });
      const res = await sendRequest<any>({
        method: "PATCH",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${rescheduleApptId}/reschedule`,
        body: { appointmentDate: rescheduleDate, appointmentTime: rescheduleSlot },
        headers,
      });
      console.log("Reschedule response", res);
      // sendRequest returns { statusCode, message } on non-ok responses
      if (res && (res as any).statusCode) {
        const msg = (res as any).message || "Đổi lịch thất bại";

        // Hiển thị thông báo lỗi cụ thể
        if (msg.includes("Bác sĩ đã có lịch hẹn vào khung giờ này")) {
          addToast("Bạn đã có lịch hẹn vào khung giờ này. Vui lòng chọn khung giờ khác.", "error");
        } else {
          addToast(msg, "error");
        }
        return;
      }
      const updated = res?.data || res;
      // optimistic update: if backend returns updated appointment, use it; otherwise set date/time locally
      setAppointments((prev) =>
        prev.map((p) => {
          if (p._id === rescheduleApptId || p.id === rescheduleApptId) {
            const newA =
              updated && (updated._id || updated.id)
                ? { ...p, ...(updated || {}) }
                : { ...p, appointmentDate: rescheduleDate, startTime: rescheduleSlot, time: rescheduleSlot };
            // send notification to patient
            try {
              const patientId = newA.patient?._id || newA.patient?.id || newA.patientId;
              if (patientId) {
                const noteBody = {
                  title: "Bác sĩ đã đổi lịch khám",
                  message: `Bác sĩ đã đổi lịch của bạn. Giờ cũ: ${oldDate} ${oldTime}. Giờ mới: ${rescheduleDate} ${rescheduleSlot}`,
                  userId: patientId,
                  type: "appointment",
                  refId: rescheduleApptId,
                  refModel: "Appointment",
                } as any;
                // fire-and-forget
                sendRequest<any>({
                  method: "POST",
                  url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/notifications`,
                  body: noteBody,
                }).catch((err) => console.warn("notify patient failed", err));
                // also broadcast locally so other tabs/windows on same origin see it immediately
                try {
                  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                    const bc = new BroadcastChannel("sdh_notifications");
                    bc.postMessage({ ...noteBody, _localBroadcast: true });
                    bc.close();
                  }
                } catch (bcErr) {
                  console.warn("broadcast notify failed", bcErr);
                }
              }
            } catch (err) {
              console.warn("create notification failed", err);
            }
            return newA;
          }
          return p;
        })
      );
      addToast("Đã đặt lại lịch", "success");
      setRescheduleOpen(false);
    } catch (e) {
      console.error("reschedule failed", e);
      addToast("Đổi lịch thất bại: " + ((e as any)?.message || ""), "error");
    } finally {
      if (rescheduleApptId) setApptLoading((s) => ({ ...s, [rescheduleApptId]: false }));
      setRescheduleApptId(null);
    }
  }

  function closeReschedule() {
    setRescheduleOpen(false);
    setRescheduleApptId(null);
    setRescheduleSlot(null);
  }

  async function startTreatment(appointment: any) {
    const appointmentId = appointment._id || appointment.id;
    const patientId = appointment.patient?._id || appointment.patient?.id || appointment.patientId;
    if (!appointmentId || !patientId) {
      return addToast("Không thể bắt đầu điều trị - thiếu thông tin", "error");
    }

    // Mở modal điều trị
    setCurrentTreatmentAppointment(appointment);
    setTreatmentModalOpen(true);

    // Check if this is a completed appointment - try to load existing medical record
    const isCompleted = appointment.status === "completed";
    if (isCompleted) {
      try {
        // Fetch existing medical record for this appointment
        const token = getAuthToken();
        const response = await fetch(`/api/medical-records/appointment/${appointmentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const apiResponse = await response.json();
          console.log("Raw API response:", apiResponse);

          // Handle wrapped response format from @ResponseMessage decorator
          let recordsArray = [];
          if (apiResponse.data && Array.isArray(apiResponse.data)) {
            recordsArray = apiResponse.data;
          } else if (Array.isArray(apiResponse)) {
            recordsArray = apiResponse;
          } else if (apiResponse) {
            recordsArray = [apiResponse];
          }

          console.log("Processed records array:", recordsArray);

          // Load existing data into form (take the first record if multiple)
          if (recordsArray && recordsArray.length > 0) {
            const existingRecord = recordsArray[0];
            console.log("Loading record into form:", existingRecord);

            // Convert medications data to proper format
            let medicationsData = [];

            // Priority: Use detailedMedications if available, otherwise convert medications strings
            if (existingRecord.detailedMedications && Array.isArray(existingRecord.detailedMedications)) {
              medicationsData = existingRecord.detailedMedications;
              console.log("Using detailedMedications:", medicationsData);
            } else if (existingRecord.medications && Array.isArray(existingRecord.medications)) {
              // Convert string medications to object format
              medicationsData = existingRecord.medications.map((medString: string) => {
                // Parse medication string like "Ibuprofen 400mg"
                const parts = medString.trim().split(" ");
                const dosage = parts[parts.length - 1]; // Last part is usually dosage
                const name = parts.slice(0, -1).join(" ") || medString; // Everything except last part

                return {
                  name: medString, // Use full string as name for safety
                  dosage: dosage.includes("mg") || dosage.includes("ml") ? dosage : "",
                  frequency: "",
                  duration: "",
                  instructions: "",
                };
              });
              console.log("Converted medications from strings:", medicationsData);
            }

            setTreatmentForm({
              chiefComplaints: existingRecord.chiefComplaints || [],
              presentIllness: existingRecord.presentIllness || "",
              physicalExamination: existingRecord.physicalExamination || "",
              diagnosisGroups: existingRecord.diagnosisGroups || [{ diagnosis: "", treatmentPlans: [""] }],
              notes: existingRecord.notes || "",
              medications: medicationsData,
            });
            setChiefComplaintInput("");
            // Fetch suggestions from server
            fetchSuggestions();
            addToast("Đã tải dữ liệu điều trị có sẵn", "success");
            return;
          } else {
            console.log("No records found in response");
            addToast("Không tìm thấy dữ liệu điều trị cho lịch hẹn này", "error");
          }
        } else {
          console.log("API response not ok:", response.status, response.statusText);
          const errorText = await response.text();
          console.error("API Error details:", errorText);
        }
      } catch (error) {
        console.error("Error loading existing medical record:", error);
      }
    }

    // Reset form for new treatment or if no existing record found
    setTreatmentForm({
      chiefComplaints: [],
      presentIllness: "",
      physicalExamination: "",
      diagnosisGroups: [{ diagnosis: "", treatmentPlans: [""] }],
      notes: "",
      medications: [],
    });
    setChiefComplaintInput("");
    // Fetch suggestions from server
    fetchSuggestions();
  }

  function closeTreatmentModal() {
    setTreatmentModalOpen(false);
    setCurrentTreatmentAppointment(null);
    setChiefComplaintInput("");
    setShowSuggestions({
      chiefComplaint: false,
      diagnosis: false,
      treatmentPlan: false,
      medication: false,
    });
  }

  // Fetch suggestions from server
  async function fetchSuggestions() {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/treatment-suggestions", {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }

  function selectSuggestion(field: string, value: string) {
    if (field === "chiefComplaint") {
      addChiefComplaint(value);
      setChiefComplaintInput("");
    } else {
      setTreatmentForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
    setShowSuggestions((prev) => ({
      ...prev,
      [field]: false,
    }));
  }

  function toggleSuggestions(field: string) {
    const isShowing = showSuggestions[field as keyof typeof showSuggestions];

    if (!isShowing) {
      // Show all suggestions when button is clicked and auto-select first
      switch (field) {
        case "chiefComplaint":
          setFilteredSuggestions((prev) => ({
            ...prev,
            chiefComplaints: suggestions.chiefComplaints,
          }));
          setSelectedSuggestionIndex((prev) => ({
            ...prev,
            chiefComplaint: suggestions.chiefComplaints.length > 0 ? 0 : -1,
          }));
          break;
        case "diagnosis":
          setFilteredSuggestions((prev) => ({
            ...prev,
            diagnoses: suggestions.diagnoses,
          }));
          setSelectedSuggestionIndex((prev) => ({
            ...prev,
            diagnosis: suggestions.diagnoses.length > 0 ? 0 : -1,
          }));
          break;
        case "treatmentPlan":
          setFilteredSuggestions((prev) => ({
            ...prev,
            treatmentPlans: suggestions.treatmentPlans,
          }));
          setSelectedSuggestionIndex((prev) => ({
            ...prev,
            treatmentPlan: suggestions.treatmentPlans.length > 0 ? 0 : -1,
          }));
          break;
      }
    }

    setShowSuggestions((prev) => ({
      ...prev,
      [field]: !isShowing,
    }));
  }

  // Functions for managing chief complaints as hashtags
  function addChiefComplaint(complaint: string) {
    if (complaint.trim() && !treatmentForm.chiefComplaints.includes(complaint.trim())) {
      setTreatmentForm((prev) => ({
        ...prev,
        chiefComplaints: [...prev.chiefComplaints, complaint.trim()],
      }));
    }
  }

  function removeChiefComplaint(index: number) {
    setTreatmentForm((prev) => ({
      ...prev,
      chiefComplaints: prev.chiefComplaints.filter((_, i) => i !== index),
    }));
  }

  function handleChiefComplaintKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (chiefComplaintInput.trim()) {
        addChiefComplaint(chiefComplaintInput);
        setChiefComplaintInput("");
        setShowSuggestions((prev) => ({ ...prev, chiefComplaint: false }));
      }
    } else if (e.key === "Backspace" && !chiefComplaintInput && treatmentForm.chiefComplaints.length > 0) {
      // Remove last chip when backspace on empty input
      removeChiefComplaint(treatmentForm.chiefComplaints.length - 1);
    }
  }

  function handleChiefComplaintInputChange(value: string) {
    setChiefComplaintInput(value);

    // Auto-filter suggestions based on input
    if (value.length > 0) {
      filterSuggestions("chiefComplaint", value);
      setShowSuggestions((prev) => ({
        ...prev,
        chiefComplaint: true,
      }));
    } else {
      setShowSuggestions((prev) => ({
        ...prev,
        chiefComplaint: false,
      }));
    }
  }

  function handleTreatmentFormChange(field: string, value: string) {
    setTreatmentForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-filter suggestions based on input
    if (value.length > 0) {
      filterSuggestions(field, value);
      setShowSuggestions((prev) => ({
        ...prev,
        [field]: true,
      }));
    } else {
      setShowSuggestions((prev) => ({
        ...prev,
        [field]: false,
      }));
    }
  }

  function filterSuggestions(field: string, input: string) {
    const lowerInput = input.toLowerCase();

    switch (field) {
      case "chiefComplaint":
        const filteredComplaints = suggestions.chiefComplaints.filter((item) =>
          item.toLowerCase().includes(lowerInput)
        );
        setFilteredSuggestions((prev) => ({
          ...prev,
          chiefComplaints: filteredComplaints,
        }));
        // Auto-select first suggestion
        setSelectedSuggestionIndex((prev) => ({
          ...prev,
          chiefComplaint: filteredComplaints.length > 0 ? 0 : -1,
        }));
        break;

      case "diagnosis":
        const filteredDiagnoses = suggestions.diagnoses.filter((item) => item.toLowerCase().includes(lowerInput));
        setFilteredSuggestions((prev) => ({
          ...prev,
          diagnoses: filteredDiagnoses,
        }));
        // Auto-select first suggestion
        setSelectedSuggestionIndex((prev) => ({
          ...prev,
          diagnosis: filteredDiagnoses.length > 0 ? 0 : -1,
        }));
        break;

      case "treatmentPlan":
        const filteredPlans = suggestions.treatmentPlans.filter((item) => item.toLowerCase().includes(lowerInput));
        setFilteredSuggestions((prev) => ({
          ...prev,
          treatmentPlans: filteredPlans,
        }));
        // Auto-select first suggestion
        setSelectedSuggestionIndex((prev) => ({
          ...prev,
          treatmentPlan: filteredPlans.length > 0 ? 0 : -1,
        }));
        break;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, field: string, groupIndex?: number, planIndex?: number) {
    if (!showSuggestions[field as keyof typeof showSuggestions]) return;

    let suggestions_array: string[] = [];
    let selectedIndex = -1;

    switch (true) {
      case field === "chiefComplaint":
        suggestions_array = filteredSuggestions.chiefComplaints;
        selectedIndex = selectedSuggestionIndex.chiefComplaint;
        break;
      case field.startsWith("diagnosis-"):
        suggestions_array = filteredSuggestions.diagnoses;
        selectedIndex = selectedSuggestionIndex.diagnosis;
        break;
      case field.startsWith("treatmentPlan-"):
        suggestions_array = filteredSuggestions.treatmentPlans;
        selectedIndex = selectedSuggestionIndex.treatmentPlan;
        break;
      case field.startsWith("medication-"):
        suggestions_array = filteredSuggestions.medications;
        selectedIndex = selectedSuggestionIndex.medication;
        break;
    }

    if (suggestions_array.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        const nextIndex = selectedIndex < suggestions_array.length - 1 ? selectedIndex + 1 : 0;
        updateSelectedIndex(field, nextIndex);
        break;

      case "ArrowUp":
        e.preventDefault();
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions_array.length - 1;
        updateSelectedIndex(field, prevIndex);
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions_array.length) {
          const selectedSuggestion = suggestions_array[selectedIndex];

          if (field.startsWith("medication-") && groupIndex !== undefined) {
            updateMedication(groupIndex, "name", selectedSuggestion);
            setShowSuggestions((prev) => ({
              ...prev,
              [field]: false,
            }));
          } else if (field.startsWith("diagnosis-") && groupIndex !== undefined) {
            updateDiagnosis(groupIndex, selectedSuggestion);
            setShowSuggestions((prev) => ({
              ...prev,
              [field]: false,
            }));
          } else if (field.startsWith("treatmentPlan-") && groupIndex !== undefined && planIndex !== undefined) {
            // Check for duplicates before adding via keyboard
            const isDuplicate = treatmentForm.diagnosisGroups[groupIndex].treatmentPlans.some(
              (existingPlan, idx) =>
                idx !== planIndex &&
                existingPlan.toLowerCase().trim() === selectedSuggestion.toLowerCase().trim() &&
                existingPlan.trim() !== ""
            );

            if (isDuplicate) {
              addToast(`Kế hoạch điều trị "${selectedSuggestion}" đã tồn tại trong chẩn đoán này!`, "error");
              return;
            }

            updateTreatmentPlan(groupIndex, planIndex, selectedSuggestion);
            setShowSuggestions((prev) => ({
              ...prev,
              [field]: false,
            }));
          } else {
            selectSuggestion(field, selectedSuggestion);
          }
        }
        break;

      case "Escape":
        setShowSuggestions((prev) => ({
          ...prev,
          [field]: false,
        }));
        break;
    }
  }

  function updateSelectedIndex(field: string, index: number) {
    if (field.startsWith("medication-")) {
      setSelectedSuggestionIndex((prev) => ({ ...prev, medication: index }));
    } else if (field.startsWith("diagnosis-")) {
      setSelectedSuggestionIndex((prev) => ({ ...prev, diagnosis: index }));
    } else if (field.startsWith("treatmentPlan-")) {
      setSelectedSuggestionIndex((prev) => ({ ...prev, treatmentPlan: index }));
    } else {
      setSelectedSuggestionIndex((prev) => ({ ...prev, [field]: index }));
    }
  }

  function addMedication() {
    setTreatmentForm((prev) => ({
      ...prev,
      medications: [...prev.medications, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }],
    }));
  }

  function updateMedication(index: number, field: "name" | "dosage" | "frequency" | "instructions", value: string) {
    setTreatmentForm((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) => (i === index ? { ...med, [field]: value } : med)),
    }));

    // Auto-filter medication suggestions when typing in name field
    if (field === "name" && value.length > 0) {
      const lowerInput = value.toLowerCase();
      const filteredMeds = suggestions.medications.filter((item) => item.toLowerCase().includes(lowerInput));
      setFilteredSuggestions((prev) => ({
        ...prev,
        medications: filteredMeds,
      }));
      // Auto-select first suggestion
      setSelectedSuggestionIndex((prev) => ({
        ...prev,
        medication: filteredMeds.length > 0 ? 0 : -1,
      }));
      setShowSuggestions((prev) => ({
        ...prev,
        [`medication-${index}`]: true,
      }));
    } else if (field === "name" && value.length === 0) {
      setShowSuggestions((prev) => ({
        ...prev,
        [`medication-${index}`]: false,
      }));
    }
  }

  function removeMedication(index: number) {
    setTreatmentForm((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  }

  function addDiagnosis() {
    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: [...prev.diagnosisGroups, { diagnosis: "", treatmentPlans: [""] }],
    }));
  }

  function updateDiagnosis(groupIndex: number, value: string) {
    const previousDiagnosis = treatmentForm.diagnosisGroups[groupIndex]?.diagnosis || "";

    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex ? { ...group, diagnosis: value } : group
      ),
    }));

    // Auto-add medications when diagnosis is complete or selected
    if (value.trim() && value !== previousDiagnosis && value.length >= 3) {
      // Check if this is a complete diagnosis from suggestions
      const isCompleteDiagnosis = suggestions.diagnoses.some((d) => d.toLowerCase() === value.toLowerCase());

      if (isCompleteDiagnosis) {
        // Add medications immediately for exact match
        autoAddMedicationsForDiagnosis(value);
      } else {
        // Debounce for partial matches to avoid too many calls
        setTimeout(() => {
          const currentValue = treatmentForm.diagnosisGroups[groupIndex]?.diagnosis;
          if (currentValue === value) {
            autoAddMedicationsForDiagnosis(value);
          }
        }, 1500);
      }
    }

    // Auto-filter diagnosis suggestions when typing
    if (value.length > 0) {
      const lowerInput = value.toLowerCase();
      const filteredDiagnoses = suggestions.diagnoses.filter((item) => item.toLowerCase().includes(lowerInput));
      setFilteredSuggestions((prev) => ({
        ...prev,
        diagnoses: filteredDiagnoses,
      }));
      setSelectedSuggestionIndex((prev) => ({
        ...prev,
        diagnosis: filteredDiagnoses.length > 0 ? 0 : -1,
      }));
      setShowSuggestions((prev) => ({
        ...prev,
        [`diagnosis-${groupIndex}`]: true,
      }));
    } else {
      setShowSuggestions((prev) => ({
        ...prev,
        [`diagnosis-${groupIndex}`]: false,
      }));
    }
  }

  function removeDiagnosis(groupIndex: number) {
    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.filter((_, i) => i !== groupIndex),
    }));
  }

  // Get treatment plans suitable for a specific diagnosis
  function getTreatmentPlansForDiagnosis(diagnosis: string): string[] {
    if (!diagnosis.trim()) return suggestions.treatmentPlans;

    // Find exact match first
    if (suggestions.diagnosisTreatmentMap[diagnosis]) {
      return suggestions.diagnosisTreatmentMap[diagnosis];
    }

    // Find partial match
    const normalizedDiagnosis = diagnosis.toLowerCase();
    for (const [key, plans] of Object.entries(suggestions.diagnosisTreatmentMap)) {
      if (key.toLowerCase().includes(normalizedDiagnosis) || normalizedDiagnosis.includes(key.toLowerCase())) {
        return plans;
      }
    }

    // Return all treatment plans if no match found
    return suggestions.treatmentPlans;
  }

  // Check if treatment plan already exists in the same diagnosis group
  function isTreatmentPlanDuplicate(groupIndex: number, newPlan: string): boolean {
    const group = treatmentForm.diagnosisGroups[groupIndex];
    if (!group) return false;

    const normalizedNewPlan = newPlan.toLowerCase().trim();
    return group.treatmentPlans.some(
      (existingPlan) => existingPlan.toLowerCase().trim() === normalizedNewPlan && existingPlan.trim() !== ""
    );
  }

  // Auto-add medications based on diagnosis
  function autoAddMedicationsForDiagnosis(diagnosis: string) {
    if (!diagnosis.trim()) return;

    // Find medications for this diagnosis
    let medicationsToAdd: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }> = [];

    // Find exact match first
    if (suggestions.diagnosisMedicationMap[diagnosis]) {
      medicationsToAdd = suggestions.diagnosisMedicationMap[diagnosis];
    } else {
      // Find partial match
      const normalizedDiagnosis = diagnosis.toLowerCase();
      for (const [key, meds] of Object.entries(suggestions.diagnosisMedicationMap)) {
        if (key.toLowerCase().includes(normalizedDiagnosis) || normalizedDiagnosis.includes(key.toLowerCase())) {
          medicationsToAdd = meds;
          break;
        }
      }
    }

    if (medicationsToAdd.length > 0) {
      setTreatmentForm((prev) => {
        // Check for duplicates before adding
        const existingMedNames = prev.medications.map((med) => med.name.toLowerCase().trim());
        const newMedications = medicationsToAdd.filter(
          (med) => !existingMedNames.includes(med.name.toLowerCase().trim())
        );

        if (newMedications.length > 0) {
          addToast(`Đã tự động thêm ${newMedications.length} thuốc phù hợp với chẩn đoán "${diagnosis}"`, "success");
          return {
            ...prev,
            medications: [...prev.medications, ...newMedications],
          };
        }
        return prev;
      });
    }
  }

  // Auto-add medications based on treatment plan
  function autoAddMedicationsForTreatment(treatmentPlan: string) {
    if (!treatmentPlan.trim()) return;

    // Find medications for this treatment plan
    let medicationsToAdd: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }> = [];

    // Find exact match first
    if (suggestions.treatmentMedicationMap[treatmentPlan]) {
      medicationsToAdd = suggestions.treatmentMedicationMap[treatmentPlan];
    } else {
      // Find partial match
      const normalizedTreatment = treatmentPlan.toLowerCase();
      for (const [key, meds] of Object.entries(suggestions.treatmentMedicationMap)) {
        if (key.toLowerCase().includes(normalizedTreatment) || normalizedTreatment.includes(key.toLowerCase())) {
          medicationsToAdd = meds;
          break;
        }
      }
    }

    if (medicationsToAdd.length > 0) {
      setTreatmentForm((prev) => {
        // Check for duplicates before adding
        const existingMedNames = prev.medications.map((med) => med.name.toLowerCase().trim());
        const newMedications = medicationsToAdd.filter(
          (med) => !existingMedNames.includes(med.name.toLowerCase().trim())
        );

        if (newMedications.length > 0) {
          addToast(`Đã tự động thêm ${newMedications.length} thuốc phù hợp với kế hoạch "${treatmentPlan}"`, "success");
          return {
            ...prev,
            medications: [...prev.medications, ...newMedications],
          };
        }
        return prev;
      });
    }
  }

  function addTreatmentPlan(groupIndex: number) {
    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex ? { ...group, treatmentPlans: [...group.treatmentPlans, ""] } : group
      ),
    }));
  }

  function updateTreatmentPlan(groupIndex: number, planIndex: number, value: string) {
    const previousPlan = treatmentForm.diagnosisGroups[groupIndex]?.treatmentPlans[planIndex] || "";

    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              treatmentPlans: group.treatmentPlans.map((plan, j) => (j === planIndex ? value : plan)),
            }
          : group
      ),
    }));

    // Auto-add medications when treatment plan is complete or selected
    if (value.trim() && value !== previousPlan && value.length >= 3) {
      // Check if this is a complete treatment plan from suggestions
      const isCompletePlan = suggestions.treatmentPlans.some((p) => p.toLowerCase() === value.toLowerCase());

      if (isCompletePlan) {
        // Add medications immediately for exact match
        autoAddMedicationsForTreatment(value);
      } else {
        // Debounce for partial matches
        setTimeout(() => {
          const currentValue = treatmentForm.diagnosisGroups[groupIndex]?.treatmentPlans[planIndex];
          if (currentValue === value) {
            autoAddMedicationsForTreatment(value);
          }
        }, 1500);
      }
    }

    // Auto-filter treatment plan suggestions when typing
    if (value.length > 0) {
      const currentGroup = treatmentForm.diagnosisGroups[groupIndex];
      const relevantPlans = getTreatmentPlansForDiagnosis(currentGroup.diagnosis);

      const lowerInput = value.toLowerCase();
      let filteredPlans = relevantPlans.filter((item) => item.toLowerCase().includes(lowerInput));

      // Remove plans that already exist in this diagnosis group (excluding current input)
      filteredPlans = filteredPlans.filter((plan) => {
        const isDuplicate = currentGroup.treatmentPlans.some(
          (existingPlan, idx) =>
            idx !== planIndex &&
            existingPlan.toLowerCase().trim() === plan.toLowerCase().trim() &&
            existingPlan.trim() !== ""
        );
        return !isDuplicate;
      });

      setFilteredSuggestions((prev) => ({
        ...prev,
        treatmentPlans: filteredPlans,
      }));
      setSelectedSuggestionIndex((prev) => ({
        ...prev,
        treatmentPlan: filteredPlans.length > 0 ? 0 : -1,
      }));
      setShowSuggestions((prev) => ({
        ...prev,
        [`treatmentPlan-${groupIndex}-${planIndex}`]: true,
      }));
    } else {
      setShowSuggestions((prev) => ({
        ...prev,
        [`treatmentPlan-${groupIndex}-${planIndex}`]: false,
      }));
    }
  }

  function removeTreatmentPlan(groupIndex: number, planIndex: number) {
    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              treatmentPlans: group.treatmentPlans.filter((_, j) => j !== planIndex),
            }
          : group
      ),
    }));
  }

  async function submitTreatment() {
    if (treatmentForm.chiefComplaints.length === 0) {
      return addToast("Vui lòng nhập ít nhất một lý do khám!", "error");
    }
    if (!treatmentForm.diagnosisGroups.some((group) => group.diagnosis.trim())) {
      return addToast("Vui lòng nhập chẩn đoán!", "error");
    }

    setIsSubmittingTreatment(true);

    try {
      let token = getAuthToken();

      console.log("Token from getAuthToken:", token ? "Token exists" : "No token found");
      console.log("Session object:", session);
      console.log("All localStorage keys:", Object.keys(localStorage));

      if (!token) {
        console.warn("No token found, attempting to save without authentication...");
        // Don't return here - try to save anyway
        // addToast('Vui lòng đăng nhập lại!', 'error');
        // return;
      }

      // Validate token format
      if (token && (token.length < 10 || token === "undefined" || token === "null")) {
        console.log("Invalid token format:", token);
        addToast("Token không hợp lệ. Vui lòng đăng nhập lại!", "error");
        return;
      }

      // Create medical record with comprehensive data structure
      const doctorId = validateObjectId(session?.user?._id || localStorage.getItem("userId"));
      const patientId = validateObjectId(
        currentTreatmentAppointment.patient._id || currentTreatmentAppointment.patient.id
      );
      const currentAppointmentId = validateObjectId(currentTreatmentAppointment._id || currentTreatmentAppointment.id);

      console.log("Creating medical record with IDs:", { doctorId, patientId, currentAppointmentId });

      const medicalRecordData = {
        patientId: patientId,
        appointmentId: currentAppointmentId,
        doctorId: doctorId,

        // Chief complaints - send both formats for compatibility
        chiefComplaint: treatmentForm.chiefComplaints.join(", "), // Single string for backward compatibility
        chiefComplaints: treatmentForm.chiefComplaints, // Array for new format

        // Additional examination fields
        presentIllness: treatmentForm.presentIllness,
        physicalExamination: treatmentForm.physicalExamination,

        // Diagnoses - send both formats
        diagnosis: treatmentForm.diagnosisGroups
          .filter((group) => group.diagnosis.trim() !== "")
          .map((group) => group.diagnosis)
          .join(", "), // Single string for backward compatibility
        diagnoses: treatmentForm.diagnosisGroups
          .filter((group) => group.diagnosis.trim() !== "")
          .map((group) => group.diagnosis), // Array for new format
        diagnosisGroups: treatmentForm.diagnosisGroups.filter((group) => group.diagnosis.trim() !== ""), // Full structure

        // Treatment plans - send both formats
        treatmentPlan: treatmentForm.diagnosisGroups
          .flatMap((group) => group.treatmentPlans)
          .filter((plan) => plan.trim() !== "")
          .join(", "), // Single string for backward compatibility
        treatmentPlans: treatmentForm.diagnosisGroups
          .flatMap((group) => group.treatmentPlans)
          .filter((plan) => plan.trim() !== ""), // Array for new format

        // Medications - send both formats
        medications: treatmentForm.medications.filter((med) => med.name.trim() !== "").map((med) => med.name), // Simple array of strings for compatibility
        detailedMedications: treatmentForm.medications.filter((med) => med.name.trim() !== ""), // Full objects with dosage, frequency etc.

        notes: treatmentForm.notes,
        recordDate: new Date().toISOString(),
      };

      console.log("Sending medical record data:", medicalRecordData);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const medicalRecordResponse = await fetch("/api/medical-records", {
        method: "POST",
        headers,
        body: JSON.stringify(medicalRecordData),
      });

      console.log("Medical record response status:", medicalRecordResponse.status);

      if (!medicalRecordResponse.ok) {
        const errorText = await medicalRecordResponse.text();
        console.error("Medical record API error:", errorText);

        if (medicalRecordResponse.status === 401) {
          addToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!", "error");
          // Clear invalid tokens
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("jwt");
          return;
        }

        throw new Error(`Failed to create medical record: ${medicalRecordResponse.status} - ${errorText}`);
      }

      const medicalRecordResult = await medicalRecordResponse.json();
      console.log("Medical record created successfully:", medicalRecordResult);

      // Create prescription if there are medications
      const hasMedications = treatmentForm.medications.some((med) => med.name.trim() !== "");
      if (hasMedications) {
        try {
          const prescriptionData = {
            patientId: patientId,
            doctorId: doctorId,
            medicalRecordId: medicalRecordResult.data?._id || medicalRecordResult._id,
            prescriptionDate: new Date(),
            diagnosis: treatmentForm.diagnosisGroups
              .filter((group) => group.diagnosis.trim() !== "")
              .map((group) => group.diagnosis)
              .join(", "),
            medications: treatmentForm.medications
              .filter((med) => med.name.trim() !== "")
              .map((med) => ({
                name: med.name,
                dosage: med.dosage || "Theo chỉ định",
                frequency: med.frequency || "Theo chỉ định",
                duration: med.duration || "Theo chỉ định",
                instructions: med.instructions || "Sử dụng theo hướng dẫn của bác sĩ",
                quantity: 1, // Default quantity
                unit: "viên", // Default unit
              })),
            instructions: "Sử dụng theo đúng chỉ dẫn của bác sĩ",
            notes: treatmentForm.notes || "",
            isFollowUpRequired: false,
          };

          console.log("Creating prescription:", prescriptionData);

          const prescriptionResponse = await fetch("/api/prescriptions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(prescriptionData),
          });

          if (prescriptionResponse.ok) {
            const prescriptionResult = await prescriptionResponse.json();
            console.log("Prescription created successfully:", prescriptionResult);
            addToast("Đã tạo đơn thuốc thành công!", "success");
          } else {
            console.warn("Failed to create prescription:", prescriptionResponse.status);
            const errorText = await prescriptionResponse.text();
            console.error("Prescription error:", errorText);
            addToast("Tạo đơn thuốc thất bại, nhưng hồ sơ đã được lưu", "error");
          }
        } catch (error) {
          console.error("Error creating prescription:", error);
          addToast("Lỗi khi tạo đơn thuốc, nhưng hồ sơ đã được lưu", "error");
        }
      }

      // Update appointment status to completed
      const currentAppointmentIdForUpdate = currentTreatmentAppointment._id || currentTreatmentAppointment.id;
      const appointmentUpdateResponse = await fetch(`/api/appointments/${currentAppointmentIdForUpdate}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!appointmentUpdateResponse.ok) {
        console.warn("Failed to update appointment status");
      }

      addToast("Đã lưu hồ sơ khám bệnh thành công!", "success");
      closeTreatmentModal();

      // Refresh appointments
      const updatedAppointments = appointments.map((appt) =>
        (appt._id || appt.id) === currentAppointmentId ? { ...appt, status: "completed" } : appt
      );
      setAppointments(updatedAppointments);
    } catch (error) {
      console.error("Error creating medical record:", error);
      let errorMessage = "Có lỗi xảy ra khi lưu hồ sơ!";

      if (error instanceof Error) {
        if (error.message.includes("401")) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!";
        } else if (error.message.includes("400")) {
          errorMessage = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin!";
        } else if (error.message.includes("500")) {
          errorMessage = "Lỗi server. Vui lòng thử lại sau!";
        } else {
          errorMessage = `Lỗi: ${error.message}`;
        }
      }

      addToast(errorMessage, "error");
    } finally {
      setIsSubmittingTreatment(false);
    }
  }

  function viewRecord(patient: any) {
    const pid = patient?._id || patient?.id || patient;
    if (!pid) return addToast("Không tìm thấy hồ sơ bệnh nhân", "error");
    router.push(`/doctor/patients/${pid}`);
  }

  function confirmAndCancel(id: string) {
    if (!confirm("Bạn có chắc muốn hủy lịch này không?")) return;
    updateStatus(id, "cancel");
  }

  // filters
  const visibleAppointments = appointments.filter((a) => {
    const s = normalizeStatus(a?.status);
    if (statusFilter !== "all" && s !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = (a.patient?.fullName || a.patient || "").toString().toLowerCase();
      const phone = (a.patient?.phone || a.phone || "").toString().toLowerCase();
      return name.includes(q) || phone.includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="healthcare-heading text-3xl">Lịch khám</h1>
                <p className="healthcare-body mt-1">Quản lý lịch khám và cuộc hẹn</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 rounded-md ${
                  selectedView === "day" ? "btn-healthcare-primary" : "btn-healthcare-secondary"
                }`}
                onClick={() => setSelectedView("day")}
              >
                Ngày
              </button>
              <button
                className={`px-4 py-2 rounded-md ${
                  selectedView === "week" ? "btn-healthcare-primary" : "btn-healthcare-secondary"
                }`}
                onClick={() => setSelectedView("week")}
              >
                Tuần
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{new Date(selectedDate).toLocaleDateString()}</h2>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                placeholder="Tìm tên hoặc số điện thoại"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ khám</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="in-progress">Đang khám</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <div className="p-3 bg-[var(--color-surface)] rounded-[var(--radius-md)] shadow-sm text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
                  {appointments.length}
                </p>
                <p className="text-sm text-[var(--color-muted)]">Tổng lịch hẹn</p>
              </div>
            </div>
            <div>
              <div className="p-3 bg-[var(--color-surface)] rounded-[var(--radius-md)] shadow-sm text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>
                  {statusCounts["completed"] || 0}
                </p>
                <p className="text-sm text-[var(--color-muted)]">Hoàn thành</p>
              </div>
            </div>
            <div>
              <div className="p-3 bg-[var(--color-surface)] rounded-[var(--radius-md)] shadow-sm text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                  {statusCounts["in-progress"] || 0}
                </p>
                <p className="text-sm text-[var(--color-muted)]">Đang khám</p>
              </div>
            </div>
            <div>
              <div className="p-3 bg-[var(--color-surface)] rounded-[var(--radius-md)] shadow-sm text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>
                  {statusCounts["pending"] || 0}
                </p>
                <p className="text-sm text-[var(--color-muted)]">Chờ khám</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Lịch theo giờ</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {timeSlots.map((time) => {
                  const appointment = visibleAppointments.find(
                    (apt: any) => apt.startTime?.startsWith(time) || apt.time === time
                  );
                  const apptStatus = appointment ? normalizeStatus(appointment.status) : "";
                  return (
                    <div key={time} className="flex items-center min-h-[50px] border-b border-gray-100">
                      <div className="w-16 text-sm text-gray-500 font-mono">{time}</div>
                      <div className="flex-1 ml-4">
                        {appointment ? (
                          <div
                            className={`p-2 rounded`}
                            style={
                              apptStatus === "confirmed"
                                ? { background: "var(--color-primary-50)", borderLeft: "3px solid var(--color-primary)" }
                                : apptStatus === "in-progress"
                                ? { background: "var(--color-success-light)", borderLeft: "3px solid var(--color-success)" }
                                : { background: "var(--color-warning-light)", borderLeft: "3px solid var(--color-warning)" }
                            }
                          >
                            <p className="font-medium text-sm">
                              {appointment.patient?.fullName || appointment.patient}
                            </p>
                            <p className="text-xs text-gray-600">{appointment.appointmentType || appointment.type}</p>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">Trống</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Chi tiết cuộc hẹn</h3>
              <div className="space-y-3">
                {visibleAppointments.length === 0 && <p className="text-sm text-gray-500">Không có lịch hẹn.</p>}
                {visibleAppointments.map((appointment: any) => {
                  const apptStatus = normalizeStatus(appointment.status);
                  const id = appointment._id || appointment.id;
                  return (
                    <div key={id} className="healthcare-card p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{appointment.patient?.fullName || appointment.patient}</h4>
                          <p className="text-sm text-gray-600">{appointment.appointmentType || appointment.type}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs`}
                          style={
                            apptStatus === "confirmed"
                              ? { background: "var(--color-primary-50)", color: "var(--color-primary-contrast)", border: "1px solid var(--color-border)" }
                              : apptStatus === "in-progress"
                              ? { background: "var(--color-success-light)", color: "var(--color-primary-contrast)", border: "1px solid var(--color-border)" }
                              : { background: "var(--color-warning-light)", color: "var(--color-primary-contrast)", border: "1px solid var(--color-border)" }
                          }
                        >
                          {statusLabelMap[apptStatus] || (appointment.status && appointment.status.toString())}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <Clock className="inline w-4 h-4 mr-1" />
                          {appointment.startTime || appointment.time} (
                          {appointment.duration || appointment.durationMinutes || 30} phút)
                        </p>
                        <p>
                          <Phone className="inline w-4 h-4 mr-1" />
                          {appointment.patient?.phone || appointment.phone || "—"}
                        </p>
                        {appointment.notes && (
                          <p>
                            <Edit className="inline w-4 h-4 mr-1" />
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => viewRecord(appointment.patient)} className="text-primary text-sm">
                          <User className="inline w-4 h-4 mr-1" style={{ color: "var(--color-primary)" }} />
                          Xem hồ sơ
                        </button>
                        {apptStatus !== "in-progress" && apptStatus !== "completed" && (
                          <button
                            disabled={!!apptLoading[id]}
                            onClick={() => updateStatus(id, "confirm")}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            {apptLoading[id] ? "..." : "✅ Xác nhận"}
                          </button>
                        )}
                        {apptStatus === "completed" ? (
                          <button
                            disabled={!!apptLoading[id]}
                            onClick={() => startTreatment(appointment)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                          >
                            {apptLoading[id] ? (
                              "..."
                            ) : (
                              <>
                                <Edit className="inline w-4 h-4 mr-1" />
                                Xem lại điều trị
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled={!!apptLoading[id]}
                            onClick={() => startTreatment(appointment)}
                            className="text-purple-600 hover:text-purple-800 text-sm"
                          >
                            {apptLoading[id] ? (
                              "..."
                            ) : (
                              <>
                                <Hospital className="inline w-4 h-4 mr-1" />
                                Điều trị
                              </>
                            )}
                          </button>
                        )}
                        {apptStatus !== "completed" && (
                          <>
                            <button
                              disabled={!!apptLoading[id]}
                              onClick={() => confirmAndCancel(id)}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                              {apptLoading[id] ? (
                                "..."
                              ) : (
                                <>
                                  <X className="inline w-4 h-4 mr-1" />
                                  Hủy
                                </>
                              )}
                            </button>
                            <button
                              disabled={!!apptLoading[id]}
                              onClick={() => rescheduleAppointment(id)}
                              className="text-yellow-600 hover:text-yellow-800 text-sm"
                            >
                              <Calendar className="inline w-4 h-4 mr-1" />
                              Đổi lịch
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* toasts */}
          <div className="fixed right-4 bottom-4 space-y-2 z-50">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`px-4 py-2 rounded shadow ${
                  t.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {t.text}
              </div>
            ))}
          </div>
          {/* Reschedule Modal */}
          {rescheduleOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg w-full max-w-3xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Đổi lịch cuộc hẹn</h3>
                  <button onClick={closeReschedule} className="text-gray-600">
                    Đóng
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm text-gray-600 mb-2">Chọn ngày</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="border p-2 rounded w-full"
                    />
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">Chọn khung giờ (nhấn hoặc kéo thả)</p>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => {
                        const occupied = visibleAppointments.some(
                          (apt: any) =>
                            (apt.appointmentDate || apt.date) &&
                            new Date(apt.appointmentDate || apt.date).toISOString().slice(0, 10) === rescheduleDate &&
                            ((apt.startTime && apt.startTime.startsWith(time)) || apt.time === time)
                        );
                        return (
                          <div
                            key={time}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleSlotDrop(e, time)}
                            onClick={() => handleSlotClick(time)}
                            className={`p-3 rounded border cursor-pointer text-center ${
                              rescheduleSlot === time
                                ? "bg-primary-100"
                                : occupied
                                ? "bg-gray-100 text-gray-400"
                                : "bg-white"
                            }`}
                            style={rescheduleSlot === time ? { borderColor: "var(--color-primary-600)" } : undefined}
                          >
                            <div className="text-sm font-mono">{time}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <button onClick={closeReschedule} className="px-4 py-2 border rounded">
                    Hủy
                  </button>
                  <button
                    disabled={!rescheduleSlot}
                    onClick={confirmReschedule}
                    className="px-4 py-2 text-white rounded disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Treatment Modal */}
          {treatmentModalOpen && currentTreatmentAppointment && (
            <div className="fixed inset-0 bg-opacity-15 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-300">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">Thăm khám và điều trị</h3>
                      <p className="text-gray-600">
                        Bệnh nhân: {currentTreatmentAppointment.patient?.fullName || "N/A"}
                      </p>
                    </div>
                    <button onClick={closeTreatmentModal} className="text-gray-600 hover:text-gray-800">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Patient Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Thông tin bệnh nhân</h4>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Họ tên:</span> {currentTreatmentAppointment.patient?.fullName}
                        </p>
                        <p>
                          <span className="font-medium">Điện thoại:</span> {currentTreatmentAppointment.patient?.phone}
                        </p>
                        <p>
                          <span className="font-medium">Email:</span> {currentTreatmentAppointment.patient?.email}
                        </p>
                        <p>
                          <span className="font-medium">Ngày khám:</span>{" "}
                          {new Date(currentTreatmentAppointment.appointmentDate).toLocaleDateString("vi-VN")}
                        </p>
                        <p>
                          <span className="font-medium">Giờ khám:</span> {currentTreatmentAppointment.startTime}
                        </p>
                      </div>
                    </div>

                    {/* Treatment Form */}
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium">
                            Lý do khám <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => toggleSuggestions("chiefComplaint")}
                            className="text-xs hover:opacity-80 transition-opacity"
                            style={{ color: "var(--color-primary)" }}
                          >
                            💡 Gợi ý
                          </button>
                        </div>

                        {/* Chief Complaints Tags Display */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {treatmentForm.chiefComplaints.map((complaint, index) => (
                            <span
                              key={`complaint-${index}-${complaint}`}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 border"
                              style={{
                                color: "var(--color-primary)",
                                borderColor: "var(--color-primary)",
                              }}
                            >
                              {complaint}
                              <button
                                type="button"
                                onClick={() => removeChiefComplaint(index)}
                                className="ml-2 focus:outline-none hover:opacity-80 transition-opacity"
                                style={{ color: "var(--color-primary)" }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Input for new chief complaints */}
                        <input
                          type="text"
                          value={chiefComplaintInput}
                          onChange={(e) => handleChiefComplaintInputChange(e.target.value)}
                          onKeyDown={handleChiefComplaintKeyDown}
                          className="w-full border border-gray-300 rounded-md p-2"
                          placeholder={
                            treatmentForm.chiefComplaints.length === 0
                              ? "Nhập lý do khám và nhấn Enter hoặc dấu phẩy..."
                              : "Thêm lý do khám khác..."
                          }
                        />
                        {showSuggestions.chiefComplaint && filteredSuggestions.chiefComplaints.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                            {filteredSuggestions.chiefComplaints.map((suggestion, index) => (
                              <div
                                key={`chief-suggestion-${index}-${suggestion}`}
                                onClick={() => selectSuggestion("chiefComplaint", suggestion)}
                                className={`px-3 py-2 cursor-pointer text-sm ${
                                  index === selectedSuggestionIndex.chiefComplaint
                                    ? "bg-blue-100 text-blue-800"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis Groups - Full Width */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">
                        Chẩn đoán & Kế hoạch điều trị <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={addDiagnosis}
                        className="text-sm hover:opacity-80 transition-opacity"
                        style={{ color: "var(--color-primary)" }}
                      >
                        + Thêm chẩn đoán
                      </button>
                    </div>
                    <div className="space-y-4">
                      {treatmentForm.diagnosisGroups.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left Column - Diagnosis */}
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Chẩn đoán {groupIndex + 1}
                                </label>
                                {treatmentForm.diagnosisGroups.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDiagnosis(groupIndex)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    ✕ Xóa
                                  </button>
                                )}
                              </div>
                              <div className="flex gap-2 items-start">
                                <div className="flex-1 relative">
                                  <input
                                    type="text"
                                    value={group.diagnosis}
                                    onChange={(e) => updateDiagnosis(groupIndex, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, `diagnosis-${groupIndex}`, groupIndex)}
                                    className="w-full border border-gray-300 rounded-md p-2 text-sm font-medium"
                                    placeholder={`Nhập chẩn đoán ${groupIndex + 1}`}
                                  />
                                  {showSuggestions[`diagnosis-${groupIndex}` as keyof typeof showSuggestions] &&
                                    filteredSuggestions.diagnoses.length > 0 && (
                                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                                        {filteredSuggestions.diagnoses.map((suggestion, suggIndex) => (
                                          <div
                                            key={`diagnosis-${groupIndex}-${suggIndex}`}
                                            onClick={() => {
                                              updateDiagnosis(groupIndex, suggestion);
                                              setShowSuggestions((prev) => ({
                                                ...prev,
                                                [`diagnosis-${groupIndex}`]: false,
                                              }));
                                            }}
                                            className={`px-3 py-2 cursor-pointer text-sm ${
                                              suggIndex === selectedSuggestionIndex.diagnosis
                                                ? "bg-blue-100"
                                                : "hover:bg-gray-100"
                                            }`}
                                            style={
                                              suggIndex === selectedSuggestionIndex.diagnosis
                                                ? { color: "var(--color-primary)" }
                                                : {}
                                            }
                                          >
                                            {suggestion}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fieldKey = `diagnosis-${groupIndex}`;
                                    const isShowing = showSuggestions[fieldKey as keyof typeof showSuggestions];

                                    if (!isShowing) {
                                      setFilteredSuggestions((prev) => ({
                                        ...prev,
                                        diagnoses: suggestions.diagnoses,
                                      }));
                                      setSelectedSuggestionIndex((prev) => ({
                                        ...prev,
                                        diagnosis: suggestions.diagnoses.length > 0 ? 0 : -1,
                                      }));
                                    }

                                    setShowSuggestions((prev) => ({
                                      ...prev,
                                      [fieldKey]: !isShowing,
                                    }));
                                  }}
                                  className="text-xs px-2 mt-1 hover:opacity-80 transition-opacity"
                                  style={{ color: "var(--color-primary)" }}
                                >
                                  💡
                                </button>
                              </div>
                            </div>

                            {/* Right Column - Treatment Plans */}
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Kế hoạch điều trị</label>
                                  {group.diagnosis && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      💡 Gợi ý phù hợp cho "{group.diagnosis}"
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addTreatmentPlan(groupIndex)}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  + Thêm kế hoạch
                                </button>
                              </div>
                              <div className="space-y-2">
                                {group.treatmentPlans.map((plan, planIndex) => (
                                  <div key={planIndex} className="flex gap-2">
                                    <div className="flex-1 relative">
                                      <input
                                        type="text"
                                        value={plan}
                                        onChange={(e) => updateTreatmentPlan(groupIndex, planIndex, e.target.value)}
                                        onKeyDown={(e) =>
                                          handleKeyDown(
                                            e,
                                            `treatmentPlan-${groupIndex}-${planIndex}`,
                                            groupIndex,
                                            planIndex
                                          )
                                        }
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                        placeholder={`Kế hoạch ${planIndex + 1}`}
                                      />
                                      {showSuggestions[
                                        `treatmentPlan-${groupIndex}-${planIndex}` as keyof typeof showSuggestions
                                      ] &&
                                        filteredSuggestions.treatmentPlans.length > 0 && (
                                          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                                            {filteredSuggestions.treatmentPlans.map((suggestion, suggIndex) => (
                                              <div
                                                key={`treatment-${groupIndex}-${planIndex}-${suggIndex}`}
                                                onClick={() => {
                                                  // Check for duplicates before adding
                                                  const isDuplicate = treatmentForm.diagnosisGroups[
                                                    groupIndex
                                                  ].treatmentPlans.some(
                                                    (existingPlan, idx) =>
                                                      idx !== planIndex &&
                                                      existingPlan.toLowerCase().trim() ===
                                                        suggestion.toLowerCase().trim() &&
                                                      existingPlan.trim() !== ""
                                                  );

                                                  if (isDuplicate) {
                                                    addToast(
                                                      `Kế hoạch điều trị "${suggestion}" đã tồn tại trong chẩn đoán này!`,
                                                      "error"
                                                    );
                                                    return;
                                                  }

                                                  updateTreatmentPlan(groupIndex, planIndex, suggestion);
                                                  setShowSuggestions((prev) => ({
                                                    ...prev,
                                                    [`treatmentPlan-${groupIndex}-${planIndex}`]: false,
                                                  }));
                                                }}
                                                className={`px-3 py-2 cursor-pointer text-sm ${
                                                  suggIndex === selectedSuggestionIndex.treatmentPlan
                                                    ? "bg-blue-100"
                                                    : "hover:bg-gray-100"
                                                }`}
                                                style={
                                                  suggIndex === selectedSuggestionIndex.treatmentPlan
                                                    ? { color: "var(--color-primary)" }
                                                    : {}
                                                }
                                              >
                                                {suggestion}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const fieldKey = `treatmentPlan-${groupIndex}-${planIndex}`;
                                        const isShowing = showSuggestions[fieldKey as keyof typeof showSuggestions];

                                        if (!isShowing) {
                                          // Get relevant treatment plans for this diagnosis
                                          const currentGroup = treatmentForm.diagnosisGroups[groupIndex];
                                          const relevantPlans = getTreatmentPlansForDiagnosis(currentGroup.diagnosis);

                                          // Filter out duplicates in current diagnosis group
                                          const availablePlans = relevantPlans.filter((plan) => {
                                            return !isTreatmentPlanDuplicate(groupIndex, plan);
                                          });

                                          setFilteredSuggestions((prev) => ({
                                            ...prev,
                                            treatmentPlans: availablePlans,
                                          }));
                                          setSelectedSuggestionIndex((prev) => ({
                                            ...prev,
                                            treatmentPlan: availablePlans.length > 0 ? 0 : -1,
                                          }));
                                        }

                                        setShowSuggestions((prev) => ({
                                          ...prev,
                                          [fieldKey]: !isShowing,
                                        }));
                                      }}
                                      className="text-xs px-2 hover:opacity-80 transition-opacity"
                                      style={{ color: "var(--color-primary)" }}
                                    >
                                      💡
                                    </button>
                                    {group.treatmentPlans.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeTreatmentPlan(groupIndex, planIndex)}
                                        className="text-red-600 hover:text-red-800 px-2"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6"></div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Khám lâm sàng</label>
                      <textarea
                        value={treatmentForm.physicalExamination}
                        onChange={(e) => handleTreatmentFormChange("physicalExamination", e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 h-20"
                        placeholder="Mô tả kết quả khám lâm sàng..."
                      />
                    </div>

                    {/* Medications */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <label className="block text-sm font-medium">Đơn thuốc</label>
                          <p className="text-xs text-gray-500 mt-1">💊 Thuốc sẽ được tự động thêm dựa trên chẩn đoán</p>
                        </div>
                        <button type="button" onClick={addMedication} className="text-primary text-sm">
                          + Thêm thuốc
                        </button>
                      </div>
                      <div className="space-y-3">
                        {treatmentForm.medications.map((medication, index) => (
                          <div
                            key={`medication-${index}-${medication.name || "empty"}`}
                            className="border border-gray-200 rounded-md p-3 relative"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="relative">
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={medication.name}
                                    onChange={(e) => updateMedication(index, "name", e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, `medication-${index}`, index)}
                                    className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                                    placeholder="Tên thuốc"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fieldKey = `medication-${index}`;
                                      const isShowing = showSuggestions[fieldKey as keyof typeof showSuggestions];

                                      if (!isShowing) {
                                        setFilteredSuggestions((prev) => ({
                                          ...prev,
                                          medications: suggestions.medications,
                                        }));
                                        // Auto-select first suggestion
                                        setSelectedSuggestionIndex((prev) => ({
                                          ...prev,
                                          medication: suggestions.medications.length > 0 ? 0 : -1,
                                        }));
                                      }

                                      setShowSuggestions((prev) => ({
                                        ...prev,
                                        [fieldKey]: !isShowing,
                                      }));
                                    }}
                                    className="text-primary text-xs px-2"
                                  >
                                    💡
                                  </button>
                                </div>
                                {showSuggestions[`medication-${index}` as keyof typeof showSuggestions] &&
                                  filteredSuggestions.medications.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                                      {filteredSuggestions.medications.map((suggestion, suggIndex) => (
                                        <div
                                          key={`medication-${index}-${suggIndex}`}
                                          onClick={() => {
                                            updateMedication(index, "name", suggestion);
                                            setShowSuggestions((prev) => ({
                                              ...prev,
                                              [`medication-${index}`]: false,
                                            }));
                                          }}
                                          className={`px-3 py-2 cursor-pointer text-sm ${
                                            suggIndex === selectedSuggestionIndex.medication
                                              ? "bg-primary-100 text-primary-contrast"
                                              : "hover:bg-gray-100"
                                          }`}
                                        >
                                          {suggestion}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={medication.dosage}
                                  onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                  placeholder="Liều dùng"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={medication.frequency}
                                  onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                                  placeholder="Tần suất"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeMedication(index)}
                                  className="text-red-600 hover:text-red-800 px-2"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <input
                                type="text"
                                value={medication.instructions}
                                onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                placeholder="Hướng dẫn sử dụng"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Ghi chú</label>
                      <textarea
                        value={treatmentForm.notes}
                        onChange={(e) => handleTreatmentFormChange("notes", e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 h-20"
                        placeholder="Ghi chú thêm..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={closeTreatmentModal}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={submitTreatment}
                      disabled={isSubmittingTreatment}
                      className={"px-6 py-2 btn-primary-filled rounded-md"}
                      style={isSubmittingTreatment ? { opacity: 0.6, pointerEvents: "none" } : undefined}
                    >
                      {isSubmittingTreatment ? "Đang lưu..." : "Lưu hồ sơ"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
