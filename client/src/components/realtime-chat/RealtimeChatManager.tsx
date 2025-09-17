"use client";

import React, { useState, useEffect } from "react";
import { ChatButton } from "./ChatButton";
import { ChatWindow } from "./ChatWindow";
import { ConversationList } from "./ConversationList";
import { useRealtimeChat } from "@/contexts/RealtimeChatContext";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "patient" | "doctor";
  specialization?: string;
}

interface RealtimeChatManagerProps {
  currentUser: User;
  authToken: string;
  doctorsList?: User[]; // For patients to see available doctors
  patientsList?: User[]; // For doctors to see their patients
}

export const RealtimeChatManager: React.FC<RealtimeChatManagerProps> = ({
  currentUser,
  authToken,
  doctorsList = [],
  patientsList = [],
}) => {
  const {
    isConnected,
    isLoading,
    conversations,
    activeConversation,
    messages,
    isTyping,
    connectToChat,
    disconnectFromChat,
    startConversation,
    selectConversation,
    sendMessage,
    markMessageAsRead,
    setTypingStatus,
  } = useRealtimeChat();

  const [showConversationList, setShowConversationList] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);

  // Connect to chat on mount
  useEffect(() => {
    if (currentUser && authToken && !isConnected && !isLoading) {
      connectToChat(authToken, currentUser);
    }

    return () => {
      if (isConnected) {
        disconnectFromChat();
      }
    };
  }, [currentUser, authToken, isConnected, isLoading, connectToChat, disconnectFromChat]);

  // Handle starting a new chat
  const handleStartChat = async (otherUserId: string) => {
    try {
      const conversation = await startConversation(otherUserId);
      selectConversation(conversation);
      setShowChatWindow(true);
      setShowConversationList(false);
    } catch (error) {
      console.error("Failed to start chat:", error);
      // You might want to show a toast notification here
    }
  };

  // Handle selecting a conversation from the list
  const handleSelectConversation = (conversation: any) => {
    selectConversation(conversation);
    setShowChatWindow(true);
    setShowConversationList(false);
  };

  // Handle showing conversations list
  const handleShowConversations = () => {
    setShowConversationList(true);
    setShowChatWindow(false);
  };

  // Handle closing chat window
  const handleCloseChatWindow = () => {
    setShowChatWindow(false);
  };

  // Handle closing conversation list
  const handleCloseConversationList = () => {
    setShowConversationList(false);
  };

  // Handle sending a message
  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };

  // Handle marking message as read
  const handleMarkMessageRead = (messageId: string) => {
    markMessageAsRead(messageId);
  };

  // Handle typing status
  const handleTyping = (typing: boolean) => {
    setTypingStatus(typing);
  };

  if (!isConnected && isLoading) {
    return (
      <div
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "var(--color-primary-600)", color: "white" }}
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isConnected) {
    return null; // Or show a connection error message
  }

  return (
    <>
      {/* Chat Button - Always visible when connected */}
      <ChatButton
        currentUser={currentUser}
        onStartChat={handleStartChat}
        doctorsList={doctorsList}
        patientsList={patientsList}
        onShowConversations={handleShowConversations}
      />

      {/* Conversation List */}
      {showConversationList && (
        <ConversationList
          conversations={conversations}
          currentUserId={currentUser._id}
          currentUserRole={currentUser.role}
          onSelectConversation={handleSelectConversation}
          onClose={handleCloseConversationList}
          isVisible={showConversationList}
        />
      )}

      {/* Chat Window */}
      {showChatWindow && activeConversation && (
        <ChatWindow
          conversation={activeConversation}
          currentUserId={currentUser._id}
          currentUserRole={currentUser.role}
          onClose={handleCloseChatWindow}
          onSendMessage={handleSendMessage}
          onMarkMessageRead={handleMarkMessageRead}
          messages={messages}
          isTyping={isTyping}
          onTyping={handleTyping}
        />
      )}
    </>
  );
};
