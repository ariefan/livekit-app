"use client";

import { useState } from "react";
import { JoinForm } from "@/components/join-form";
import { VideoRoom } from "@/components/video-room";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (room: string, username: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, username }),
      });

      if (!response.ok) {
        throw new Error("Failed to get token");
      }

      const { token } = await response.json();
      setToken(token);
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setToken(null);
  };

  if (token) {
    return <VideoRoom token={token} onDisconnect={handleDisconnect} />;
  }

  return <JoinForm onJoin={handleJoin} isLoading={isLoading} />;
}
