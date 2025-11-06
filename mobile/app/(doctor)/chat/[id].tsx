/**
 * Doctor Real-time Chat Detail Screen
 * Màn hình chat chi tiết giữa bác sĩ và bệnh nhân
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useCall } from '@/contexts/CallContext';
import { useChat } from '@/contexts/chat-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import realtimeChatService, { ChatMessage } from '@/services/realtimeChatService';
import uploadService from '@/services/uploadService';

export default function DoctorChatDetail() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session } = useAuth();
  const { refreshUnreadCount } = useChat();
  const { initiateCall } = useCall();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    patientId: string;
    patientName?: string;
    patientAvatar?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [displayAvatar, setDisplayAvatar] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);

  const conversationId = params.id;

  // Set initial display name from params or fetch from conversation
  useEffect(() => {
    console.log('🔍 Chat Detail Params:', {
      id: params.id,
      patientId: params.patientId,
      patientName: params.patientName,
      patientAvatar: params.patientAvatar,
    });
    
    if (params.patientName) {
      setDisplayName(params.patientName);
      console.log('✅ Display name set to:', params.patientName);
    } else {
      setDisplayName('Bệnh nhân');
      console.log('⚠️ No patient name in params, using default');
    }
    
    if (params.patientAvatar) {
      setDisplayAvatar(params.patientAvatar);
    }
  }, [params.patientName, params.patientAvatar]);

  // Join conversation and load messages
  useEffect(() => {
    if (!conversationId || !session?.user?._id) return;

    const initChat = async () => {
      try {
        setLoading(true);
        
        // Join conversation room
        realtimeChatService.joinConversation(conversationId);
        
        // Setup message listeners
        setupMessageListeners();
        
        // Load messages
        await realtimeChatService.loadMessages(conversationId, 100);
        
        console.log('✅ Chat detail initialized');
      } catch (error) {
        console.error('Error initializing chat detail:', error);
      }
    };

    initChat();

    return () => {
      // Leave conversation when unmounting
      realtimeChatService.leaveConversation(conversationId);
    };
  }, [conversationId, session]);

  // Setup message event listeners
  const setupMessageListeners = () => {
    const socket = realtimeChatService.getSocket();
    if (!socket) return;

    // Messages loaded
    socket.on('messagesLoaded', (data: { conversationId: string; messages: ChatMessage[] }) => {
      if (data.conversationId === conversationId) {
        console.log('📨 Messages loaded:', data.messages.length);
        setMessages(data.messages.reverse()); // Reverse to show oldest first
        setLoading(false);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        // Refresh unread count
        refreshUnreadCount();
      }
    });

    // New message received
    socket.on('newMessage', (data: { message: ChatMessage; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        console.log('📨 New message received');
        setMessages((prev) => [...prev, data.message]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        // Refresh unread count
        refreshUnreadCount();
      }
    });
  };

  // Send text message
  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;
    if (sending) return;

    try {
      setSending(true);

      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        const imgFileName = `chat_${Date.now()}.jpg`;
        const uploadResult = await uploadService.uploadImage(
          {
            uri: selectedImage,
            mimeType: 'image/jpeg',
            fileName: imgFileName,
          },
          conversationId
        );
        
        if (uploadResult.success && uploadResult.url) {
          fileUrl = uploadResult.url;
          fileName = uploadResult.url.split('/').pop() || imgFileName;
          fileType = 'image';
        }
      }

      // Send message
      await realtimeChatService.sendMessage(
        conversationId,
        inputText.trim() || 'Đã gửi hình ảnh',
        selectedImage ? 'image' : 'text',
        fileUrl,
        fileName,
        fileType
      );

      // Clear input
      setInputText('');
      setSelectedImage(null);
      
      console.log('✅ Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  // Pick image
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Handle voice call
  const handleVoiceCall = async () => {
    if (!params.patientId || !displayName) {
      Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
      return;
    }

    try {
      await initiateCall(params.patientId, displayName, 'patient', false);
    } catch (error) {
      console.error('Error initiating voice call:', error);
      Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
    }
  };

  // Handle video call
  const handleVideoCall = async () => {
    if (!params.patientId || !displayName) {
      Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
      return;
    }

    try {
      await initiateCall(params.patientId, displayName, 'patient', true);
    } catch (error) {
      console.error('Error initiating video call:', error);
      Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi video');
    }
  };

  // Render message bubble
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMyMessage = item.senderId?._id === session?.user?._id || item.senderRole === 'doctor';
    const showDate = index === 0 || 
      new Date(item.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

    const senderName = isMyMessage 
      ? 'Bạn' 
      : (item.senderId?.fullName || item.senderId?.name || displayName || 'Bệnh nhân');

    return (
      <View className="px-4 mb-2">
        {/* Date separator */}
        {showDate && (
          <View className="items-center my-4">
            <View className="px-4 py-1 rounded-full" style={{ backgroundColor: theme.card }}>
              <Text className="text-xs" style={{ color: theme.text.secondary }}>
                {new Date(item.createdAt).toLocaleDateString('vi-VN', { 
                  day: '2-digit', 
                  month: '2-digit',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>
        )}

        {/* Message bubble */}
        <View className={`flex-row ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
          {/* Avatar for received messages */}
          {!isMyMessage && (
            <View className="mr-2">
              {item.senderId?.avatar ? (
                <Image
                  source={{ uri: item.senderId.avatar }}
                  className="w-8 h-8 rounded-full"
                  contentFit="cover"
                />
              ) : (
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Text className="text-sm font-bold" style={{ color: Colors.primary[600] }}>
                    {senderName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View className={`max-w-[75%] ${isMyMessage ? 'items-end' : 'items-start'}`}>
            {/* Sender name for received messages */}
            {!isMyMessage && (
              <Text className="text-xs mb-1 ml-2" style={{ color: theme.text.secondary }}>
                {senderName}
              </Text>
            )}

            {/* Message content */}
            <View
              className="rounded-2xl px-4 py-2"
              style={{
                backgroundColor: isMyMessage ? Colors.primary[600] : theme.card,
              }}
            >
              {/* Image message */}
              {item.messageType === 'image' && item.fileUrl && (
                <Image
                  source={{ uri: item.fileUrl }}
                  className="w-48 h-48 rounded-xl mb-2"
                  contentFit="cover"
                />
              )}

              {/* Text content */}
              {item.content && (
                <Text
                  className="text-base"
                  style={{ color: isMyMessage ? 'white' : theme.text.primary }}
                >
                  {item.content}
                </Text>
              )}
            </View>

            {/* Time */}
            <Text className="text-xs mt-1 ml-2" style={{ color: theme.text.secondary }}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: theme.card }}
      >
        <Ionicons name="chatbubbles-outline" size={40} color={theme.text.secondary} />
      </View>
      <Text className="text-base font-medium mb-2" style={{ color: theme.text.primary }}>
        Bắt đầu cuộc trò chuyện
      </Text>
      <Text className="text-sm text-center px-8" style={{ color: theme.text.secondary }}>
        Gửi tin nhắn để bắt đầu trò chuyện với {displayName || 'bệnh nhân'}
      </Text>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 border-b"
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable 
          onPress={() => {
            // Always navigate back to chat list explicitly
            router.push('/(doctor)/chat' as any);
          }} 
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </Pressable>

        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
            {displayName || 'Bệnh nhân'}
          </Text>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>
            Bệnh nhân
          </Text>
        </View>

        <Pressable className="p-2" onPress={handleVoiceCall}>
          <Ionicons name="call-outline" size={24} color={Colors.primary[600]} />
        </Pressable>
        <Pressable className="p-2 ml-2" onPress={handleVideoCall}>
          <Ionicons name="videocam-outline" size={24} color={Colors.primary[600]} />
        </Pressable>
      </View>

      {/* Messages */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          className="border-t px-4 py-3"
          style={{
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 12,
          }}
        >
          {/* Selected Image Preview */}
          {selectedImage && (
            <View className="mb-2">
              <View className="relative w-24 h-24 rounded-xl overflow-hidden">
                <Image source={{ uri: selectedImage }} className="w-full h-full" contentFit="cover" />
                <Pressable
                  className="absolute top-1 right-1 w-6 h-6 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Input Row */}
          <View className="flex-row items-center gap-2">
            {/* Image Picker */}
            <Pressable
              className="p-2 rounded-full"
              style={{ backgroundColor: theme.background }}
              onPress={handlePickImage}
            >
              <Ionicons name="image-outline" size={24} color={Colors.primary[600]} />
            </Pressable>

            {/* Text Input */}
            <View
              className="flex-1 flex-row items-center px-4 py-2 rounded-full"
              style={{ backgroundColor: theme.background }}
            >
              <TextInput
                className="flex-1 text-base"
                style={{ color: theme.text.primary }}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor={theme.text.secondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
              />
            </View>

            {/* Send Button */}
            <Pressable
              className="p-2 rounded-full"
              style={{
                backgroundColor:
                  inputText.trim() || selectedImage ? Colors.primary[600] : theme.background,
              }}
              onPress={handleSendMessage}
              disabled={sending || (!inputText.trim() && !selectedImage)}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="send"
                  size={24}
                  color={inputText.trim() || selectedImage ? 'white' : theme.text.secondary}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
