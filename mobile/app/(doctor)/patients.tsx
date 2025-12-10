/**
 * Doctor Patients Screen
 * Danh sách bệnh nhân
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaView,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import PatientDetailModal from '@/components/patient/PatientDetailModal';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDoctorPatients, Patient } from '@/services/doctorService';

type SortBy = 'name' | 'date' | 'recent';

export default function DoctorPatients() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Fetch patients
  const fetchPatients = useCallback(async (page = 1, search = '') => {
    if (!session?.user?._id || !session?.token) {
      console.log('❌ [Patients] No session or token');
      setLoading(false);
      setPatients([]);
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔄 [Patients] Fetching patients...', { doctorId: session.user._id, page, search });
      
      const response = await getDoctorPatients(session.user._id, session.token, {
        current: page,
        pageSize,
        search,
      });

      console.log('📦 [Patients] API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const patientsList = response.data.patients || response.data || [];
        console.log('✅ [Patients] Loaded patients:', patientsList.length);
        console.log('✅ [Patients] First patient:', patientsList[0]);
        const patientsArray = Array.isArray(patientsList) ? patientsList : [];
        console.log('✅ [Patients] Setting patients array length:', patientsArray.length);
        setPatients(patientsArray);
        setTotal(response.data.total || patientsList.length || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
        console.log('✅ [Patients] State updated successfully');
      } else {
        console.error('❌ [Patients] Error fetching patients:', response.message);
        setPatients([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('❌ [Patients] Error fetching patients:', error);
      setPatients([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (session?.user?._id && session?.token) {
        console.log('🔄 [Patients] useFocusEffect triggered');
        // Call fetch directly with current values
        fetchPatients(currentPage, searchTerm);
      } else {
        console.log('❌ [Patients] No session in useFocusEffect');
      }
    }, [session?.user?._id, session?.token, currentPage, searchTerm])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchPatients(1, searchTerm);
  }, [fetchPatients, searchTerm]);

  // Sort patients
  const getSortedPatients = () => {
    console.log('🔄 [Patients] getSortedPatients called, patients.length:', patients.length);
    const sorted = [...patients];
    
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
      case 'date':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'recent':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      default:
        return sorted;
    }
  };

  const sortedPatients = getSortedPatients();
  console.log('👥 [Patients] Rendering with sortedPatients.length:', sortedPatients.length);

  // Calculate age
  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const renderPatientItem = ({ item }: { item: Patient }) => {
    console.log('👤 [Patients] Rendering patient:', item.fullName);
    const age = calculateAge(item.dateOfBirth);
    const genderIcon = item.gender === 'male' ? 'male' : item.gender === 'female' ? 'female' : 'person';
    const genderColor = item.gender === 'male' ? Colors.primary[600] : item.gender === 'female' ? Colors.error[600] : Colors.gray[600];

    return (
      <Pressable
        onPress={() => setSelectedPatient(item._id)}
        className="active:opacity-70"
      >
        <View
          className="flex-row items-center p-4 mb-2 rounded-xl border"
          style={{
            backgroundColor: theme.card,
            borderColor: Colors.gray[200],
          }}
        >
          {/* Avatar */}
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: Colors.primary[100] }}
          >
            {item.avatar ? (
              <Text className="text-lg font-bold" style={{ color: Colors.primary[600] }}>
                {item.fullName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person" size={24} color={Colors.primary[600]} />
            )}
          </View>

          {/* Info */}
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                className="font-semibold text-base flex-1"
                style={{ color: theme.text.primary }}
                numberOfLines={1}
              >
                {item.fullName}
              </Text>
              {item.gender && (
                <Ionicons name={genderIcon as any} size={16} color={genderColor} />
              )}
            </View>
            
            <View className="flex-row items-center mt-1" style={{ gap: 12 }}>
              {item.phone && (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={12} color={Colors.gray[500]} />
                  <Text className="text-xs ml-1" style={{ color: theme.text.secondary }}>
                    {item.phone}
                  </Text>
                </View>
              )}
              {age !== null && (
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={12} color={Colors.gray[500]} />
                  <Text className="text-xs ml-1" style={{ color: theme.text.secondary }}>
                    {age} tuổi
                  </Text>
                </View>
              )}
            </View>

            {item.email && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="mail-outline" size={12} color={Colors.gray[500]} />
                <Text className="text-xs ml-1" style={{ color: theme.text.secondary }} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            )}
          </View>

          {/* Arrow */}
          <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View className="items-center justify-center py-16">
        <Ionicons 
          name={searchTerm ? "search-outline" : "people-outline"} 
          size={64} 
          color={Colors.gray[300]} 
        />
        <Text className="mt-4 text-lg font-semibold" style={{ color: theme.text.primary }}>
          {searchTerm ? 'Không tìm thấy bệnh nhân' : 'Chưa có bệnh nhân'}
        </Text>
        <Text className="mt-2 text-center px-8" style={{ color: theme.text.secondary }}>
          {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Danh sách bệnh nhân sẽ hiển thị ở đây'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AppHeader title="Bệnh nhân" showNotification showAvatar />

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
          {/* Search + Filter */}
          <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
            <View
              className="flex-1 flex-row items-center px-3 py-2.5 rounded-lg"
              style={{ backgroundColor: Colors.gray[100] }}
            >
              <Ionicons name="search" size={18} color={Colors.gray[400]} />
              <TextInput
                className="flex-1 ml-2 text-sm"
                placeholder="Tìm tên, SĐT, email..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={{ color: theme.text.primary }}
                placeholderTextColor={Colors.gray[400]}
              />
              {searchTerm ? (
                <Pressable onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.gray[400]} />
                </Pressable>
              ) : null}
            </View>

            {/* Filter Button */}
            <Pressable
              onPress={() => setShowFilterModal(true)}
              className="w-11 h-11 rounded-lg items-center justify-center relative"
              style={{ backgroundColor: Colors.gray[100] }}
            >
              <Ionicons name="options-outline" size={20} color={Colors.gray[700]} />
              {sortBy !== 'name' && (
                <View
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Text className="text-white text-[9px] font-bold">1</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Stats */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
              Tổng số bệnh nhân
            </Text>
            <Text className="text-sm font-bold" style={{ color: Colors.primary[600] }}>
              {total} người
            </Text>
          </View>

          {/* Patient List */}
          {loading && !refreshing ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary[600]} />
              <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải danh sách...
              </Text>
            </View>
          ) : (
            <>
              {console.log('📝 [Patients] Rendering FlatList with data.length:', sortedPatients.length)}
              <FlatList
                style={{ flex: 1 }}
                data={sortedPatients}
                renderItem={renderPatientItem}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[Colors.primary[600]]}
                />
              }
              ListEmptyComponent={renderEmptyState}
              ListFooterComponent={
                totalPages > 1 ? (
                  <View className="py-4 px-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                        Trang {currentPage} / {totalPages}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.text.secondary }}>
                        Tổng: {total} bệnh nhân
                      </Text>
                    </View>
                    <View className="flex-row" style={{ gap: 8 }}>
                      <Pressable
                        onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex-1 py-2.5 rounded-lg items-center"
                        style={{
                          backgroundColor: currentPage === 1 ? Colors.gray[100] : Colors.primary[600],
                        }}
                      >
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: currentPage === 1 ? Colors.gray[400] : '#fff' }}
                        >
                          Trang trước
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex-1 py-2.5 rounded-lg items-center"
                        style={{
                          backgroundColor: currentPage === totalPages ? Colors.gray[100] : Colors.primary[600],
                        }}
                      >
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: currentPage === totalPages ? Colors.gray[400] : '#fff' }}
                        >
                          Trang sau
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null
              }
              contentContainerStyle={sortedPatients.length === 0 ? { flexGrow: 1 } : undefined}
            />
            </>
          )}
        </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable className="flex-1" onPress={() => setShowFilterModal(false)} />
          <View className="rounded-t-3xl p-5" style={{ backgroundColor: theme.card }}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
                Sắp xếp
              </Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.gray[500]} />
              </Pressable>
            </View>

            {/* Sort Options */}
            <View className="mb-4" style={{ gap: 8 }}>
              {[
                { value: 'name' as SortBy, label: 'Tên A-Z', icon: 'text-outline' },
                { value: 'recent' as SortBy, label: 'Mới nhất', icon: 'time-outline' },
                { value: 'date' as SortBy, label: 'Cũ nhất', icon: 'calendar-outline' },
              ].map((option) => {
                const isSelected = sortBy === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setSortBy(option.value);
                      setShowFilterModal(false);
                    }}
                    className="flex-row items-center p-4 rounded-xl"
                    style={{
                      backgroundColor: isSelected ? Colors.primary[50] : Colors.gray[50],
                    }}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isSelected ? Colors.primary[600] : Colors.gray[600]}
                    />
                    <Text
                      className="ml-3 flex-1 text-base font-medium"
                      style={{ color: isSelected ? Colors.primary[600] : theme.text.primary }}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary[600]} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Reset Button */}
            {sortBy !== 'name' && (
              <Pressable
                onPress={() => {
                  setSortBy('name');
                  setShowFilterModal(false);
                }}
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: Colors.gray[100] }}
              >
                <Text className="font-semibold" style={{ color: theme.text.secondary }}>
                  Đặt lại
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <PatientDetailModal
          visible={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          patientId={selectedPatient}
          token={session?.token || ''}
        />
      )}
    </SafeAreaView>
  );
}

