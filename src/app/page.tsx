"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { JoinForm } from "@/components/join-form";
import { PreJoin } from "@/components/pre-join";
import { VideoRoom } from "@/components/video-room";
import { UserMenu } from "@/components/auth/user-menu";

type AppState = "join" | "preJoin" | "room";

interface JoinInfo {
  room: string;
  username: string;
}

export default function Home() {
  const { data: session, status } = useSession();
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

  const handleJoin = async () => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-bold text-blue-600">Video Chat</div>
            <div className="flex items-center gap-4">
              {status === "loading" ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Dashboard
                  </Link>
                  <UserMenu />
                </>
              ) : (
                <UserMenu />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex items-center justify-center min-h-screen pt-16">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Video Chat</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {session
                ? "Join a room or go to dashboard to create one"
                : "Join a room as a guest or sign in to create rooms"}
            </p>
          </div>

          <JoinForm
            onJoin={handleFormSubmit}
            isLoading={isLoading}
            defaultUsername={session?.user.name || ""}
          />

          {!session && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Want to create and manage your own rooms?
              </p>
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign in to get started
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
