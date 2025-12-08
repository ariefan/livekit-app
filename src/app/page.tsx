"use client";

import { useState } from "react";
import { JoinForm } from "@/components/join-form";
import { PreJoin } from "@/components/pre-join";
import { VideoRoom } from "@/components/video-room";

type AppState = "join" | "preJoin" | "room";

interface JoinInfo {
  room: string;
  username: string;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("join");
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (room: string, username: string) => {
    setJoinInfo({ room, username });
    setAppState("preJoin");
  };

  const handlePreJoinBack = () => {
    setAppState("join");
  };

  const handleJoin = async (audioEnabled: boolean, videoEnabled: boolean) => {
    if (!joinInfo) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: joinInfo.room,
          username: joinInfo.username,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get token");
      }

      const { token } = await response.json();
      setToken(token);
      setAppState("room");
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setToken(null);
    setJoinInfo(null);
    setAppState("join");
  };

  if (appState === "room" && token && joinInfo) {
    return <VideoRoom token={token} roomName={joinInfo.room} onDisconnect={handleDisconnect} />;
  }

  if (appState === "preJoin" && joinInfo) {
    return (
      <PreJoin
        username={joinInfo.username}
        roomName={joinInfo.room}
        onJoin={handleJoin}
        onBack={handlePreJoinBack}
        isLoading={isLoading}
      />
    );
  }

  return <JoinForm onJoin={handleFormSubmit} isLoading={isLoading} />;
}
