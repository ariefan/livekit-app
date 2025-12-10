"use client";

import { useState } from "react";
import { VideoRoom } from "@/components/video-room";

interface RoomJoinFormProps {
  room: {
    id: string;
    slug: string;
    name: string;
    hasPassword: boolean;
    allowGuests: boolean;
    isScheduled: boolean;
    scheduledAt: string | null;
  };
  user: {
    id: string;
    name?: string;
    email: string;
  } | null;
  isOwner: boolean;
}

export function RoomJoinForm({ room, user, isOwner }: RoomJoinFormProps) {
  const [guestName, setGuestName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // If already joined, show video room (full screen, no padding)
  if (token) {
    return (
      <div className="fixed inset-0 z-50">
        <VideoRoom
          token={token}
          roomName={room.slug}
          onDisconnect={() => {
            setToken(null);
            window.location.href = "/dashboard";
          }}
        />
      </div>
    );
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate guest name if not authenticated
    if (!user && !guestName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: room.slug,
          username: user?.name || guestName,
          roomPassword: room.hasPassword ? password : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join room");
        return;
      }

      setToken(data.token);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isScheduledFuture =
    room.isScheduled &&
    room.scheduledAt &&
    new Date(room.scheduledAt) > new Date();

  return (
    <div className="w-full max-w-md bg-card rounded-lg border p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{room.name}</h1>
        {isScheduledFuture && (
          <p className="text-sm text-muted-foreground mt-2">
            Scheduled for {new Date(room.scheduledAt!).toLocaleString()}
          </p>
        )}
        {isOwner && (
          <span className="inline-block mt-2 px-3 py-1 text-xs bg-primary/10 text-primary rounded-full">
            You are the host
          </span>
        )}
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Guest name input (only for non-authenticated users) */}
        {!user && (
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition"
            />
          </div>
        )}

        {/* Show authenticated user info */}
        {user && (
          <div className="px-4 py-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">
              Joining as
            </div>
            <div className="font-medium">{user.name || user.email}</div>
          </div>
        )}

        {/* Password input (only if room has password) */}
        {room.hasPassword && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Room Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
              className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-lg transition"
        >
          {isLoading ? "Joining..." : "Join Room"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Room code: <span className="font-mono">{room.slug}</span>
      </div>
    </div>
  );
}
