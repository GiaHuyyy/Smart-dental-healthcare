import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiRequest } from '@/utils/api';
import { calculateConsultationFee, ConsultType as ConsultTypeEnum, formatFee, getConsultTypeDescription, getConsultTypeLabel } from '@/utils/consultationFees';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export type BookingStep = 'doctor-time' | 'patient-info' | 'confirmation';

type Doctor = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  specialty?: string;
  consultationFee?: number;
};

type ConsultType = 'televisit' | 'on-site' | 'home-visit';

type BookingFormData = {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  consultType: ConsultType;
  bookForSelf: boolean;
  patientFirstName?: string;
  patientLastName?: string;
  patientDOB?: string;
  patientGender?: 'male' | 'female' | 'other';
  chiefComplaint?: string;
  notes?: string;
  paymentMethod?: 'momo' | 'cash' | 'later';
  paymentAmount?: number;
  voucherCode?: string;
  voucherId?: string;
  discountAmount?: number;
};

interface BookingStepModalProps {
  visible: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  initialData?: Partial<BookingFormData>;
  onConfirm: (data: BookingFormData) => Promise<void>;
  availableTimes: string[];
  busyTimes?: Set<string>;
  onDateChange?: (date: string) => void;
}

const STEPS: Array<{ id: BookingStep; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'doctor-time', label: 'Chọn lịch', icon: 'calendar-outline' },
  { id: 'patient-info', label: 'Thông tin', icon: 'person-outline' },
  { id: 'confirmation', label: 'Xác nhận', icon: 'checkmark-circle-outline' },
];

// Consult types will be generated dynamically based on doctor's base fee

