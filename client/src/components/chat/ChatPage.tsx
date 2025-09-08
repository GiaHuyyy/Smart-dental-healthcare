"use client";

import { RealtimeChatProvider } from "@/contexts/RealtimeChatContext";
import ChatWrapper from "@/components/chat/ChatWrapper";

interface ChatPageProps {
  type: "ai" | "doctor";
}

export default function ChatPage({ type }: ChatPageProps) {
  return (
    <RealtimeChatProvider>
      <div className="h-full w-full">
        <ChatWrapper type={type} />
      </div>
    </RealtimeChatProvider>
  );
}
