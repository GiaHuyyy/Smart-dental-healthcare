import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useChat } from '@/contexts/chat-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import realtimeChatService, { ChatConversation, ChatMessage } from '@/services/realtimeChatService';
import { apiRequest } from '@/utils/api';

type SortBy = 'recent' | 'unread' | 'name';

interface ConversationItem {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  patientEmail?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
}

export default function DoctorChat() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session } = useAuth();
  const { refreshUnreadCount } = useChat();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Fetch conversations using REST API (like patient chat)
  const fetchConversations = useCallback(async () => {
    if (!session?.user?._id || !session?.token) {
      setLoading(false);
      setConversations([]);
      setFilteredConversations([]);
      return;
    }

    try {
      setLoading(true);
      const userId = session.user._id;
      const userRole = 'doctor';
      
      console.log('📡 [Doctor Chat] Loading conversations from REST API...');
      
      const response = await apiRequest<ChatConversation[]>(
        `/realtime-chat/conversations?userId=${userId}&userRole=${userRole}&populate=lastMessage,patientId,doctorId`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      console.log('🔍 [Doctor Chat] Raw response:', response);

      // Handle different response structures
      let conversationsData: ChatConversation[] = [];
      if (response.data) {
        // response.data could be array or object with data property
        if (Array.isArray(response.data)) {
          conversationsData = response.data;
        } else if (typeof response.data === 'object' && 'data' in response.data) {
          conversationsData = (response.data as any).data || [];
        } else if (typeof response.data === 'object' && 'conversations' in response.data) {
          conversationsData = (response.data as any).conversations || [];
        }
      }

      console.log(`✅ [Doctor Chat] Loaded ${conversationsData.length} conversations`);
      
      // Debug: Log first conversation to see exact structure
      if (conversationsData.length > 0) {
        console.log('🔍 FULL FIRST CONVERSATION:', JSON.stringify(conversationsData[0], null, 2));
      }
      
      const items: ConversationItem[] = conversationsData.map((conv) => {
        const patient = conv.patientId;
        
        console.log('🔍 Processing conversation:', conv._id);
        console.log('🔍 Patient data:', {
          _id: patient?._id,
          fullName: patient?.fullName,
          name: patient?.name,
          firstName: patient?.firstName,
          lastName: patient?.lastName,
        });
        
        // Skip conversation if patient is not populated
        if (!patient || !patient._id) {
          console.warn('⚠️ Skipping conversation with unpopulated patient:', conv._id);
          return null;
        }
        
        // Debug lastMessage structure
        console.log('🔍 Last message structure:', {
          lastMessage: conv.lastMessage,
          content: conv.lastMessage?.content,
          type: typeof conv.lastMessage,
          isString: typeof conv.lastMessage === 'string',
          hasContent: Boolean(conv.lastMessage?.content),
        });
        
        const patientId = patient._id;
        const patientName = 
          patient.fullName || 
          patient.name || 
          (patient.firstName && patient.lastName 
            ? `${patient.firstName} ${patient.lastName}`.trim()
            : patient.firstName || patient.lastName || 'Bệnh nhân');
        
        console.log('✅ Final patientName:', patientName);
        
        // Handle different lastMessage structures - MORE ROBUST
        let lastMessage = 'Bắt đầu cuộc trò chuyện';
        let lastMessagePrefix = ''; // "Bạn: " hoặc "" (tên bệnh nhân)
        
        if (conv.lastMessage) {
          const msg = conv.lastMessage as any; // Type assertion for flexibility
          
          // Determine if this is doctor's message (for "Bạn:" prefix)
          const isMyMessage = msg.senderId?._id === session?.user?._id || 
                              msg.senderRole === 'doctor';
          
          // Case 1: lastMessage is populated object with content
          if (typeof msg === 'object' && msg.content) {
            lastMessage = msg.content;
            lastMessagePrefix = isMyMessage ? 'Bạn: ' : '';
            console.log('📌 Using lastMessage.content:', lastMessage, 'isMyMessage:', isMyMessage);
          }
          // Case 2: lastMessage is string (direct content) - but NOT ObjectId
          else if (typeof msg === 'string' && msg.trim() && !/^[0-9a-fA-F]{24}$/.test(msg)) {
            lastMessage = msg;
            console.log('📌 Using lastMessage as string:', lastMessage);
          }
          // Case 3: lastMessage is image
          else if (typeof msg === 'object' && msg.messageType === 'image') {
            lastMessage = '📷 Hình ảnh';
            lastMessagePrefix = isMyMessage ? 'Bạn: ' : '';
            console.log('📌 Image message, isMyMessage:', isMyMessage);
          }
          // Case 4: lastMessage is file
          else if (typeof msg === 'object' && msg.messageType === 'file') {
            lastMessage = '📎 Tệp đính kèm';
            lastMessagePrefix = isMyMessage ? 'Bạn: ' : '';
            console.log('📌 File message, isMyMessage:', isMyMessage);
          }
          // Case 5: lastMessage exists but unpopulated (just ID)
          else if (typeof msg === 'string' || (typeof msg === 'object' && !msg.content)) {
            lastMessage = 'Tin nhắn mới';
            console.log('📌 Unpopulated message or ID only');
          }
        }
        
        console.log('✅ Final lastMessage:', lastMessagePrefix + lastMessage);
        
        return {
          id: conv._id,
          patientId,
          patientName,
          patientAvatar: patient.avatar,
          patientEmail: patient.email,
          lastMessage: lastMessagePrefix + lastMessage, // Combine prefix + message
          lastMessageTime: conv.lastMessage?.createdAt || conv.updatedAt,
          unreadCount: conv.unreadDoctorCount || 0,
        };
      }).filter((item): item is ConversationItem => item !== null);
      
      console.log(`✅ [Doctor Chat] Processed ${items.length} valid conversations`);
      console.log('✅ [Doctor Chat] First conversation:', items[0]);
      
      console.log('✅ [Doctor Chat] Setting conversations state...');
      setConversations(items);
      setFilteredConversations(items);
      console.log('✅ [Doctor Chat] State updated successfully');
      
      // If lastMessage is not populated, try to fetch messages for each conversation
      const itemsWithUnpopulatedMessage = items.filter(item => 
        item.lastMessage === 'Tin nhắn mới' || item.lastMessage === 'Bắt đầu cuộc trò chuyện'
      );
      
      if (itemsWithUnpopulatedMessage.length > 0) {
        console.log(`⚠️ Found ${itemsWithUnpopulatedMessage.length} conversations with unpopulated messages, fetching...`);
        
        // Fetch last message for each conversation in parallel
        const fetchPromises = itemsWithUnpopulatedMessage.map(async (item) => {
          try {
            const messagesResponse = await apiRequest<any>(
              `/realtime-chat/conversations/${item.id}/messages?limit=1&sort=-createdAt&userId=${userId}&userRole=${userRole}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${session.token}`,
                },
              }
            );
            
            console.log(`📥 Messages response for ${item.id}:`, messagesResponse);
            
            const messages = Array.isArray(messagesResponse.data) 
              ? messagesResponse.data 
              : messagesResponse.data?.messages || [];
            
            console.log(`📨 Found ${messages.length} messages for conversation ${item.id}`);
            
            if (messages.length > 0) {
              const lastMsg = messages[0];
              console.log(`🔍 Last message:`, {
                content: lastMsg.content,
                senderRole: lastMsg.senderRole,
                senderId: lastMsg.senderId,
                messageType: lastMsg.messageType,
              });
              
              const isMyMessage = lastMsg.senderRole === 'doctor' || 
                                  lastMsg.senderId?._id === session.user._id;
              
              console.log(`👤 Is my message:`, isMyMessage);
              
              let content = lastMsg.content || '';
              if (!content) {
                if (lastMsg.messageType === 'image') content = '📷 Hình ảnh';
                else if (lastMsg.messageType === 'file') content = '📎 Tệp đính kèm';
                else content = 'Tin nhắn';
              }
              
              const displayMessage = isMyMessage ? `Bạn: ${content}` : content;
              console.log(`✅ Display message:`, displayMessage);
              
              return {
                conversationId: item.id,
                displayMessage,
                lastMessageTime: lastMsg.createdAt,
              };
            }
            return null;
          } catch (error) {
            console.error(`❌ Error fetching messages for conversation ${item.id}:`, error);
            return null;
          }
        });
        
        // Wait for all fetches to complete
        const results = await Promise.all(fetchPromises);
        
        // Batch update all conversations at once
        const updates = results.filter(r => r !== null);
        if (updates.length > 0) {
          console.log(`✅ Updating ${updates.length} conversations with fetched messages`);
          setConversations(prev => 
            prev.map(conv => {
              const update = updates.find(u => u!.conversationId === conv.id);
              if (update) {
                return { 
                  ...conv, 
                  lastMessage: update.displayMessage, 
                  lastMessageTime: update.lastMessageTime 
                };
              }
              return conv;
            })
          );
        }
      }
      
      if (conversationsData.length === 0) {
        console.log('⚠️ [Doctor Chat] No conversations found - empty response');
      }
    } catch (error) {
      console.error('❌ [Doctor Chat] Error loading conversations:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  // Connect to socket for real-time updates
  useFocusEffect(
    useCallback(() => {
      if (!session?.user?._id || !session?.token) {
        console.log('❌ [Doctor Chat] No session in useFocusEffect');
        return;
      }

      console.log('🔄 [Doctor Chat] useFocusEffect triggered');
      
      const initializeChat = async () => {
        try {
          // Connect to socket
          await realtimeChatService.connect(session.token, session.user._id, 'doctor');
          
          // Setup real-time event listeners
          setupSocketListeners();
          
          // Load initial conversations via REST API
          await fetchConversations();
          
          console.log('✅ Chat initialized');
        } catch (error) {
          console.error('Error initializing chat:', error);
          setLoading(false);
        }
      };

      initializeChat();

      return () => {
        console.log('🔌 [Doctor Chat] Disconnecting socket');
        realtimeChatService.disconnect();
      };
    }, [session?.user?._id, session?.token])
  );

  // Setup socket event listeners for real-time updates only
  const setupSocketListeners = () => {
    const socket = realtimeChatService.getSocket();
    if (!socket) return;

    // New message received - update existing conversation
    socket.on('newMessage', (data: { message: ChatMessage; conversationId: string }) => {
      console.log('📨 New message received:', data.conversationId, data.message.content);
      
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === data.conversationId) {
            const isMyMessage = data.message.senderId._id === session?.user?._id;
            
            // Handle different message types
            let displayMessage = data.message.content || '';
            if (!displayMessage) {
              if (data.message.messageType === 'image') {
                displayMessage = '📷 Hình ảnh';
              } else if (data.message.messageType === 'file') {
                displayMessage = '📎 Tệp đính kèm';
              } else {
                displayMessage = 'Tin nhắn mới';
              }
            }
            
            // Add "Bạn: " prefix if it's doctor's message
            const finalMessage = isMyMessage ? `Bạn: ${displayMessage}` : displayMessage;
            
            return {
              ...conv,
              lastMessage: finalMessage,
              lastMessageTime: data.message.createdAt,
              unreadCount: isMyMessage ? conv.unreadCount : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        })
      );
      
      // Refresh unread count in context
      refreshUnreadCount();
    });

    // Conversation created - add new conversation to list
    socket.on('conversationCreated', (conversation: ChatConversation) => {
      console.log('📨 Conversation created:', conversation._id);
      
      const patient = conversation.patientId;
      const patientId = patient._id;
      
      const patientName = 
        patient.fullName || 
        patient.name || 
        (patient.firstName && patient.lastName 
          ? `${patient.firstName} ${patient.lastName}`.trim()
          : patient.firstName || patient.lastName || 'Bệnh nhân');
      
      const newConv: ConversationItem = {
        id: conversation._id,
        patientId,
        patientName,
        patientAvatar: patient.avatar,
        patientEmail: patient.email,
        lastMessage: 'Bắt đầu cuộc trò chuyện',
        lastMessageTime: conversation.updatedAt,
        unreadCount: 0,
      };
      
      setConversations((prev) => [newConv, ...prev]);
    });

    // Error handling
    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
    });
  };

  // Search and filter - use useMemo for better performance
  React.useEffect(() => {
    console.log('🔄 [Doctor Chat] Filtering conversations, conversations.length:', conversations.length);
    let result = [...conversations];

    // Search by patient name or email
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((conv) =>
        conv.patientName.toLowerCase().includes(search) ||
        conv.patientEmail?.toLowerCase().includes(search)
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => 
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
        break;
      case 'unread':
        result.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
        break;
      case 'name':
        result.sort((a, b) => a.patientName.localeCompare(b.patientName));
        break;
    }

    console.log('✅ [Doctor Chat] Filtered result.length:', result.length);
    setFilteredConversations(result);
  }, [conversations, searchTerm, sortBy]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const handleOpenChat = (conversation: ConversationItem) => {
    // Refresh unread count when opening chat
    refreshUnreadCount();
    
    // Navigate to doctor chat detail screen with full patient info
    router.push({
      pathname: '/(doctor)/chat/[id]',
      params: {
        id: conversation.id,
        patientId: conversation.patientId,
        patientName: conversation.patientName,
        patientAvatar: conversation.patientAvatar || '',
      },
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (sortBy !== 'recent') count++;
    return count;
  };

  const getSortLabel = (sort: SortBy) => {
    switch (sort) {
      case 'recent':
        return 'Mới nhất';
      case 'unread':
        return 'Chưa đọc';
      case 'name':
        return 'Tên A-Z';
      default:
        return 'Mới nhất';
    }
  };

  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    console.log('💬 [Doctor Chat] Rendering conversation:', item.patientName);
    return (
      <Pressable
        style={{ 
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        }}
        onPress={() => handleOpenChat(item)}
      >
      {/* Avatar */}
      <View style={{ position: 'relative' }}>
        {item.patientAvatar ? (
          <Image
            source={{ uri: item.patientAvatar }}
            style={{ width: 56, height: 56, borderRadius: 28 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary[100] }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.primary[600] }}>
              {item.patientName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {/* Online indicator */}
        {item.isOnline && (
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'white', backgroundColor: Colors.success[500] }} />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', flex: 1, color: theme.text.primary }} numberOfLines={1}>
            {item.patientName}
          </Text>
          <Text style={{ fontSize: 12, marginLeft: 8, color: theme.text.secondary }}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text 
            style={{ fontSize: 13, flex: 1, color: theme.text.secondary }}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          
          {item.unreadCount > 0 && (
            <View 
              style={{ marginLeft: 8, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: Colors.primary[600] }}
            >
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'white' }}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={20} color={theme.text.secondary} style={{ marginLeft: 8 }} />
    </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: theme.card }}
      >
        <Ionicons name="chatbubbles-outline" size={40} color={theme.text.secondary} />
      </View>
      <Text className="text-base font-medium mb-2" style={{ color: theme.text.primary }}>
        {searchTerm ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có tin nhắn'}
      </Text>
      <Text className="text-sm text-center px-8" style={{ color: theme.text.secondary }}>
        {searchTerm
          ? 'Thử tìm kiếm với từ khóa khác'
          : 'Tin nhắn từ bệnh nhân sẽ hiển thị tại đây'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AppHeader title="Tin nhắn" showNotification showAvatar />
      
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>
          {/* Search and Filter Bar */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Search Input */}
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.gray[100] }}>
                <Ionicons name="search-outline" size={20} color={theme.text.secondary} />
                <TextInput
                  style={{ flex: 1, marginLeft: 8, fontSize: 14, color: theme.text.primary }}
                  placeholder="Tìm bệnh nhân..."
                  placeholderTextColor={theme.text.secondary}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                {searchTerm.length > 0 && (
                  <Pressable onPress={() => setSearchTerm('')}>
                    <Ionicons name="close-circle" size={20} color={theme.text.secondary} />
                  </Pressable>
                )}
              </View>

              {/* Filter Button */}
              <Pressable
                style={{ position: 'relative', padding: 10, borderRadius: 8, backgroundColor: Colors.gray[100] }}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={getActiveFilterCount() > 0 ? Colors.primary[600] : theme.text.secondary}
                />
                {getActiveFilterCount() > 0 && (
                  <View
                    style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary[600] }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>{getActiveFilterCount()}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Stats */}
          {!searchTerm && conversations.length > 0 && (
            <View style={{ paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                {conversations.length} cuộc trò chuyện
              </Text>
              {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: Colors.primary[600] }} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary[600] }}>
                    {conversations.filter((c) => c.unreadCount > 0).length} chưa đọc
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Conversations List */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary[600]} />
              <Text style={{ marginTop: 16, fontSize: 13, color: theme.text.secondary }}>
                Đang kết nối...
              </Text>
            </View>
          ) : (
            <>
              {console.log('📝 [Doctor Chat] Rendering FlatList with data.length:', filteredConversations.length)}
              <FlatList
                style={{ flex: 1 }}
                data={filteredConversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ flexGrow: 1 }}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={Colors.primary[600]}
                />
              }
          />
          </>
        )}
        
        {/* Filter Modal */}
        <Modal visible={showFilterModal} transparent animationType="slide">
          <Pressable
            className="flex-1 justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setShowFilterModal(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="rounded-t-3xl p-6" style={{ backgroundColor: theme.card }}>
              {/* Modal Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                  Sắp xếp
                </Text>
                <Pressable onPress={() => setSortBy('recent')}>
                  <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
                    Đặt lại
                  </Text>
                </Pressable>
              </View>

              {/* Sort Options */}
              <View style={{ gap: 8 }}>
                {[
                  { value: 'recent' as SortBy, label: 'Mới nhất', icon: 'time-outline' },
                  { value: 'unread' as SortBy, label: 'Chưa đọc', icon: 'mail-unread-outline' },
                  { value: 'name' as SortBy, label: 'Tên A-Z', icon: 'text-outline' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    className="flex-row items-center justify-between p-3 rounded-lg"
                    style={{
                      backgroundColor: sortBy === option.value ? Colors.primary[50] : theme.background,
                    }}
                    onPress={() => {
                      setSortBy(option.value);
                      setShowFilterModal(false);
                    }}
                  >
                    <View className="flex-row items-center" style={{ gap: 12 }}>
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={sortBy === option.value ? Colors.primary[600] : theme.text.secondary}
                      />
                      <Text
                        className="text-sm font-medium"
                        style={{
                      color: sortBy === option.value ? Colors.primary[600] : theme.text.primary,
                    }}
                  >
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary[600]} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
      </View>
    </SafeAreaView>
  );
}