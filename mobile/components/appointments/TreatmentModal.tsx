/**
 * Treatment Modal - Mobile Version
 * Form điều trị bệnh nhân cho bác sĩ
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  _id: string;
  patientId?: string | { _id: string };
  patientName?: string;
  date?: string;
  startTime?: string;
}

interface TreatmentModalProps {
  visible: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSubmit: (formData: TreatmentFormData) => Promise<void>;
  isSubmitting: boolean;
}

export default function TreatmentModal({
  visible,
  onClose,
  appointment,
  onSubmit,
  isSubmitting,
}: TreatmentModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [formData, setFormData] = useState<TreatmentFormData>({
    chiefComplaints: [],
    presentIllness: '',
    physicalExamination: '',
    diagnosisGroups: [{ diagnosis: '', treatmentPlans: [''] }],
    notes: '',
    medications: [],
  });

  const [chiefComplaintInput, setChiefComplaintInput] = useState('');
  const [medicationInput, setMedicationInput] = useState<MedicationForm>({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  // Suggestions state
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
    medicationName: false,
  });

  const [filteredSuggestions, setFilteredSuggestions] = useState({
    chiefComplaints: [] as string[],
    diagnoses: {} as Record<number, string[]>,
    treatmentPlans: {} as Record<string, string[]>,
    medications: [] as string[],
  });

  // Fetch suggestions from server
  const fetchSuggestions = useCallback(async () => {
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
      const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;
      
      const response = await fetch(`${API_URL}/ai-chat/suggestions`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      fetchSuggestions();
      setFormData({
        chiefComplaints: [],
        presentIllness: '',
        physicalExamination: '',
        diagnosisGroups: [{ diagnosis: '', treatmentPlans: [''] }],
        notes: '',
        medications: [],
      });
      setChiefComplaintInput('');
      setMedicationInput({
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
    }
  }, [visible]);

  // Chief Complaints Management
  const addChiefComplaint = () => {
    if (chiefComplaintInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        chiefComplaints: [...prev.chiefComplaints, chiefComplaintInput.trim()],
      }));
      setChiefComplaintInput('');
      setShowSuggestions((prev) => ({ ...prev, chiefComplaint: false }));
    }
  };

  const removeChiefComplaint = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      chiefComplaints: prev.chiefComplaints.filter((_, i) => i !== index),
    }));
  };

  const handleChiefComplaintChange = (value: string) => {
    setChiefComplaintInput(value);
    // Filter suggestions khi gõ
    if (value.length > 0) {
      const filtered = suggestions.chiefComplaints.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions((prev) => ({ ...prev, chiefComplaints: filtered }));
    } else {
      setFilteredSuggestions((prev) => ({ ...prev, chiefComplaints: suggestions.chiefComplaints }));
    }
  };

  const toggleChiefComplaintSuggestions = () => {
    const isShowing = showSuggestions.chiefComplaint;
    if (!isShowing) {
      const filtered = chiefComplaintInput.length > 0
        ? suggestions.chiefComplaints.filter((s) =>
            s.toLowerCase().includes(chiefComplaintInput.toLowerCase())
          )
        : suggestions.chiefComplaints;
      setFilteredSuggestions((prev) => ({ ...prev, chiefComplaints: filtered }));
    }
    setShowSuggestions((prev) => ({ ...prev, chiefComplaint: !isShowing }));
  };

  const selectChiefComplaintSuggestion = (value: string) => {
    setChiefComplaintInput(value);
    setShowSuggestions((prev) => ({ ...prev, chiefComplaint: false }));
  };

  // Diagnosis Groups Management
  const addDiagnosisGroup = () => {
    setFormData((prev) => ({
      ...prev,
      diagnosisGroups: [...prev.diagnosisGroups, { diagnosis: '', treatmentPlans: [''] }],
    }));
  };

  const updateDiagnosis = (groupIndex: number, value: string) => {
    const previousDiagnosis = formData.diagnosisGroups[groupIndex]?.diagnosis || '';

    setFormData((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex ? { ...group, diagnosis: value } : group
      ),
    }));

    // Auto-add medications when diagnosis is complete
    if (value.trim() && value !== previousDiagnosis && value.length >= 3) {
      autoAddMedicationsForDiagnosis(value);
    }

    // Filter suggestions khi gõ
    if (value.length > 0) {
      const filtered = suggestions.diagnoses.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions((prev) => ({
        ...prev,
        diagnoses: { ...prev.diagnoses, [groupIndex]: filtered },
      }));
    } else {
      setFilteredSuggestions((prev) => ({
        ...prev,
        diagnoses: { ...prev.diagnoses, [groupIndex]: suggestions.diagnoses },
      }));
    }
  };

  const toggleDiagnosisSuggestions = (groupIndex: number) => {
    const isShowing = showSuggestions.diagnosis[groupIndex] || false;
    if (!isShowing) {
      const currentValue = formData.diagnosisGroups[groupIndex]?.diagnosis || '';
      const filtered = currentValue.length > 0
        ? suggestions.diagnoses.filter((s) =>
            s.toLowerCase().includes(currentValue.toLowerCase())
          )
        : suggestions.diagnoses;
      setFilteredSuggestions((prev) => ({
        ...prev,
        diagnoses: { ...prev.diagnoses, [groupIndex]: filtered },
      }));
    }
    setShowSuggestions((prev) => ({
      ...prev,
      diagnosis: { ...prev.diagnosis, [groupIndex]: !isShowing },
    }));
  };

  const selectDiagnosisSuggestion = (groupIndex: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex ? { ...group, diagnosis: value } : group
      ),
    }));
    
    // Auto-add medications
    autoAddMedicationsForDiagnosis(value);
    
    // Hide suggestions
    setShowSuggestions((prev) => ({
      ...prev,
      diagnosis: { ...prev.diagnosis, [groupIndex]: false },
    }));
  };

  const removeDiagnosisGroup = (groupIndex: number) => {
    if (formData.diagnosisGroups.length > 1) {
      setFormData((prev) => ({
        ...prev,
        diagnosisGroups: prev.diagnosisGroups.filter((_, i) => i !== groupIndex),
      }));
    }
  };

  // Treatment Plans Management
  const addTreatmentPlan = (groupIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      diagnosisGroups: prev.diagnosisGroups.map((group, i) =>
        i === groupIndex ? { ...group, treatmentPlans: [...group.treatmentPlans, ''] } : group
      ),
    }));
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
      if (
        key.toLowerCase().includes(normalizedDiagnosis) ||
        normalizedDiagnosis.includes(key.toLowerCase())
      ) {
        return plans;
      }
    }

    return suggestions.treatmentPlans;
  };

  const updateTreatmentPlan = (groupIndex: number, planIndex: number, value: string) => {
    const previousPlan = formData.diagnosisGroups[groupIndex]?.treatmentPlans[planIndex] || '';

    setFormData((prev) => ({
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

    // Auto-add medications when treatment plan is complete
    if (value.trim() && value !== previousPlan && value.length >= 3) {
      autoAddMedicationsForTreatment(value);
    }

    // Filter suggestions khi gõ
    const diagnosis = formData.diagnosisGroups[groupIndex]?.diagnosis || '';
    const availablePlans = getTreatmentPlansForDiagnosis(diagnosis);
    const key = `${groupIndex}-${planIndex}`;

    if (value.length > 0) {
      const filtered = availablePlans.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions((prev) => ({
        ...prev,
        treatmentPlans: { ...prev.treatmentPlans, [key]: filtered },
      }));
    } else {
      setFilteredSuggestions((prev) => ({
        ...prev,
        treatmentPlans: { ...prev.treatmentPlans, [key]: availablePlans },
      }));
    }
  };

  const toggleTreatmentPlanSuggestions = (groupIndex: number, planIndex: number) => {
    const key = `${groupIndex}-${planIndex}`;
    const isShowing = showSuggestions.treatmentPlan[key] || false;
    if (!isShowing) {
      const currentValue = formData.diagnosisGroups[groupIndex]?.treatmentPlans[planIndex] || '';
      const diagnosis = formData.diagnosisGroups[groupIndex]?.diagnosis || '';
      const availablePlans = getTreatmentPlansForDiagnosis(diagnosis);
      const filtered = currentValue.length > 0
        ? availablePlans.filter((s) =>
            s.toLowerCase().includes(currentValue.toLowerCase())
          )
        : availablePlans;
      setFilteredSuggestions((prev) => ({
        ...prev,
        treatmentPlans: { ...prev.treatmentPlans, [key]: filtered },
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

  const removeTreatmentPlan = (groupIndex: number, planIndex: number) => {
    if (formData.diagnosisGroups[groupIndex].treatmentPlans.length > 1) {
      setFormData((prev) => ({
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
  };

  // Auto-add medications functions
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
        if (
          key.toLowerCase().includes(normalizedDiagnosis) ||
          normalizedDiagnosis.includes(key.toLowerCase())
        ) {
          medicationsToAdd = meds;
          break;
        }
      }
    }

    if (medicationsToAdd.length > 0) {
      const existingMedNames = formData.medications.map((m) => m.name.toLowerCase());
      const newMeds = medicationsToAdd.filter(
        (med) => !existingMedNames.includes(med.name.toLowerCase())
      );

      if (newMeds.length > 0) {
        setFormData((prev) => ({
          ...prev,
          medications: [...prev.medications, ...newMeds],
        }));
        Alert.alert('Thành công', `Đã thêm ${newMeds.length} thuốc dựa trên chẩn đoán`);
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
        if (
          key.toLowerCase().includes(normalizedTreatment) ||
          normalizedTreatment.includes(key.toLowerCase())
        ) {
          medicationsToAdd = meds;
          break;
        }
      }
    }

    if (medicationsToAdd.length > 0) {
      const existingMedNames = formData.medications.map((m) => m.name.toLowerCase());
      const newMeds = medicationsToAdd.filter(
        (med) => !existingMedNames.includes(med.name.toLowerCase())
      );

      if (newMeds.length > 0) {
        setFormData((prev) => ({
          ...prev,
          medications: [...prev.medications, ...newMeds],
        }));
        Alert.alert('Thành công', `Đã thêm ${newMeds.length} thuốc dựa trên phương pháp điều trị`);
      }
    }
  };

  // Medications Management
  const addMedication = () => {
    if (medicationInput.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        medications: [...prev.medications, { ...medicationInput }],
      }));
      setMedicationInput({
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
      setShowSuggestions((prev) => ({ ...prev, medicationName: false }));
    }
  };

  const handleMedicationNameChange = (value: string) => {
    setMedicationInput((prev) => ({ ...prev, name: value }));
    // Filter suggestions khi gõ
    if (value.length > 0) {
      const filtered = suggestions.medications.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions((prev) => ({ ...prev, medications: filtered }));
    } else {
      setFilteredSuggestions((prev) => ({ ...prev, medications: suggestions.medications }));
    }
  };

  const toggleMedicationSuggestions = () => {
    const isShowing = showSuggestions.medicationName;
    if (!isShowing) {
      const filtered = medicationInput.name.length > 0
        ? suggestions.medications.filter((s) =>
            s.toLowerCase().includes(medicationInput.name.toLowerCase())
          )
        : suggestions.medications;
      setFilteredSuggestions((prev) => ({ ...prev, medications: filtered }));
    }
    setShowSuggestions((prev) => ({ ...prev, medicationName: !isShowing }));
  };

  const selectMedicationSuggestion = (value: string) => {
    setMedicationInput((prev) => ({ ...prev, name: value }));
    setShowSuggestions((prev) => ({ ...prev, medicationName: false }));
  };

  const removeMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  // Submit Handler
  const handleSubmit = async () => {
    // Validation
    if (formData.chiefComplaints.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất một triệu chứng');
      return;
    }

    const hasValidDiagnosis = formData.diagnosisGroups.some((group) => group.diagnosis.trim() !== '');
    if (!hasValidDiagnosis) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất một chẩn đoán');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Submit treatment error:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{ backgroundColor: theme.background, maxHeight: '95%', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between p-4 border-b"
              style={{ borderBottomColor: Colors.gray[200] }}
            >
              <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                Điều trị - {appointment?.patientName}
              </Text>
              <Pressable
                onPress={onClose}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.gray[100] }}
              >
                <Ionicons name="close" size={20} color={Colors.gray[600]} />
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Chief Complaints */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-2" style={{ color: theme.text.primary }}>
                  Triệu chứng chính *
                </Text>
                <View className="mb-2">
                  <View className="flex-row gap-2">
                    <TextInput
                      value={chiefComplaintInput}
                      onChangeText={handleChiefComplaintChange}
                      placeholder="Nhập triệu chứng..."
                      className="flex-1 px-4 py-3 rounded-xl text-base"
                      style={{
                        backgroundColor: theme.card,
                        color: theme.text.primary,
                        borderWidth: 1,
                        borderColor: Colors.gray[200],
                      }}
                      placeholderTextColor={Colors.gray[400]}
                    />
                    <Pressable
                      onPress={toggleChiefComplaintSuggestions}
                      className="w-12 h-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: Colors.warning[500] }}
                    >
                      <Ionicons name="bulb" size={20} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={addChiefComplaint}
                      className="w-12 h-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: Colors.primary[600] }}
                    >
                      <Ionicons name="add" size={24} color="#fff" />
                    </Pressable>
                  </View>

                  {/* Suggestions Dropdown */}
                  {showSuggestions.chiefComplaint && filteredSuggestions.chiefComplaints.length > 0 && (
                    <View
                      className="mt-1 rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: theme.card,
                        borderWidth: 1,
                        borderColor: Colors.gray[200],
                        maxHeight: 200,
                      }}
                    >
                      <ScrollView>
                        {filteredSuggestions.chiefComplaints.map((suggestion, idx) => (
                          <Pressable
                            key={idx}
                            onPress={() => selectChiefComplaintSuggestion(suggestion)}
                            className="px-4 py-3 border-b"
                            style={{ borderBottomColor: Colors.gray[100] }}
                          >
                            <Text style={{ color: theme.text.primary }}>{suggestion}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {formData.chiefComplaints.map((complaint, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between px-3 py-2 rounded-lg mb-2"
                    style={{ backgroundColor: Colors.primary[50] }}
                  >
                    <Text className="flex-1" style={{ color: Colors.primary[700] }}>
                      • {complaint}
                    </Text>
                    <Pressable onPress={() => removeChiefComplaint(index)}>
                      <Ionicons name="close-circle" size={20} color={Colors.primary[700]} />
                    </Pressable>
                  </View>
                ))}
              </View>

              {/* Present Illness */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-2" style={{ color: theme.text.primary }}>
                  Bệnh sử hiện tại
                </Text>
                <TextInput
                  value={formData.presentIllness}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, presentIllness: text }))}
                  placeholder="Mô tả bệnh sử..."
                  multiline
                  numberOfLines={4}
                  className="px-4 py-3 rounded-xl text-base"
                  style={{
                    backgroundColor: theme.card,
                    color: theme.text.primary,
                    borderWidth: 1,
                    borderColor: Colors.gray[200],
                    textAlignVertical: 'top',
                  }}
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>

              {/* Physical Examination */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-2" style={{ color: theme.text.primary }}>
                  Khám lâm sàng
                </Text>
                <TextInput
                  value={formData.physicalExamination}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, physicalExamination: text }))
                  }
                  placeholder="Kết quả khám..."
                  multiline
                  numberOfLines={4}
                  className="px-4 py-3 rounded-xl text-base"
                  style={{
                    backgroundColor: theme.card,
                    color: theme.text.primary,
                    borderWidth: 1,
                    borderColor: Colors.gray[200],
                    textAlignVertical: 'top',
                  }}
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>

              {/* Diagnosis Groups */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold" style={{ color: theme.text.primary }}>
                    Chẩn đoán & Phương pháp điều trị *
                  </Text>
                  <Pressable
                    onPress={addDiagnosisGroup}
                    className="flex-row items-center gap-1 px-3 py-1 rounded-lg"
                    style={{ backgroundColor: Colors.success[600] }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text className="text-xs font-semibold text-white">Thêm</Text>
                  </Pressable>
                </View>

                {formData.diagnosisGroups.map((group, groupIndex) => (
                  <View
                    key={groupIndex}
                    className="p-3 rounded-xl mb-3"
                    style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: Colors.gray[200] }}
                  >
                    {/* Diagnosis */}
                    <View className="mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                          Chẩn đoán {groupIndex + 1}
                        </Text>
                        <View className="flex-row gap-2">
                          <Pressable onPress={() => toggleDiagnosisSuggestions(groupIndex)}>
                            <Ionicons name="bulb" size={18} color={Colors.warning[500]} />
                          </Pressable>
                          {formData.diagnosisGroups.length > 1 && (
                            <Pressable onPress={() => removeDiagnosisGroup(groupIndex)}>
                              <Ionicons name="trash-outline" size={18} color={Colors.error[600]} />
                            </Pressable>
                          )}
                        </View>
                      </View>
                      <TextInput
                        value={group.diagnosis}
                        onChangeText={(text) => updateDiagnosis(groupIndex, text)}
                        placeholder="Nhập chẩn đoán..."
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: theme.background,
                          color: theme.text.primary,
                          borderWidth: 1,
                          borderColor: Colors.gray[200],
                        }}
                        placeholderTextColor={Colors.gray[400]}
                      />

                      {/* Diagnosis Suggestions */}
                      {showSuggestions.diagnosis[groupIndex] &&
                        filteredSuggestions.diagnoses[groupIndex] &&
                        filteredSuggestions.diagnoses[groupIndex].length > 0 && (
                          <View
                            className="mt-1 rounded-lg overflow-hidden"
                            style={{
                              backgroundColor: theme.card,
                              borderWidth: 1,
                              borderColor: Colors.gray[200],
                              maxHeight: 150,
                            }}
                          >
                            <ScrollView>
                              {filteredSuggestions.diagnoses[groupIndex].map((suggestion, idx) => (
                                <Pressable
                                  key={idx}
                                  onPress={() => selectDiagnosisSuggestion(groupIndex, suggestion)}
                                  className="px-3 py-2 border-b"
                                  style={{ borderBottomColor: Colors.gray[100] }}
                                >
                                  <Text className="text-xs" style={{ color: theme.text.primary }}>
                                    {suggestion}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                    </View>

                    {/* Treatment Plans */}
                    <View>
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                          Phương pháp điều trị
                        </Text>
                        <Pressable onPress={() => addTreatmentPlan(groupIndex)}>
                          <Ionicons name="add-circle" size={18} color={Colors.primary[600]} />
                        </Pressable>
                      </View>
                      {group.treatmentPlans.map((plan, planIndex) => (
                        <View key={planIndex} className="mb-2">
                          <View className="flex-row gap-2 mb-1">
                            <TextInput
                              value={plan}
                              onChangeText={(text) => updateTreatmentPlan(groupIndex, planIndex, text)}
                              placeholder="Phương pháp..."
                              className="flex-1 px-3 py-2 rounded-lg text-sm"
                              style={{
                                backgroundColor: theme.background,
                                color: theme.text.primary,
                                borderWidth: 1,
                                borderColor: Colors.gray[200],
                              }}
                              placeholderTextColor={Colors.gray[400]}
                            />
                            <Pressable
                              onPress={() => toggleTreatmentPlanSuggestions(groupIndex, planIndex)}
                              className="w-9 h-9 items-center justify-center"
                            >
                              <Ionicons name="bulb" size={18} color={Colors.warning[500]} />
                            </Pressable>
                            {group.treatmentPlans.length > 1 && (
                              <Pressable
                                onPress={() => removeTreatmentPlan(groupIndex, planIndex)}
                                className="w-9 h-9 items-center justify-center"
                              >
                                <Ionicons name="close-circle" size={20} color={Colors.error[600]} />
                              </Pressable>
                            )}
                          </View>

                          {/* Treatment Plan Suggestions */}
                          {showSuggestions.treatmentPlan[`${groupIndex}-${planIndex}`] &&
                            filteredSuggestions.treatmentPlans[`${groupIndex}-${planIndex}`] &&
                            filteredSuggestions.treatmentPlans[`${groupIndex}-${planIndex}`].length > 0 && (
                              <View
                                className="mt-1 rounded-lg overflow-hidden"
                                style={{
                                  backgroundColor: theme.card,
                                  borderWidth: 1,
                                  borderColor: Colors.gray[200],
                                  maxHeight: 120,
                                }}
                              >
                                <ScrollView>
                                  {filteredSuggestions.treatmentPlans[`${groupIndex}-${planIndex}`].map(
                                    (suggestion, idx) => (
                                      <Pressable
                                        key={idx}
                                        onPress={() =>
                                          selectTreatmentPlanSuggestion(groupIndex, planIndex, suggestion)
                                        }
                                        className="px-3 py-2 border-b"
                                        style={{ borderBottomColor: Colors.gray[100] }}
                                      >
                                        <Text className="text-xs" style={{ color: theme.text.primary }}>
                                          {suggestion}
                                        </Text>
                                      </Pressable>
                                    )
                                  )}
                                </ScrollView>
                              </View>
                            )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Medications */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-2" style={{ color: theme.text.primary }}>
                  Thuốc điều trị (tự động từ chẩn đoán)
                </Text>

                {/* Medication List */}
                {formData.medications.length === 0 ? (
                  <Text className="text-sm text-center py-4" style={{ color: Colors.gray[400] }}>
                    Thuốc sẽ tự động thêm khi bạn chọn chẩn đoán hoặc phương pháp điều trị
                  </Text>
                ) : (
                  formData.medications.map((med, index) => (
                    <View
                      key={index}
                      className="p-3 rounded-lg mb-2"
                      style={{ backgroundColor: Colors.success[50], borderWidth: 1, borderColor: Colors.success[100] }}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="font-bold flex-1" style={{ color: Colors.success[700] }}>
                          {med.name}
                        </Text>
                        <Pressable onPress={() => removeMedication(index)}>
                          <Ionicons name="trash-outline" size={18} color={Colors.error[600]} />
                        </Pressable>
                      </View>
                      <Text className="text-xs" style={{ color: Colors.success[600] }}>
                        Liều: {med.dosage} | Tần suất: {med.frequency}
                      </Text>
                      {med.duration && (
                        <Text className="text-xs" style={{ color: Colors.success[600] }}>
                          Thời gian: {med.duration}
                        </Text>
                      )}
                      {med.instructions && (
                        <Text className="text-xs mt-1" style={{ color: Colors.success[600] }}>
                          Hướng dẫn: {med.instructions}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>              {/* Notes */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-2" style={{ color: theme.text.primary }}>
                  Ghi chú
                </Text>
                <TextInput
                  value={formData.notes}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
                  placeholder="Ghi chú thêm..."
                  multiline
                  numberOfLines={3}
                  className="px-4 py-3 rounded-xl text-base"
                  style={{
                    backgroundColor: theme.card,
                    color: theme.text.primary,
                    borderWidth: 1,
                    borderColor: Colors.gray[200],
                    textAlignVertical: 'top',
                  }}
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View
              className="p-4 border-t"
              style={{ borderTopColor: Colors.gray[200] }}
            >
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                className="py-4 rounded-xl items-center"
                style={{
                  backgroundColor: isSubmitting ? Colors.gray[400] : Colors.primary[600],
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-bold text-white">
                    Lưu hồ sơ điều trị
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
