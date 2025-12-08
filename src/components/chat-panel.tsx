"use client";

import { useState } from "react";
import { useChat, useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatPanel() {
  const { chatMessages, send } = useChat();
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      send(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="p-3 border-b">
        <h3 className="font-semibold">Chat</h3>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-primary">
                {msg.from?.identity || "Unknown"}:
              </span>{" "}
              <span className="text-muted-foreground">{msg.message}</span>
            </div>
          ))}
          {chatMessages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No messages yet
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button onClick={handleSend} size="sm">
          Send
        </Button>
      </div>
    </div>
  );
}
