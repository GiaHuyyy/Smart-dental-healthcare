"use client";

import { Lightbulb, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Types
interface MedicationForm {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface DiagnosisGroup {
  diagnosis: string;
  treatmentPlans: string[];
}

interface TreatmentFormData {
  chiefComplaints: string[];
  presentIllness: string;
  physicalExamination: string;
  diagnosisGroups: DiagnosisGroup[];
  notes: string;
  medications: MedicationForm[];
  status?: string; // Add status field for update mode
}

interface Suggestions {
  chiefComplaints: string[];
  diagnoses: string[];
  treatmentPlans: string[];
  medications: string[];
  diagnosisTreatmentMap: Record<string, string[]>;
  diagnosisMedicationMap: Record<string, MedicationForm[]>;
  treatmentMedicationMap: Record<string, MedicationForm[]>;
}

interface Appointment {
  _id?: string;
  id: string;
  patientId?: string | { _id: string };
  patientName: string;
  patientAvatar?: string;
  date: string;
  startTime: string;
  phone?: string;
  email?: string;
}

interface TreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSubmit: (formData: TreatmentFormData) => Promise<void>;
  isSubmitting: boolean;
  accessToken?: string;
  mode?: "create" | "update"; // Add mode prop
  initialData?: Partial<TreatmentFormData>; // Add initial data for edit mode
}

export default function TreatmentModal({
  isOpen,
  onClose,
  appointment,
  onSubmit,
  isSubmitting,
  accessToken,
  mode = "create", // Default to create mode
  initialData, // Initial data for update mode
}: TreatmentModalProps) {
  const [treatmentForm, setTreatmentForm] = useState<TreatmentFormData>({
    chiefComplaints: initialData?.chiefComplaints || [],
    presentIllness: initialData?.presentIllness || "",
    physicalExamination: initialData?.physicalExamination || "",
    diagnosisGroups: initialData?.diagnosisGroups || [{ diagnosis: "", treatmentPlans: [""] }],
    notes: initialData?.notes || "",
    medications: initialData?.medications || [],
    status: initialData?.status || "active", // Default to active
  });

  const [chiefComplaintInput, setChiefComplaintInput] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestions>({
    chiefComplaints: [],
    diagnoses: [],
    treatmentPlans: [],
    medications: [],
    diagnosisTreatmentMap: {},
    diagnosisMedicationMap: {},
    treatmentMedicationMap: {},
  });

  const [showSuggestions, setShowSuggestions] = useState({
    chiefComplaint: false,
    diagnosis: {} as Record<number, boolean>,
    treatmentPlan: {} as Record<string, boolean>,
    medication: {} as Record<number, boolean>,
  });

  const [filteredSuggestions, setFilteredSuggestions] = useState({
    chiefComplaints: [] as string[],
    diagnoses: {} as Record<number, string[]>,
    treatmentPlans: {} as Record<string, string[]>,
    medications: {} as Record<number, string[]>,
  });

  // Fetch suggestions from server
  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/v1/ai-chat/suggestions`,
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      // Load initial data if in update mode
      if (mode === "update" && initialData) {
        setTreatmentForm({
          chiefComplaints: initialData.chiefComplaints || [],
          presentIllness: initialData.presentIllness || "",
          physicalExamination: initialData.physicalExamination || "",
          diagnosisGroups: initialData.diagnosisGroups || [{ diagnosis: "", treatmentPlans: [""] }],
          notes: initialData.notes || "",
          medications: initialData.medications || [],
          status: initialData.status || "active", // Load status
        });
      }
    }
  }, [isOpen, fetchSuggestions, mode, initialData]);

  // Chief complaints management
  const addChiefComplaint = (complaint: string) => {
    const trimmed = complaint.trim();
    if (trimmed && !treatmentForm.chiefComplaints.includes(trimmed)) {
      setTreatmentForm((prev) => ({
        ...prev,
        chiefComplaints: [...prev.chiefComplaints, trimmed],
      }));
      // Auto-generate medications based on chief complaint
      autoGenerateMedicationsFromComplaint(trimmed);
    }
    setChiefComplaintInput("");
  };

  const removeChiefComplaint = (index: number) => {
    setTreatmentForm((prev) => ({
      ...prev,
      chiefComplaints: prev.chiefComplaints.filter((_, i) => i !== index),
    }));
  };

  const handleChiefComplaintKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (chiefComplaintInput.trim()) {
        addChiefComplaint(chiefComplaintInput);
      }
    } else if (e.key === "Tab" && filteredSuggestions.chiefComplaints.length > 0 && chiefComplaintInput.trim()) {
      e.preventDefault();
      selectChiefComplaintSuggestion(filteredSuggestions.chiefComplaints[0]);
    } else if (e.key === "Backspace" && !chiefComplaintInput && treatmentForm.chiefComplaints.length > 0) {
      removeChiefComplaint(treatmentForm.chiefComplaints.length - 1);
    }
  };

  const handleChiefComplaintInputChange = (value: string) => {
    setChiefComplaintInput(value);
    // Filter suggestions
    if (value.length > 0) {
      const filtered = suggestions.chiefComplaints.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
      setFilteredSuggestions((prev) => ({ ...prev, chiefComplaints: filtered }));
      // Auto show suggestions when typing
      setShowSuggestions((prev) => ({ ...prev, chiefComplaint: true }));
    } else {
      setFilteredSuggestions((prev) => ({ ...prev, chiefComplaints: suggestions.chiefComplaints }));
      setShowSuggestions((prev) => ({ ...prev, chiefComplaint: false }));
    }
  };

  const toggleChiefComplaintSuggestions = () => {
    const isShowing = showSuggestions.chiefComplaint;
    if (!isShowing) {
      setFilteredSuggestions((prev) => ({ ...prev, chiefComplaints: suggestions.chiefComplaints }));
    }
    setShowSuggestions((prev) => ({ ...prev, chiefComplaint: !isShowing }));
  };

  const selectChiefComplaintSuggestion = (value: string) => {
    addChiefComplaint(value);
    setShowSuggestions((prev) => ({ ...prev, chiefComplaint: false }));
  };

  // Auto-generate medications from chief complaint
  const autoGenerateMedicationsFromComplaint = (complaint: string) => {
    // This will be enhanced when diagnosis is selected
    console.log("Chief complaint selected:", complaint);
  };

  // Diagnosis management
  const addDiagnosis = () => {
    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: [...prev.diagnosisGroups, { diagnosis: "", treatmentPlans: [""] }],
    }));
  };

  const updateDiagnosis = (groupIndex: number, value: string) => {
    const previousDiagnosis = treatmentForm.diagnosisGroups[groupIndex]?.diagnosis || "";

    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex ? { ...group, diagnosis: value } : group
      ),
    }));

    // Auto-add medications when diagnosis is selected
    if (value.trim() && value !== previousDiagnosis && value.length >= 3) {
      autoAddMedicationsForDiagnosis(value);
    }

    // Filter suggestions
    if (value.length > 0) {
      const filtered = suggestions.diagnoses.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
      setFilteredSuggestions((prev) => ({
        ...prev,
        diagnoses: { ...prev.diagnoses, [groupIndex]: filtered },
      }));
      // Auto show suggestions when typing
      setShowSuggestions((prev) => ({
        ...prev,
        diagnosis: { ...prev.diagnosis, [groupIndex]: true },
      }));
    } else {
      setFilteredSuggestions((prev) => ({
        ...prev,
        diagnoses: { ...prev.diagnoses, [groupIndex]: suggestions.diagnoses },
      }));
      setShowSuggestions((prev) => ({
        ...prev,
        diagnosis: { ...prev.diagnosis, [groupIndex]: false },
      }));
    }
  };

  const removeDiagnosis = (groupIndex: number) => {
    if (treatmentForm.diagnosisGroups.length > 1) {
      setTreatmentForm((prev) => ({
        ...prev,
        diagnosisGroups: prev.diagnosisGroups.filter((_, i) => i !== groupIndex),
      }));
    }
  };

  const toggleDiagnosisSuggestions = (groupIndex: number) => {
    const isShowing = showSuggestions.diagnosis[groupIndex] || false;
    if (!isShowing) {
      setFilteredSuggestions((prev) => ({
        ...prev,
        diagnoses: { ...prev.diagnoses, [groupIndex]: suggestions.diagnoses },
      }));
    }
    setShowSuggestions((prev) => ({
      ...prev,
      diagnosis: { ...prev.diagnosis, [groupIndex]: !isShowing },
    }));
  };

  const selectDiagnosisSuggestion = (groupIndex: number, value: string) => {
    updateDiagnosis(groupIndex, value);
    setShowSuggestions((prev) => ({
      ...prev,
      diagnosis: { ...prev.diagnosis, [groupIndex]: false },
    }));
  };

  const handleDiagnosisKeyDown = (e: React.KeyboardEvent, groupIndex: number) => {
    const currentDiagnosis = treatmentForm.diagnosisGroups[groupIndex]?.diagnosis || "";
    if (e.key === "Tab" && filteredSuggestions.diagnoses[groupIndex] && filteredSuggestions.diagnoses[groupIndex].length > 0 && currentDiagnosis.trim()) {
      e.preventDefault();
      selectDiagnosisSuggestion(groupIndex, filteredSuggestions.diagnoses[groupIndex][0]);
    }
  };

  // Treatment plan management
  const addTreatmentPlan = (groupIndex: number) => {
    setTreatmentForm((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex ? { ...group, treatmentPlans: [...group.treatmentPlans, ""] } : group
      ),
    }));
  };

  const updateTreatmentPlan = (groupIndex: number, planIndex: number, value: string) => {
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

    // Auto-add medications when treatment plan is selected
    if (value.trim() && value !== previousPlan && value.length >= 3) {
      autoAddMedicationsForTreatment(value);
    }

    // Filter suggestions
    const diagnosis = treatmentForm.diagnosisGroups[groupIndex]?.diagnosis || "";
    const availablePlans = getTreatmentPlansForDiagnosis(diagnosis);

    if (value.length > 0) {
      const filtered = availablePlans.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
      setFilteredSuggestions((prev) => ({
        ...prev,
        treatmentPlans: { ...prev.treatmentPlans, [`${groupIndex}-${planIndex}`]: filtered },
      }));
      // Auto show suggestions when typing
      const key = `${groupIndex}-${planIndex}`;
      setShowSuggestions((prev) => ({
        ...prev,
        treatmentPlan: { ...prev.treatmentPlan, [key]: true },
      }));
    } else {
      setFilteredSuggestions((prev) => ({
        ...prev,
        treatmentPlans: { ...prev.treatmentPlans, [`${groupIndex}-${planIndex}`]: availablePlans },
      }));
      const key = `${groupIndex}-${planIndex}`;
      setShowSuggestions((prev) => ({
        ...prev,
        treatmentPlan: { ...prev.treatmentPlan, [key]: false },
      }));
    }
  };

  const removeTreatmentPlan = (groupIndex: number, planIndex: number) => {
    const group = treatmentForm.diagnosisGroups[groupIndex];
    if (group.treatmentPlans.length > 1) {
      setTreatmentForm((prev) => ({
        ...prev,
        diagnosisGroups: prev.diagnosisGroups.map((g, i) =>
          i === groupIndex
            ? {
                ...g,
                treatmentPlans: g.treatmentPlans.filter((_, j) => j !== planIndex),
              }
            : g
        ),
      }));
    }
  };

  const toggleTreatmentPlanSuggestions = (groupIndex: number, planIndex: number) => {
    const key = `${groupIndex}-${planIndex}`;
    const isShowing = showSuggestions.treatmentPlan[key] || false;

    if (!isShowing) {
      const diagnosis = treatmentForm.diagnosisGroups[groupIndex]?.diagnosis || "";
      const availablePlans = getTreatmentPlansForDiagnosis(diagnosis);
      setFilteredSuggestions((prev) => ({
        ...prev,
        treatmentPlans: { ...prev.treatmentPlans, [key]: availablePlans },
      }));
    }

    setShowSuggestions((prev) => ({
      ...prev,
      treatmentPlan: { ...prev.treatmentPlan, [key]: !isShowing },
    }));
  };

  const selectTreatmentPlanSuggestion = (groupIndex: number, planIndex: number, value: string) => {
    updateTreatmentPlan(groupIndex, planIndex, value);
    const key = `${groupIndex}-${planIndex}`;
    setShowSuggestions((prev) => ({
      ...prev,
      treatmentPlan: { ...prev.treatmentPlan, [key]: false },
    }));
  };

  const handleTreatmentPlanKeyDown = (e: React.KeyboardEvent, groupIndex: number, planIndex: number) => {
    const key = `${groupIndex}-${planIndex}`;
    const currentPlan = treatmentForm.diagnosisGroups[groupIndex]?.treatmentPlans[planIndex] || "";
    if (e.key === "Tab" && filteredSuggestions.treatmentPlans[key] && filteredSuggestions.treatmentPlans[key].length > 0 && currentPlan.trim()) {
      e.preventDefault();
      selectTreatmentPlanSuggestion(groupIndex, planIndex, filteredSuggestions.treatmentPlans[key][0]);
    }
  };

  const getTreatmentPlansForDiagnosis = (diagnosis: string): string[] => {
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

    return suggestions.treatmentPlans;
  };

  // Medication management
  const addMedication = () => {
    setTreatmentForm((prev) => ({
      ...prev,
      medications: [...prev.medications, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }],
    }));
  };

  const updateMedication = (index: number, field: keyof MedicationForm, value: string) => {
    setTreatmentForm((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) => (i === index ? { ...med, [field]: value } : med)),
    }));

    // Filter medication name suggestions
    if (field === "name" && value.length > 0) {
      const filtered = suggestions.medications.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
      setFilteredSuggestions((prev) => ({
        ...prev,
        medications: { ...prev.medications, [index]: filtered },
      }));
    } else if (field === "name" && value.length === 0) {
      setFilteredSuggestions((prev) => ({
        ...prev,
        medications: { ...prev.medications, [index]: suggestions.medications },
      }));
    }
  };

  const removeMedication = (index: number) => {
    setTreatmentForm((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const toggleMedicationSuggestions = (index: number) => {
    const isShowing = showSuggestions.medication[index] || false;
    if (!isShowing) {
      setFilteredSuggestions((prev) => ({
        ...prev,
        medications: { ...prev.medications, [index]: suggestions.medications },
      }));
    }
    setShowSuggestions((prev) => ({
      ...prev,
      medication: { ...prev.medication, [index]: !isShowing },
    }));
  };

  const selectMedicationSuggestion = (index: number, value: string) => {
    updateMedication(index, "name", value);
    setShowSuggestions((prev) => ({
      ...prev,
      medication: { ...prev.medication, [index]: false },
    }));
  };

  // Auto-add medications
  const autoAddMedicationsForDiagnosis = (diagnosis: string) => {
    if (!diagnosis.trim()) return;

    let medicationsToAdd: MedicationForm[] = [];

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
      const existingMedNames = treatmentForm.medications.map((m) => m.name.toLowerCase());
      const newMeds = medicationsToAdd.filter((med) => !existingMedNames.includes(med.name.toLowerCase()));

      if (newMeds.length > 0) {
        setTreatmentForm((prev) => ({
          ...prev,
          medications: [...prev.medications, ...newMeds],
        }));
        toast.success(`Đã thêm ${newMeds.length} thuốc dựa trên chẩn đoán`);
      }
    }
  };

  const autoAddMedicationsForTreatment = (treatmentPlan: string) => {
    if (!treatmentPlan.trim()) return;

    let medicationsToAdd: MedicationForm[] = [];

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
      const existingMedNames = treatmentForm.medications.map((m) => m.name.toLowerCase());
      const newMeds = medicationsToAdd.filter((med) => !existingMedNames.includes(med.name.toLowerCase()));

      if (newMeds.length > 0) {
        setTreatmentForm((prev) => ({
          ...prev,
          medications: [...prev.medications, ...newMeds],
        }));
        toast.success(`Đã thêm ${newMeds.length} thuốc dựa trên kế hoạch điều trị`);
      }
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (treatmentForm.chiefComplaints.length === 0) {
      toast.error("Vui lòng nhập lý do khám");
      return;
    }

    if (treatmentForm.diagnosisGroups.every((g) => !g.diagnosis.trim())) {
      toast.error("Vui lòng nhập chẩn đoán");
      return;
    }

    await onSubmit(treatmentForm);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Thăm khám và điều trị</h2>
            <p className="text-sm text-gray-600 mt-1">
              Bệnh nhân: <span className="font-medium">{appointment?.patientName || "N/A"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Patient Info Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông tin bệnh nhân</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Họ tên:</span>{" "}
              <span className="font-medium text-gray-900">{appointment?.patientName || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-600">Điện thoại:</span>{" "}
              <span className="font-medium text-gray-900">{appointment?.phone || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-600">Email:</span>{" "}
              <span className="font-medium text-gray-900">{appointment?.email || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-600">Ngày khám:</span>{" "}
              <span className="font-medium text-gray-900">
                {appointment?.date ? new Date(appointment.date).toLocaleDateString("vi-VN") : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Giờ khám:</span>{" "}
              <span className="font-medium text-gray-900">{appointment?.startTime || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-5">
          {/* Chief Complaints */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Lý do khám <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={toggleChiefComplaintSuggestions}
                className="p-1 hover:bg-yellow-100 rounded-full transition-colors"
                title="Gợi ý"
              >
                <Lightbulb className="w-4 h-4 text-yellow-600" />
              </button>
            </div>

            {/* Hashtag Display */}
            <div className="flex flex-wrap gap-2 mb-2">
              {treatmentForm.chiefComplaints.map((complaint, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {complaint}
                  <button
                    type="button"
                    onClick={() => removeChiefComplaint(index)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Input */}
            <div className="relative">
              <input
                type="text"
                value={chiefComplaintInput}
                onChange={(e) => handleChiefComplaintInputChange(e.target.value)}
                onKeyDown={handleChiefComplaintKeyDown}
                placeholder="Thêm lý do khám khác..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />

              {/* Suggestions Dropdown */}
              {showSuggestions.chiefComplaint && filteredSuggestions.chiefComplaints.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                  {filteredSuggestions.chiefComplaints.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectChiefComplaintSuggestion(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Present Illness / Tiền sử bệnh */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tiền sử bệnh</label>
            <textarea
              value={treatmentForm.presentIllness}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, presentIllness: e.target.value })}
              placeholder="Mô tả tiền sử bệnh, diễn biến bệnh..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Diagnosis & Treatment Plans */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                Chẩn đoán & Kế hoạch điều trị <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addDiagnosis}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={isSubmitting}
              >
                + Thêm chẩn đoán
              </button>
            </div>

            <div className="space-y-4">
              {treatmentForm.diagnosisGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  {/* Diagnosis */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs font-medium text-gray-600">Chẩn đoán {groupIndex + 1}</label>
                      <button
                        type="button"
                        onClick={() => toggleDiagnosisSuggestions(groupIndex)}
                        className="p-1 hover:bg-yellow-100 rounded-full transition-colors"
                        title="Gợi ý phù hợp cho 'Viêm nướu'"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-yellow-600" />
                      </button>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={group.diagnosis}
                          onChange={(e) => updateDiagnosis(groupIndex, e.target.value)}
                          onKeyDown={(e) => handleDiagnosisKeyDown(e, groupIndex)}
                          placeholder="Nhập chẩn đoán..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />

                        {/* Diagnosis Suggestions */}
                        {showSuggestions.diagnosis[groupIndex] &&
                          filteredSuggestions.diagnoses[groupIndex] &&
                          filteredSuggestions.diagnoses[groupIndex].length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                              {filteredSuggestions.diagnoses[groupIndex].map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => selectDiagnosisSuggestion(groupIndex, suggestion)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      {treatmentForm.diagnosisGroups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDiagnosis(groupIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Treatment Plans */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">Kế hoạch điều trị</label>
                      <button
                        type="button"
                        onClick={() => addTreatmentPlan(groupIndex)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                        disabled={isSubmitting}
                      >
                        + Thêm kế hoạch
                      </button>
                    </div>

                    <div className="space-y-2">
                      {group.treatmentPlans.map((plan, planIndex) => (
                        <div key={planIndex} className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={plan}
                                onChange={(e) => updateTreatmentPlan(groupIndex, planIndex, e.target.value)}
                                onKeyDown={(e) => handleTreatmentPlanKeyDown(e, groupIndex, planIndex)}
                                placeholder={`Kế hoạch ${planIndex + 1}`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                disabled={isSubmitting}
                              />

                              {/* Treatment Plan Suggestions */}
                              {showSuggestions.treatmentPlan[`${groupIndex}-${planIndex}`] &&
                                filteredSuggestions.treatmentPlans[`${groupIndex}-${planIndex}`] &&
                                filteredSuggestions.treatmentPlans[`${groupIndex}-${planIndex}`].length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                                    {filteredSuggestions.treatmentPlans[`${groupIndex}-${planIndex}`].map(
                                      (suggestion, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          onClick={() =>
                                            selectTreatmentPlanSuggestion(groupIndex, planIndex, suggestion)
                                          }
                                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                                        >
                                          {suggestion}
                                        </button>
                                      )
                                    )}
                                  </div>
                                )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleTreatmentPlanSuggestions(groupIndex, planIndex)}
                              className="p-1 hover:bg-yellow-100 rounded-full transition-colors flex-shrink-0"
                              title="Gợi ý"
                            >
                              <Lightbulb className="w-3.5 h-3.5 text-yellow-600" />
                            </button>
                          </div>

                          {group.treatmentPlans.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTreatmentPlan(groupIndex, planIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={isSubmitting}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Physical Examination */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Khám lâm sàng</label>
            <textarea
              value={treatmentForm.physicalExamination}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, physicalExamination: e.target.value })}
              placeholder="Mô tả kết quả khám lâm sàng..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Đơn thuốc</label>
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Thuốc sẽ được tự động thêm dựa trên chẩn đoán
                </span>
              </div>
              <button
                type="button"
                onClick={addMedication}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={isSubmitting}
              >
                + Thêm thuốc
              </button>
            </div>

            {treatmentForm.medications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                Chưa có thuốc nào. Thuốc sẽ tự động được thêm khi bạn chọn chẩn đoán hoặc nhấn &ldquo;+ Thêm
                thuốc&rdquo;
              </p>
            ) : (
              <div className="space-y-3">
                {treatmentForm.medications.map((med, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        {/* Medication Name */}
                        <div className="col-span-3 flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => updateMedication(index, "name", e.target.value)}
                              placeholder="Tên thuốc *"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              disabled={isSubmitting}
                            />

                            {/* Medication Name Suggestions */}
                            {showSuggestions.medication[index] &&
                              filteredSuggestions.medications[index] &&
                              filteredSuggestions.medications[index].length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                                  {filteredSuggestions.medications[index].map((suggestion, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => selectMedicationSuggestion(index, suggestion)}
                                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleMedicationSuggestions(index)}
                            className="p-1 hover:bg-yellow-100 rounded-full transition-colors flex-shrink-0"
                            title="Gợi ý"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-yellow-600" />
                          </button>
                        </div>

                        {/* Dosage */}
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          placeholder="Liều lượng (VD: 250mg)"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />

                        {/* Frequency */}
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                          placeholder="Tần suất (VD: 3 lần/ngày)"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />

                        {/* Duration */}
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => updateMedication(index, "duration", e.target.value)}
                          placeholder="Thời gian (VD: 2-3 lần/ngày)"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />

                        {/* Instructions */}
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                          placeholder="Hướng dẫn (VD: Uống sau ăn)"
                          className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status - Only show in update mode */}
          {mode === "update" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Trạng thái</label>
              <select
                value={treatmentForm.status || "active"}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                disabled={isSubmitting}
              >
                <option value="active">Đang điều trị</option>
                <option value="completed">Hoàn thành</option>
                <option value="pending">Chờ xử lý</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
            <textarea
              value={treatmentForm.notes}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
              placeholder="Ghi chú thêm..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || treatmentForm.chiefComplaints.length === 0}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : mode === "update" ? (
              "Cập nhật"
            ) : (
              "Hoàn thành"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
