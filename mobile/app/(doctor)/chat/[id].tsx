/**
 * Doctor Real-time Chat Detail Screen
 * Màn hình chat chi tiết giữa bác sĩ và bệnh nhân
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CallButton from "@/components/call/CallButton";
import CallMessageBubble from "@/components/call/CallMessageBubble";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useCall } from "@/contexts/CallContext";
import { useChat } from "@/contexts/chat-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import realtimeChatService, { ChatMessage } from "@/services/realtimeChatService";
import uploadService from "@/services/uploadService";
import { apiRequest } from "@/utils/api";

// Helper to create unique message IDs
const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function DoctorChatDetail() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { session } = useAuth();
  const { refreshUnreadCount } = useChat();
  const { initiateCall, setOnCallEnded } = useCall();
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
  const [socketConnected, setSocketConnected] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayAvatar, setDisplayAvatar] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);

  const conversationId = params.id;

  // Set initial display name from params or fetch from conversation
  useEffect(() => {
    console.log("🔍 Chat Detail Params:", {
      id: params.id,
      patientId: params.patientId,
      patientName: params.patientName,
      patientAvatar: params.patientAvatar,
    });

    if (params.patientName) {
      setDisplayName(params.patientName);
      console.log("✅ Display name set to:", params.patientName);
    } else {
      setDisplayName("Bệnh nhân");
      console.log("⚠️ No patient name in params, using default");
    }

    if (params.patientAvatar) {
      setDisplayAvatar(params.patientAvatar);
    }
  }, [params.patientName, params.patientAvatar]);

  // Join conversation and load messages
  useEffect(() => {
    if (!conversationId || !session?.user?._id || !session?.token) return;

    const initChat = async () => {
      try {
        setLoading(true);

        // Connect to socket first if not connected
        const socket = realtimeChatService.getSocket();
        if (!socket || !socket.connected) {
          console.log('📡 [Doctor Chat Detail] Connecting to socket...');
          try {
            await realtimeChatService.connect(session.token, session.user._id, 'doctor');
            // Wait a bit for socket to be fully ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const connectedSocket = realtimeChatService.getSocket();
            if (connectedSocket && connectedSocket.connected) {
              console.log('✅ [Doctor Chat Detail] Socket connected successfully');
              setSocketConnected(true);
            } else {
              console.error('❌ [Doctor Chat Detail] Socket connection failed');
              setSocketConnected(false);
            }
          } catch (connectError) {
            console.error('❌ [Doctor Chat Detail] Socket connect error:', connectError);
            setSocketConnected(false);
          }
        } else {
          console.log('✅ [Doctor Chat Detail] Socket already connected');
          setSocketConnected(true);
        }

        // Join conversation room
        realtimeChatService.joinConversation(conversationId);

        // Setup message listeners FIRST
        setupMessageListeners();

        // Load messages via REST API
        const userId = session.user._id;
        const userRole = 'doctor';
        
        console.log('📡 [Doctor Chat Detail] Loading messages via REST API...');
        
        const response = await apiRequest<ChatMessage[]>(
          `/realtime-chat/conversations/${conversationId}/messages?limit=100&sort=createdAt&userId=${userId}&userRole=${userRole}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          }
        );

        console.log('✅ [Doctor Chat Detail] Response:', response);

        let messagesData: ChatMessage[] = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            messagesData = response.data;
          } else if (typeof response.data === 'object' && 'messages' in response.data) {
            messagesData = (response.data as any).messages || [];
          }
        }

        console.log(`✅ [Doctor Chat Detail] Loaded ${messagesData.length} messages`);
        
        // Messages are sorted oldest first (API returns with sort=createdAt)
        setMessages(messagesData);
        setLoading(false);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Refresh unread count
        refreshUnreadCount();

        console.log("✅ Chat detail initialized");
      } catch (error) {
        console.error("❌ Error initializing chat detail:", error);
        setLoading(false);
      }
    };

    initChat();

    return () => {
      // Leave conversation when unmounting
      realtimeChatService.leaveConversation(conversationId);
    };
  }, [conversationId, session]);

  // Setup call ended callback
  useEffect(() => {
    if (!params.patientId || !setOnCallEnded) return;

    const handleCallEnded = (callInfo: {
      receiverId: string;
      receiverName: string;
      isVideoCall: boolean;
      callStatus: "missed" | "answered" | "rejected" | "completed";
      callDuration?: number;
      isOutgoing: boolean;
    }) => {
      // Only create message if this is the chat with the patient we called/received call from
      if (callInfo.receiverId !== params.patientId) return;

      const callMessage: ChatMessage = {
        _id: createId(),
        content: callInfo.isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại",
        senderId: {
          _id: callInfo.isOutgoing ? session?.user?._id || "" : params.patientId,
          fullName: callInfo.isOutgoing ? "Bạn" : callInfo.receiverName,
          avatar: callInfo.isOutgoing ? session?.user?.avatar : params.patientAvatar,
        },
        senderRole: callInfo.isOutgoing ? "doctor" : "patient",
        messageType: "call",
        createdAt: new Date().toISOString(),
        isRead: true,
        callData: {
          callType: callInfo.isVideoCall ? "video" : "audio",
          callStatus: callInfo.callStatus,
          callDuration: callInfo.callDuration || 0,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        },
      };

      setMessages((prev) => [...prev, callMessage]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    setOnCallEnded(handleCallEnded);

    return () => {
      setOnCallEnded(undefined);
    };
  }, [params.patientId, params.patientAvatar, session, setOnCallEnded]);

  // Setup message event listeners
  const setupMessageListeners = () => {
    const socket = realtimeChatService.getSocket();
    if (!socket) return;

    // New message received
    socket.on("newMessage", (data: { message: ChatMessage; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        console.log("📨 New message received");
        
        // Check if this message already exists (to avoid duplicates from our own temp message)
        setMessages((prev) => {
          const exists = prev.some(msg => msg._id === data.message._id);
          if (exists) {
            // Message already exists, don't add duplicate
            return prev;
          }
          
          // Check if we have a temp message with same content sent recently (within 5 seconds)
          const now = new Date().getTime();
          const tempMessageIndex = prev.findIndex(msg => {
            const msgTime = new Date(msg.createdAt).getTime();
            const isRecent = (now - msgTime) < 5000;
            const isSameContent = msg.content === data.message.content;
            const isSameSender = msg.senderId?._id === data.message.senderId?._id;
            return isRecent && isSameContent && isSameSender;
          });
          
          if (tempMessageIndex !== -1) {
            // Replace temp message with real one
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = data.message;
            return newMessages;
          }
          
          // New message, add it
          return [...prev, data.message];
        });

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

    // Check if socket is connected
    if (!socketConnected) {
      Alert.alert("Lỗi", "Đang kết nối đến máy chủ. Vui lòng thử lại sau.");
      return;
    }

    const messageText = inputText.trim();
    const imageToSend = selectedImage;
    const tempMessageId = createId();

    // Add temporary message to UI immediately
    const tempMessage: ChatMessage = {
      _id: tempMessageId,
      content: messageText || "Đang gửi hình ảnh...",
      senderId: {
        _id: session?.user?._id || "",
        fullName: "Bạn",
        avatar: session?.user?.avatar,
      },
      senderRole: "doctor",
      messageType: imageToSend ? "image" : "text",
      createdAt: new Date().toISOString(),
      isRead: false,
      fileUrl: imageToSend, // Show image preview immediately
    };

    setMessages((prev) => [...prev, tempMessage]);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Clear input immediately for better UX
    setInputText("");
    setSelectedImage(null);

    try {
      setSending(true);

      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;

      // Upload image if selected
      if (imageToSend) {
        const imgFileName = `chat_${Date.now()}.jpg`;
        const uploadResult = await uploadService.uploadImage(
          {
            uri: imageToSend,
            mimeType: "image/jpeg",
            fileName: imgFileName,
          },
          conversationId
        );

        if (uploadResult.success && uploadResult.url) {
          fileUrl = uploadResult.url;
          fileName = uploadResult.url.split("/").pop() || imgFileName;
          fileType = "image";
        }
      }

      // Send message without waiting for response (fire and forget)
      realtimeChatService
        .sendMessage(
          conversationId,
          messageText || "Đã gửi hình ảnh",
          imageToSend ? "image" : "text",
          fileUrl,
          fileName,
          fileType
        )
        .then(() => {
          console.log("✅ Message sent successfully");
        })
        .catch(async (sendError: any) => {
          // If socket not connected, try to reconnect once
          if (sendError.message?.includes('Socket not connected')) {
            console.log('🔄 [Doctor Chat Detail] Socket disconnected, trying to reconnect...');
            
            try {
              await realtimeChatService.connect(session.token, session.user._id, 'doctor');
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Retry sending
              await realtimeChatService.sendMessage(
                conversationId,
                messageText || "Đã gửi hình ảnh",
                imageToSend ? "image" : "text",
                fileUrl,
                fileName,
                fileType
              );
              
              setSocketConnected(true);
              console.log("✅ Message sent after reconnect");
            } catch (retryError) {
              console.error("❌ Failed to send after reconnect:", retryError);
              Alert.alert("Lỗi", "Không thể gửi tin nhắn. Vui lòng thử lại.");
            }
          } else {
            console.error("❌ Error sending message:", sendError);
            Alert.alert("Lỗi", "Không thể gửi tin nhắn. Vui lòng thử lại.");
          }
        });

    } catch (error) {
      console.error("Error preparing message:", error);
      Alert.alert("Lỗi", "Không thể chuẩn bị tin nhắn. Vui lòng thử lại.");
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
      console.error("Error picking image:", error);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  // Render message bubble
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMyMessage = item.senderId?._id === session?.user?._id || item.senderRole === "doctor";
    const showDate =
      index === 0 || new Date(item.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

    const senderName = isMyMessage
      ? "Bạn"
      : item.senderId?.fullName || item.senderId?.name || displayName || "Bệnh nhân";

    // Check if this is a call message (either from messageType or from callData)
    const isCallMessage = item.messageType === "call" || !!item.callData;
    
    let callType: "audio" | "video" | undefined;
    let callStatus: "missed" | "answered" | "rejected" | "completed" | undefined;
    let callDuration: number | undefined;

    if (isCallMessage && item.callData) {
      // Use callData if available
      callType = item.callData.callType;
      callStatus = item.callData.callStatus;
      callDuration = item.callData.callDuration;
    } else if (isCallMessage) {
      // Fallback: detect from content for backward compatibility
      const lowerContent = item.content?.toLowerCase() || "";
      
      // Detect call type
      callType = lowerContent.includes("video") || lowerContent.includes("gọi video") ? "video" : "audio";
      
      // Detect call status
      if (lowerContent.includes("nhỡ") || lowerContent.includes("missed")) {
        callStatus = "missed";
      } else if (lowerContent.includes("từ chối") || lowerContent.includes("rejected")) {
        callStatus = "rejected";
      } else if (lowerContent.includes("hoàn thành") || lowerContent.includes("completed")) {
        callStatus = "completed";
      } else if (lowerContent.includes("trả lời") || lowerContent.includes("answered")) {
        callStatus = "answered";
      } else {
        callStatus = "completed";
      }

      // Extract duration (format: "X phút Y giây" or "X:Y")
      const durationMatch = lowerContent.match(/(\d+)\s*phút\s*(\d+)\s*giây/) ||
                           lowerContent.match(/(\d+):(\d+)/);
      if (durationMatch) {
        const mins = parseInt(durationMatch[1], 10);
        const secs = parseInt(durationMatch[2], 10);
        callDuration = mins * 60 + secs;
      }
    }

    return (
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        {/* Date separator */}
        {showDate && (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12, backgroundColor: theme.card }}>
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        )}

        {/* Call message bubble */}
        {isCallMessage && callType && callStatus ? (
          <View style={{ alignItems: isMyMessage ? 'flex-end' : 'flex-start' }}>
            <CallMessageBubble
              callType={callType}
              callStatus={callStatus}
              callDuration={callDuration}
              isOutgoing={isMyMessage}
              timestamp={formatTime(item.createdAt)}
            />
          </View>
        ) : (
          /* Regular message bubble */
          <View 
            style={{ 
              flexDirection: 'row',
              justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
              marginBottom: 4
            }}
          >
          {/* Avatar for received messages */}
          {!isMyMessage && (
            <View style={{ marginRight: 8 }}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" />
              ) : (
                <View
                  style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary[100] }}
                >
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.primary[600] }}>
                    {senderName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View 
            style={{ maxWidth: '75%', alignItems: isMyMessage ? 'flex-end' : 'flex-start' }}
          >
            {/* Sender name for received messages */}
            {!isMyMessage && (
              <Text style={{ fontSize: 11, marginBottom: 4, marginLeft: 8, color: theme.text.secondary }}>
                {senderName}
              </Text>
            )}

            {/* Message content */}
            <View
              style={{
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: isMyMessage ? Colors.primary[600] : theme.card,
                borderWidth: isMyMessage ? 0 : 1,
                borderColor: isMyMessage ? 'transparent' : theme.border,
              }}
            >
              {/* Image message */}
              {item.messageType === "image" && item.fileUrl && (
                <View style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden' }}>
                  <Image source={{ uri: item.fileUrl }} style={{ width: 192, height: 192 }} contentFit="cover" />
                </View>
              )}

              {/* Text content */}
              {item.content && (
                <Text style={{ fontSize: 15, lineHeight: 22, color: isMyMessage ? "white" : theme.text.primary }}>
                  {item.content}
                </Text>
              )}
            </View>

            {/* Time */}
            <Text style={{ fontSize: 10, marginTop: 4, marginLeft: 8, color: theme.text.secondary }}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
        )}
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: theme.card }}>
        <Ionicons name="chatbubbles-outline" size={40} color={theme.text.secondary} />
      </View>
      <Text className="text-base font-medium mb-2" style={{ color: theme.text.primary }}>
        Bắt đầu cuộc trò chuyện
      </Text>
      <Text className="text-sm text-center px-8" style={{ color: theme.text.secondary }}>
        Gửi tin nhắn để bắt đầu trò chuyện với {displayName || "bệnh nhân"}
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
            router.push("/(doctor)/chat" as any);
          }}
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </Pressable>

        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
            {displayName || "Bệnh nhân"}
          </Text>
          <Text className="text-sm" style={{ color: theme.text.secondary }}>
            Bệnh nhân
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          {params.patientId && displayName && (
            <>
              <CallButton
                receiverId={params.patientId}
                receiverName={displayName}
                receiverRole="patient"
                receiverAvatar={displayAvatar}
                isVideoCall={false}
                size={22}
                color={Colors.primary[600]}
                backgroundColor="transparent"
              />
              <CallButton
                receiverId={params.patientId}
                receiverName={displayName}
                receiverRole="patient"
                receiverAvatar={displayAvatar}
                isVideoCall={true}
                size={22}
                color={Colors.primary[600]}
                backgroundColor="transparent"
              />
            </>
          )}
        </View>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
                  style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Input Row */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
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
                backgroundColor: inputText.trim() || selectedImage ? Colors.primary[600] : theme.background,
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
                  color={inputText.trim() || selectedImage ? "white" : theme.text.secondary}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