export default function BookingStepModal({
  visible,
  onClose,
  doctor,
  initialData,
  onConfirm,
  availableTimes,
  busyTimes,
  onDateChange,
}: BookingStepModalProps) {
  const colorScheme = useColorScheme();
  const theme = {
    background: Colors[colorScheme ?? 'light'].background,
    text: {
      primary: Colors[colorScheme ?? 'light'].text.primary,
      secondary: Colors[colorScheme ?? 'light'].text.secondary,
    },
    border: Colors[colorScheme ?? 'light'].border,
    card: Colors[colorScheme ?? 'light'].card,
  };

  const [currentStep, setCurrentStep] = useState<BookingStep>('doctor-time');
  const [formData, setFormData] = useState<Partial<BookingFormData>>(
    initialData || {
      consultType: 'on-site',
      bookForSelf: true,
      paymentMethod: 'later',
    }
  );
  const [loading, setLoading] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [duration, setDuration] = useState<30 | 60>(30);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep === 'doctor-time') {
      // Step 1: Only validate that time slot is selected
      // Don't auto-advance, wait for Continue button
      if (!formData.appointmentDate || !formData.startTime || !formData.consultType) {
        Alert.alert('Thiếu thông tin', 'Vui lòng chọn đầy đủ ngày, giờ và loại tư vấn');
        return false;
      }
    } else if (currentStep === 'patient-info') {
      // Step 2: Validate patient info
      if (!formData.bookForSelf) {
        if (!formData.patientFirstName?.trim() || !formData.patientLastName?.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng điền họ tên bệnh nhân');
          return false;
        }
        if (!formData.patientDOB) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày sinh');
          return false;
        }
        if (!formData.patientGender) {
          Alert.alert('Thiếu thông tin', 'Vui lòng chọn giới tính');
          return false;
        }
      }
      // Chief complaint is required
      if (!formData.chiefComplaint?.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng mô tả lý do khám');
        return false;
      }
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateCurrentStep()) return;
    if (!doctor?._id && !doctor?.id) {
      Alert.alert('Lỗi', 'Thông tin bác sĩ không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      // Calculate endTime from startTime + 30 minutes
      let endTime = formData.endTime;
      if (!endTime && formData.startTime) {
        const [hours, minutes] = formData.startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 30; // 30 minutes duration
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
      }

      // Calculate consultation fee based on consult type
      const baseFee = doctor?.consultationFee || 200000;
      const consultTypeEnum = 
        formData.consultType === 'televisit' ? ConsultTypeEnum.TELEVISIT :
        formData.consultType === 'home-visit' ? ConsultTypeEnum.HOME_VISIT :
        ConsultTypeEnum.ON_SITE;
      const consultationFee = calculateConsultationFee(consultTypeEnum, baseFee);
      const finalAmount = Math.max(0, consultationFee - (formData.discountAmount || 0));

      const completeData: BookingFormData = {
        doctorId: doctor._id || doctor.id || '',
        appointmentDate: formData.appointmentDate || '',
        startTime: formData.startTime || '',
        endTime: endTime || '',
        consultType: formData.consultType || 'ON_SITE',
        bookForSelf: formData.bookForSelf ?? true,
        patientFirstName: formData.patientFirstName,
        patientLastName: formData.patientLastName,
        patientDOB: formData.patientDOB,
        patientGender: formData.patientGender,
        chiefComplaint: formData.chiefComplaint,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod || 'later',
        paymentAmount: finalAmount,
        voucherCode: formData.voucherCode,
        voucherId: formData.voucherId,
        discountAmount: formData.discountAmount || 0,
      };

      await onConfirm(completeData);
      handleClose();
    } catch (error) {
      console.error('Booking error:', error);
      // Error already handled by parent, just reset loading
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('doctor-time');
    setFormData({
      consultType: 'on-site',
      bookForSelf: true,
      paymentMethod: 'later',
    });
    setBookedSlots([]);
    onClose();
  };

  const calculateFee = () => {
    const baseFee = doctor?.consultationFee || 200000;
    const consultTypeEnum = 
      formData.consultType === 'televisit' ? ConsultTypeEnum.TELEVISIT :
      formData.consultType === 'home-visit' ? ConsultTypeEnum.HOME_VISIT :
      ConsultTypeEnum.ON_SITE;
    const consultFee = calculateConsultationFee(consultTypeEnum, baseFee);
    const discount = formData.discountAmount || 0;
    return Math.max(0, consultFee - discount);
  };

  // Generate available time slots based on duration
  const generateTimeSlots = useMemo(() => {
    const slots: string[] = [];
    const startHour = 8;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      if (duration === 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < endHour - 1) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      } else {
        // 60 minutes duration
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    }
    
    return slots;
  }, [duration]);

  // Generate all time slots with availability status (show all slots, including busy ones)
  const allTimeSlots = useMemo(() => {
    const now = new Date();
    const selectedDate = formData.appointmentDate ? new Date(formData.appointmentDate) : null;
    const isToday = selectedDate && 
      selectedDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
    
    return generateTimeSlots.map((time) => {
      // Check if slot is booked
      const isBooked = bookedSlots.includes(time);
      
      // Check if slot is in the past (only for today)
      let isPast = false;
      if (isToday) {
        const [hours, minutes] = time.split(':').map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(hours, minutes, 0, 0);
        
        // Minimum 1 hour lead time
        const timeDifferenceMs = slotTime.getTime() - now.getTime();
        const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);
        
        if (timeDifferenceMinutes < 60) {
          isPast = true;
        }
      }
      
      return {
        time,
        available: !isPast && !isBooked,
        booked: isBooked,
        past: isPast,
      };
    });
  }, [generateTimeSlots, bookedSlots, formData.appointmentDate]);
  
  // Filter available slots for selection
  const availableTimeSlots = useMemo(() => {
    return allTimeSlots.filter(slot => slot.available).map(slot => slot.time);
  }, [allTimeSlots]);

  // Fetch booked slots when date changes
  useEffect(() => {
    if (!formData.appointmentDate || !doctor?._id && !doctor?.id) {
      setBookedSlots([]);
      return;
    }

    const fetchBookedSlots = async () => {
      setLoadingSlots(true);
      try {
        const doctorId = doctor._id || doctor.id;
        const response = await apiRequest<any>(
          `/api/v1/appointments/doctor/${doctorId}/available-slots?date=${formData.appointmentDate}&duration=${duration}`
        );
        
        const bookedSlotsArray = response.data?.bookedSlots || [];
        setBookedSlots(bookedSlotsArray);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setBookedSlots([]); // Assume all available if API fails
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchBookedSlots();
  }, [formData.appointmentDate, doctor?._id, doctor?.id, duration]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-2">
        <View
          className="rounded-3xl shadow-2xl"
          style={{ 
            backgroundColor: theme.background,
            width: '100%',
            maxWidth: 600,
            maxHeight: '95%',
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ borderColor: theme.border }}>
            <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
              Đặt lịch khám
            </Text>
            <TouchableOpacity onPress={handleClose} className="rounded-full p-1">
              <Ionicons name="close" size={22} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Progress Steps */}
          <View className="flex-row items-center justify-center px-4 py-4 gap-2">
            {STEPS.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <React.Fragment key={step.id}>
                  <View className="items-center" style={{ minWidth: 70 }}>
                    <View
                      className="h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: isActive ? Colors.primary[600] : theme.border,
                      }}
                    >
                      {isActive && index < currentStepIndex ? (
                        <Ionicons name="checkmark" size={16} color="white" />
                      ) : (
                        <Ionicons
                          name={step.icon}
                          size={16}
                          color={isActive ? 'white' : theme.text.secondary}
                        />
                      )}
                    </View>
                    <Text
                      className="mt-1 text-[10px] font-medium text-center"
                      style={{ color: isCurrent ? Colors.primary[600] : theme.text.secondary }}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                  </View>
                  {index < STEPS.length - 1 && (
                    <View
                      className="h-0.5"
                      style={{
                        backgroundColor: index < currentStepIndex ? Colors.primary[600] : theme.border,
                        width: 30,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Content */}
          <ScrollView 
            className="flex-1 px-4" 
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: '70%' }}
          >
            {currentStep === 'doctor-time' && (
              <DoctorTimeStep
                doctor={doctor}
                formData={formData}
                setFormData={setFormData}
                availableTimes={availableTimeSlots}
                allTimeSlots={allTimeSlots}
                busyTimes={new Set(bookedSlots)}
                loadingSlots={loadingSlots}
                duration={duration}
                setDuration={setDuration}
                onDateChange={(date) => {
                  setFormData((prev: any) => ({ ...prev, appointmentDate: date, startTime: '' }));
                  if (onDateChange) {
                    onDateChange(date);
                  }
                }}
                theme={theme}
              />
            )}

            {currentStep === 'patient-info' && (
              <PatientInfoStep formData={formData} setFormData={setFormData} theme={theme} />
            )}

            {currentStep === 'confirmation' && (
              <ConfirmationStep
                doctor={doctor}
                formData={formData}
                setFormData={setFormData}
                calculateFee={calculateFee}
                voucherLoading={voucherLoading}
                setVoucherLoading={setVoucherLoading}
                voucherApplied={voucherApplied}
                setVoucherApplied={setVoucherApplied}
                theme={theme}
              />
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View className="border-t px-4 py-3" style={{ borderColor: theme.border }}>
            <View className="flex-row gap-2">
              {!isFirstStep && (
                <TouchableOpacity
                  onPress={handleBack}
                  className="flex-1 items-center justify-center rounded-2xl py-3"
                  style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
                >
                  <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                    Quay lại
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={isLastStep ? handleConfirm : handleNext}
                disabled={loading}
                className="flex-1 items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[600] }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    {isLastStep ? 'Xác nhận đặt lịch' : 'Tiếp tục'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Step 1: Doctor & Time Selection
function DoctorTimeStep({
  doctor,
  formData,
  setFormData,
  availableTimes,
  allTimeSlots,
  busyTimes,
  loadingSlots,
  duration,
  setDuration,
  onDateChange,
  theme,
}: any) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Generate consult types dynamically with correct pricing
  const consultTypes = useMemo(() => {
    const baseFee = doctor?.consultationFee || 200000;
    return [
      {
        value: 'televisit' as const,
        label: getConsultTypeLabel(ConsultTypeEnum.TELEVISIT),
        icon: 'videocam-outline' as const,
        color: Colors.info[600],
        description: getConsultTypeDescription(ConsultTypeEnum.TELEVISIT),
        fee: calculateConsultationFee(ConsultTypeEnum.TELEVISIT, baseFee),
        baseFee,
      },
      {
        value: 'on-site' as const,
        label: getConsultTypeLabel(ConsultTypeEnum.ON_SITE),
        icon: 'business-outline' as const,
        color: Colors.primary[600],
        description: getConsultTypeDescription(ConsultTypeEnum.ON_SITE),
        fee: calculateConsultationFee(ConsultTypeEnum.ON_SITE, baseFee),
        baseFee,
      },
      {
        value: 'home-visit' as const,
        label: getConsultTypeLabel(ConsultTypeEnum.HOME_VISIT),
        icon: 'home-outline' as const,
        color: Colors.success[600],
        description: getConsultTypeDescription(ConsultTypeEnum.HOME_VISIT),
        fee: calculateConsultationFee(ConsultTypeEnum.HOME_VISIT, baseFee),
        baseFee,
      },
    ];
  }, [doctor?.consultationFee]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event?.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setFormData((prev: any) => ({ ...prev, appointmentDate: dateString, startTime: '' }));
      if (onDateChange) {
        onDateChange(dateString);
      }
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  // For web: Handle native HTML date input change
  const handleWebDateChange = (event: any) => {
    const dateString = event.target.value; // Format: YYYY-MM-DD
    if (dateString) {
      setFormData((prev: any) => ({ ...prev, appointmentDate: dateString, startTime: '' }));
      if (onDateChange) {
        onDateChange(dateString);
      }
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: formData.appointmentDate ? new Date(formData.appointmentDate) : new Date(),
        mode: 'date',
        minimumDate: new Date(),
        onChange: handleDateChange,
      });
    } else {
      setShowDatePicker(true);
    }
  };

  return (
    <View className="gap-4 pb-4">
      {/* Doctor Info */}
      <Card className="p-3">
        <View className="flex-row items-center gap-2">
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: Colors.primary[100] }}>
            <Ionicons name="person" size={20} color={Colors.primary[600]} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold" style={{ color: theme.text.primary }}>
              {doctor?.fullName || doctor?.name || 'Bác sĩ'}
            </Text>
            <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>
              {doctor?.specialty || 'Chuyên khoa'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Consult Type */}
      <View>
        <Text className="mb-2 text-xs font-semibold" style={{ color: theme.text.primary }}>
          Hình thức tư vấn
        </Text>
        {Platform.OS === 'web' ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
          >
            {consultTypes.map((type) => {
              const isSelected = formData.consultType === type.value;
              const showDiscount = type.value === 'televisit' && type.fee < type.baseFee;
              
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setFormData((prev: any) => ({ ...prev, consultType: type.value }))}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: isSelected ? Colors.primary[50] : theme.card,
                    borderWidth: 2,
                    borderColor: isSelected ? type.color : theme.border,
                    minWidth: 140,
                    maxWidth: 160,
                  }}
                >
                  <View className="items-center gap-2">
                    <View 
                      className="h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: isSelected ? type.color + '20' : theme.border }}
                    >
                      <Ionicons name={type.icon} size={24} color={isSelected ? type.color : theme.text.secondary} />
                    </View>
                    <View className="items-center">
                      <Text
                        className="text-sm font-bold text-center"
                        style={{ color: isSelected ? type.color : theme.text.primary }}
                      >
                        {type.label}
                      </Text>
                      <Text className="mt-1 text-xs text-center" style={{ color: theme.text.secondary }}>
                        {type.description}
                      </Text>
                    </View>
                    <View className="items-center mt-1">
                      <Text className="text-base font-bold" style={{ color: isSelected ? type.color : theme.text.primary }}>
                        {formatFee(type.fee)}
                      </Text>
                      {showDiscount && (
                        <View className="mt-1 flex-row items-center gap-1">
                          <Text className="text-xs line-through" style={{ color: theme.text.secondary }}>
                            {formatFee(type.baseFee)}
                          </Text>
                          <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: Colors.success[100] }}>
                            <Text className="text-xs font-semibold" style={{ color: Colors.success[700] }}>
                              -40%
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View 
            className="flex-row flex-wrap gap-2"
            style={{ 
              overflow: 'visible',
            }}
          >
            {consultTypes.map((type) => {
              const isSelected = formData.consultType === type.value;
              const showDiscount = type.value === 'televisit' && type.fee < type.baseFee;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setFormData((prev: any) => ({ ...prev, consultType: type.value }))}
                  style={{
                    backgroundColor: isSelected ? Colors.primary[50] : theme.card,
                    borderWidth: 1.5,
                    borderColor: isSelected ? type.color : theme.border,
                    borderRadius: 12,
                    padding: 8,
                    width: '48.5%',
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <View 
                      className="h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: isSelected ? type.color + '20' : theme.border }}
                    >
                      <Ionicons name={type.icon} size={16} color={isSelected ? type.color : theme.text.secondary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold" style={{ color: isSelected ? type.color : theme.text.primary }}>
                        {type.label}
                      </Text>
                      <Text className="mt-0.5 text-[10px]" style={{ color: theme.text.secondary }} numberOfLines={1}>
                        {type.description}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-1.5 flex-row items-center justify-between">
                    <Text className="text-xs font-semibold" style={{ color: isSelected ? type.color : theme.text.primary }}>
                      {formatFee(type.fee)}
                    </Text>
                    {showDiscount && (
                      <View className="flex-row items-center gap-1">
                        <Text className="text-[10px] line-through" style={{ color: theme.text.secondary }}>
                          {formatFee(type.baseFee)}
                        </Text>
                        <View className="rounded px-1 py-0.5" style={{ backgroundColor: Colors.success[100] }}>
                          <Text className="text-[9px] font-semibold" style={{ color: Colors.success[700] }}>
                            -40%
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Duration Selector */}
      <View>
        <Text className="mb-2 text-xs font-semibold" style={{ color: theme.text.primary }}>
          Thời gian khám
        </Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setDuration(30)}
            className="flex-1 items-center justify-center rounded-xl py-2.5"
            style={{
              backgroundColor: duration === 30 ? Colors.primary[50] : theme.card,
              borderWidth: 1.5,
              borderColor: duration === 30 ? Colors.primary[600] : theme.border,
            }}
          >
            <Ionicons name="time-outline" size={18} color={duration === 30 ? Colors.primary[600] : theme.text.secondary} />
            <Text className="mt-0.5 text-xs font-semibold" style={{ color: duration === 30 ? Colors.primary[600] : theme.text.secondary }}>
              30 phút
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDuration(60)}
            className="flex-1 items-center justify-center rounded-xl py-2.5"
            style={{
              backgroundColor: duration === 60 ? Colors.primary[50] : theme.card,
              borderWidth: 1.5,
              borderColor: duration === 60 ? Colors.primary[600] : theme.border,
            }}
          >
            <Ionicons name="time-outline" size={18} color={duration === 60 ? Colors.primary[600] : theme.text.secondary} />
            <Text className="mt-0.5 text-xs font-semibold" style={{ color: duration === 60 ? Colors.primary[600] : theme.text.secondary }}>
              1 giờ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Selection */}
      <View>
        <Text className="mb-2 text-xs font-semibold" style={{ color: theme.text.primary }}>
          Ngày khám
        </Text>
        
        {/* Web: Use native HTML date input */}
        {Platform.OS === 'web' ? (
          <View className="rounded-xl p-3" style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
            <input
              type="date"
              value={formData.appointmentDate || ''}
              onChange={handleWebDateChange}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: 13,
                fontWeight: '600',
                color: theme.text.primary,
                cursor: 'pointer',
              }}
            />
          </View>
        ) : (
          /* Mobile: Use native date picker */
          <TouchableOpacity
            onPress={openDatePicker}
            className="flex-row items-center justify-between rounded-xl p-3"
            style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
          >
            <View className="flex-1">
              <Text className="text-xs font-semibold" style={{ color: formData.appointmentDate ? theme.text.primary : theme.text.secondary }}>
                {formData.appointmentDate
                  ? new Date(formData.appointmentDate).toLocaleDateString('vi-VN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Chọn ngày khám'}
              </Text>
            </View>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary[600]} />
          </TouchableOpacity>
        )}
        
        {/* iOS Date Picker Modal */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View className="flex-1 items-center justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <View className="w-full rounded-t-3xl p-5" style={{ backgroundColor: theme.background }}>
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
                    Chọn ngày khám
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: Colors.primary[600] }}
                  >
                    <Text className="text-sm font-semibold text-white">Xong</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={formData.appointmentDate ? new Date(formData.appointmentDate) : new Date()}
                  mode="date"
                  display="inline"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                  textColor={theme.text.primary}
                />
              </View>
            </View>
          </Modal>
        )}
      </View>

      {/* Time Selection */}
      {formData.appointmentDate && (
        <View>
          <Text className="mb-2 text-xs font-semibold" style={{ color: theme.text.primary }}>
            Khung giờ ({duration} phút)
          </Text>
          {loadingSlots ? (
            <View className="items-center justify-center py-6">
              <ActivityIndicator color={Colors.primary[600]} size="small" />
              <Text className="mt-2 text-[10px]" style={{ color: theme.text.secondary }}>
                Đang tải lịch trống...
              </Text>
            </View>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-1.5">
                {allTimeSlots.map((slot) => {
                  const isSelected = formData.startTime === slot.time;
                  const isBusy = slot.booked || slot.past;
                  
                  // Calculate end time
                  const [hours, minutes] = slot.time.split(':').map(Number);
                  const totalMinutes = hours * 60 + minutes + duration;
                  const endHours = Math.floor(totalMinutes / 60) % 24;
                  const endMinutes = totalMinutes % 60;
                  const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                  
                  return (
                    <TouchableOpacity
                      key={slot.time}
                      onPress={() => {
                        if (!isBusy) {
                          setFormData((prev: any) => ({ ...prev, startTime: slot.time, endTime }));
                        }
                      }}
                      disabled={isBusy}
                      className="rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: isSelected ? Colors.primary[600] : isBusy ? Colors.gray[200] : theme.card,
                        borderWidth: 1,
                        borderColor: isSelected ? Colors.primary[600] : isBusy ? Colors.gray[300] : theme.border,
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ 
                          color: isSelected ? 'white' : isBusy ? Colors.gray[500] : theme.text.primary,
                          textDecorationLine: isBusy ? 'line-through' : 'none',
                        }}
                      >
                        {slot.time}
                      </Text>
                      {!isBusy && (
                        <Text
                          className="text-[10px] mt-0.5"
                          style={{ color: isSelected ? 'white' : theme.text.secondary }}
                        >
                          {endTime}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {busyTimes && busyTimes.size > 0 && (
                <View className="mt-2 flex-row items-center gap-1.5">
                  <Ionicons name="information-circle-outline" size={14} color={Colors.info[600]} />
                  <Text className="flex-1 text-[10px]" style={{ color: theme.text.secondary }}>
                    Các khung giờ màu xám đã có người đặt hoặc không khả dụng
                  </Text>
                </View>
              )}
              {allTimeSlots.filter(slot => slot.available).length === 0 && (
                <View className="items-center justify-center py-3 rounded-xl mt-2" style={{ backgroundColor: Colors.warning[50] }}>
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.warning[600]} />
                  <Text className="mt-1.5 text-xs font-semibold" style={{ color: Colors.warning[700] }}>
                    Không có khung giờ khả dụng
                  </Text>
                  <Text className="mt-0.5 text-[10px]" style={{ color: Colors.warning[600] }}>
                    Vui lòng chọn ngày khác
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

// Step 2: Patient Information
function PatientInfoStep({ formData, setFormData, theme }: any) {
  return (
    <View className="gap-4 pb-4">
      {/* Book for self toggle */}
      <Card className="p-3">
        <TouchableOpacity
          onPress={() => setFormData((prev: any) => ({ ...prev, bookForSelf: !prev.bookForSelf }))}
          className="flex-row items-center justify-between"
        >
          <View className="flex-1">
            <Text className="text-xs font-semibold" style={{ color: theme.text.primary }}>
              Đặt lịch cho bản thân
            </Text>
            <Text className="mt-0.5 text-[10px]" style={{ color: theme.text.secondary }}>
              Thông tin sẽ được lấy từ tài khoản của bạn
            </Text>
          </View>
          <View
            className="h-5 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: formData.bookForSelf ? Colors.primary[600] : Colors.gray[300] }}
          >
            <View
              className="h-4 w-4 rounded-full bg-white"
              style={{
                transform: [{ translateX: formData.bookForSelf ? 8 : -8 }],
              }}
            />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Patient details if not booking for self */}
      {!formData.bookForSelf && (
        <View className="gap-3">
          <View>
            <Text className="mb-1.5 text-[10px] font-semibold uppercase" style={{ color: theme.text.secondary }}>
              Họ bệnh nhân *
            </Text>
            <TextInput
              value={formData.patientLastName || ''}
              onChangeText={(text) => setFormData((prev: any) => ({ ...prev, patientLastName: text }))}
              placeholder="Nguyễn Văn"
              className="rounded-xl px-3 py-2.5"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.text.primary,
                fontSize: 12,
              }}
              placeholderTextColor={theme.text.secondary}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-[10px] font-semibold uppercase" style={{ color: theme.text.secondary }}>
              Tên bệnh nhân *
            </Text>
            <TextInput
              value={formData.patientFirstName || ''}
              onChangeText={(text) => setFormData((prev: any) => ({ ...prev, patientFirstName: text }))}
              placeholder="An"
              className="rounded-xl px-3 py-2.5"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.text.primary,
                fontSize: 12,
              }}
              placeholderTextColor={theme.text.secondary}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-[10px] font-semibold uppercase" style={{ color: theme.text.secondary }}>
              Ngày sinh *
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Open date picker for DOB
                // For now, use text input - can be improved with DateTimePicker
              }}
              className="rounded-xl px-3 py-2.5"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <TextInput
                value={formData.patientDOB || ''}
                onChangeText={(text) => setFormData((prev: any) => ({ ...prev, patientDOB: text }))}
                placeholder="YYYY-MM-DD"
                style={{ color: theme.text.primary, fontSize: 12 }}
                placeholderTextColor={theme.text.secondary}
              />
            </TouchableOpacity>
          </View>

          <View>
            <Text className="mb-1.5 text-[10px] font-semibold uppercase" style={{ color: theme.text.secondary }}>
              Giới tính *
            </Text>
            <View className="flex-row gap-2">
              {['male', 'female', 'other'].map((gender) => {
                const isSelected = formData.patientGender === gender;
                const labels = { male: 'Nam', female: 'Nữ', other: 'Khác' };
                return (
                  <TouchableOpacity
                    key={gender}
                    onPress={() => setFormData((prev: any) => ({ ...prev, patientGender: gender }))}
                    className="flex-1 items-center rounded-xl py-2.5"
                    style={{
                      backgroundColor: isSelected ? Colors.primary[50] : theme.card,
                      borderWidth: 1,
                      borderColor: isSelected ? Colors.primary[600] : theme.border,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: isSelected ? Colors.primary[600] : theme.text.secondary }}
                    >
                      {labels[gender as keyof typeof labels]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Chief Complaint */}
      <View>
        <Text className="mb-1.5 text-[10px] font-semibold uppercase" style={{ color: theme.text.secondary }}>
          Lý do khám *
        </Text>
        <TextInput
          value={formData.chiefComplaint || ''}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, chiefComplaint: text }))}
          placeholder="Mô tả triệu chứng hoặc lý do khám..."
          multiline
          numberOfLines={3}
          className="rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            color: theme.text.primary,
            textAlignVertical: 'top',
            fontSize: 12,
          }}
          placeholderTextColor={theme.text.secondary}
        />
      </View>

      {/* Notes */}
      <View>
        <Text className="mb-1.5 text-[10px] font-semibold uppercase" style={{ color: theme.text.secondary }}>
          Ghi chú thêm
        </Text>
        <TextInput
          value={formData.notes || ''}
          onChangeText={(text) => setFormData((prev: any) => ({ ...prev, notes: text }))}
          placeholder="Các thông tin bổ sung..."
          multiline
          numberOfLines={2}
          className="rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            color: theme.text.primary,
            textAlignVertical: 'top',
            fontSize: 12,
          }}
          placeholderTextColor={theme.text.secondary}
        />
      </View>
    </View>
  );
}

// Step 3: Confirmation & Payment
function ConfirmationStep({
  doctor,
  formData,
  setFormData,
  calculateFee,
  voucherLoading,
  setVoucherLoading,
  voucherApplied,
  setVoucherApplied,
  theme,
}: any) {
  const finalAmount = calculateFee();

  const handleApplyVoucher = async () => {
    if (!formData.voucherCode?.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã giảm giá');
      return;
    }

    setVoucherLoading(true);
    // TODO: Call API to validate voucher
    setTimeout(() => {
      setVoucherLoading(false);
      setVoucherApplied(true);
      setFormData((prev: any) => ({ ...prev, discountAmount: 20000 }));
      Alert.alert('Thành công', 'Áp dụng mã giảm giá thành công!');
    }, 1000);
  };

  const PAYMENT_METHODS = [
    {
      value: 'momo',
      label: 'MoMo',
      icon: 'wallet-outline' as const,
      description: 'Thanh toán qua ví MoMo',
      color: Colors.error[600],
    },
    {
      value: 'cash',
      label: 'Tiền mặt',
      icon: 'cash-outline' as const,
      description: 'Thanh toán bằng tiền mặt tại phòng khám',
      color: Colors.success[600],
    },
    {
      value: 'later',
      label: 'Thanh toán sau',
      icon: 'time-outline' as const,
      description: 'Thanh toán sau khi khám',
      color: Colors.warning[600],
    },
  ];

  return (
    <View className="gap-4 pb-4">
      {/* Summary Card */}
      <Card className="p-3">
        <Text className="mb-3 text-sm font-bold" style={{ color: theme.text.primary }}>
          Thông tin đặt lịch
        </Text>

        <View className="gap-2">
          <View className="flex-row items-start gap-2">
            <Ionicons name="person-outline" size={16} color={Colors.primary[600]} />
            <View className="flex-1">
              <Text className="text-[10px]" style={{ color: theme.text.secondary }}>
                Bác sĩ
              </Text>
              <Text className="mt-0.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                {doctor?.fullName || doctor?.name}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-2">
            <Ionicons name="calendar-outline" size={16} color={Colors.primary[600]} />
            <View className="flex-1">
              <Text className="text-[10px]" style={{ color: theme.text.secondary }}>
                Ngày giờ
              </Text>
              <Text className="mt-0.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                {new Date(formData.appointmentDate).toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}{' '}
                lúc {formData.startTime}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-2">
            <Ionicons
              name={
                formData.consultType === 'televisit' ? 'videocam-outline' :
                formData.consultType === 'home-visit' ? 'home-outline' :
                'business-outline'
              }
              size={16}
              color={Colors.primary[600]}
            />
            <View className="flex-1">
              <Text className="text-[10px]" style={{ color: theme.text.secondary }}>
                Hình thức
              </Text>
              <Text className="mt-0.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                {getConsultTypeLabel(
                  formData.consultType === 'televisit' ? ConsultTypeEnum.TELEVISIT :
                  formData.consultType === 'home-visit' ? ConsultTypeEnum.HOME_VISIT :
                  ConsultTypeEnum.ON_SITE
                )}
              </Text>
            </View>
          </View>

          {formData.chiefComplaint && (
            <View className="flex-row items-start gap-2">
              <Ionicons name="document-text-outline" size={16} color={Colors.primary[600]} />
              <View className="flex-1">
                <Text className="text-[10px]" style={{ color: theme.text.secondary }}>
                  Lý do khám
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: theme.text.primary }} numberOfLines={2}>
                  {formData.chiefComplaint}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Voucher */}
      <Card className="p-3">
        <Text className="mb-2 text-xs font-semibold" style={{ color: theme.text.primary }}>
          Mã giảm giá
        </Text>
        <View className="flex-row gap-1.5">
          <TextInput
            value={formData.voucherCode || ''}
            onChangeText={(text) => setFormData((prev: any) => ({ ...prev, voucherCode: text.toUpperCase() }))}
            placeholder="Nhập mã giảm giá"
            editable={!voucherApplied}
            className="flex-1 rounded-xl px-3 py-2"
            style={{
              backgroundColor: voucherApplied ? Colors.success[50] : theme.card,
              borderWidth: 1,
              borderColor: voucherApplied ? Colors.success[500] : theme.border,
              color: theme.text.primary,
              fontSize: 12,
            }}
            placeholderTextColor={theme.text.secondary}
          />
          <TouchableOpacity
            onPress={handleApplyVoucher}
            disabled={voucherLoading || voucherApplied}
            className="items-center justify-center rounded-xl px-4"
            style={{
              backgroundColor: voucherApplied ? Colors.success[600] : Colors.primary[600],
            }}
          >
            {voucherLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : voucherApplied ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : (
              <Text className="text-xs font-semibold text-white">Áp dụng</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>

      {/* Payment Method */}
      <View>
        <Text className="mb-2 text-xs font-semibold" style={{ color: theme.text.primary }}>
          Phương thức thanh toán
        </Text>
        <View className="gap-2">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = formData.paymentMethod === method.value;
            return (
              <TouchableOpacity
                key={method.value}
                onPress={() => setFormData((prev: any) => ({ ...prev, paymentMethod: method.value }))}
                className="flex-row items-center gap-2 rounded-xl p-3"
                style={{
                  backgroundColor: isSelected ? Colors.primary[50] : theme.card,
                  borderWidth: 1.5,
                  borderColor: isSelected ? Colors.primary[600] : theme.border,
                }}
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: isSelected ? method.color : Colors.gray[200] }}
                >
                  <Ionicons name={method.icon} size={20} color={isSelected ? 'white' : Colors.gray[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold" style={{ color: theme.text.primary }}>
                    {method.label}
                  </Text>
                  <Text className="mt-0.5 text-[10px]" style={{ color: theme.text.secondary }} numberOfLines={1}>
                    {method.description}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary[600]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Payment Summary */}
      <Card className="p-3">
        <View className="gap-1.5">
          <View className="flex-row justify-between">
            <Text className="text-xs" style={{ color: theme.text.secondary }}>
              Phí tư vấn
            </Text>
            <Text className="text-xs font-semibold" style={{ color: theme.text.primary }}>
              {formatFee(
                calculateConsultationFee(
                  formData.consultType === 'televisit' ? ConsultTypeEnum.TELEVISIT :
                  formData.consultType === 'home-visit' ? ConsultTypeEnum.HOME_VISIT :
                  ConsultTypeEnum.ON_SITE,
                  doctor?.consultationFee
                )
              )}
            </Text>
          </View>

          {formData.consultType === 'televisit' && (
            <View className="flex-row justify-between">
              <Text className="text-xs" style={{ color: theme.text.secondary }}>
                Giảm giá online (40%)
              </Text>
              <Text className="text-xs font-semibold" style={{ color: Colors.success[600] }}>
                -{formatFee(
                  (doctor?.consultationFee || 200000) - 
                  calculateConsultationFee(ConsultTypeEnum.TELEVISIT, doctor?.consultationFee)
                )}
              </Text>
            </View>
          )}

          {formData.discountAmount > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-xs" style={{ color: theme.text.secondary }}>
                Mã giảm giá
              </Text>
              <Text className="text-xs font-semibold" style={{ color: Colors.success[600] }}>
                -{formData.discountAmount.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          )}

          <View className="my-1.5 h-px" style={{ backgroundColor: theme.border }} />

          <View className="flex-row justify-between">
            <Text className="text-sm font-bold" style={{ color: theme.text.primary }}>
              Tổng thanh toán
            </Text>
            <Text className="text-lg font-bold" style={{ color: Colors.primary[600] }}>
              {finalAmount.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
      </Card>

      {/* MoMo Notice */}
      {formData.paymentMethod === 'momo' && (
        <Card className="flex-row items-start gap-2 p-3" style={{ backgroundColor: Colors.warning[50] }}>
          <Ionicons name="information-circle" size={16} color={Colors.warning[600]} />
          <Text className="flex-1 text-[10px]" style={{ color: Colors.warning[700] }}>
            Sau khi xác nhận, bạn sẽ được chuyển đến ứng dụng MoMo để hoàn tất thanh toán. Lịch hẹn sẽ được xác nhận
            sau khi thanh toán thành công.
          </Text>
        </Card>
      )}
    </View>
  );
}
