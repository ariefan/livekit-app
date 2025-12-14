"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";

interface ChatMessage {
  from: string;
  message: string;
  timestamp: number; // Unix timestamp in milliseconds
}

interface ChatTimelineProps {
  chatLog: string | null;
  recordingStartedAt: number; // Unix timestamp in milliseconds
  currentVideoTime: number; // Current playback time in seconds
  onSeek: (time: number) => void;
}

export function ChatTimeline({
  chatLog,
  recordingStartedAt,
  currentVideoTime,
  onSeek,
}: ChatTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: ChatMessage[] = chatLog ? JSON.parse(chatLog) : [];

  // Calculate relative video time for a chat timestamp
  const getVideoTime = (chatTimestamp: number): number => {
    return Math.max(0, (chatTimestamp - recordingStartedAt) / 1000);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Find the current message based on playback time
  const getCurrentMessageIndex = (): number => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageTime = getVideoTime(messages[i].timestamp);
      if (messageTime <= currentVideoTime) {
        return i;
      }
    }
    return -1;
  };

  const currentMessageIndex = getCurrentMessageIndex();

  // Auto-scroll to current message
  useEffect(() => {
    if (scrollRef.current && currentMessageIndex >= 0) {
      const currentElement = scrollRef.current.querySelector(
        `[data-message-index="${currentMessageIndex}"]`
      );
      if (currentElement) {
        currentElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentMessageIndex]);

  if (!chatLog || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">No chat messages in this recording</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div ref={scrollRef} className="p-4 space-y-2">
        {messages.map((msg, idx) => {
          const videoTime = getVideoTime(msg.timestamp);
          const isCurrent = idx === currentMessageIndex;
          const isPast = videoTime < currentVideoTime;

          return (
            <div
              key={idx}
              data-message-index={idx}
              onClick={() => onSeek(videoTime)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isCurrent
                  ? "bg-primary/20 border-l-4 border-primary"
                  : isPast
                  ? "bg-muted/50 hover:bg-muted"
                  : "bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(videoTime);
                  }}
                  className="text-xs font-mono text-primary hover:underline"
                >
                  {formatTime(videoTime)}
                </button>
                <span className="text-sm font-medium truncate">{msg.from}</span>
              </div>
              <p className="text-sm text-foreground/90">{msg.message}</p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
