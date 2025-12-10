"use client";

import { useState } from "react";
import { VideoRoom } from "@/components/video-room";
import { PreJoin } from "@/components/pre-join";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

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
  // Initialize display name from user's name or empty for guests
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [isEditingName, setIsEditingName] = useState(!user); // Auto-edit mode for guests
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showPreJoin, setShowPreJoin] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  // Get the username to use
  const username = displayName.trim() || user?.email || "Guest";

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
          initialAudio={audioEnabled}
          initialVideo={videoEnabled}
          isOwner={isOwner}
        />
      </div>
    );
  }

  // Show pre-join screen after form validation
  if (showPreJoin) {
    return (
      <PreJoin
        username={username}
        roomName={room.name}
        onJoin={async (audio: boolean, video: boolean) => {
          setAudioEnabled(audio);
          setVideoEnabled(video);
          setIsLoading(true);
          setError("");

          try {
            const res = await fetch("/api/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                room: room.slug,
                username,
                roomPassword: room.hasPassword ? password : undefined,
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              setError(data.error || "Failed to join room");
              setShowPreJoin(false);
              return;
            }

            setToken(data.token);
          } catch {
            setError("An error occurred. Please try again.");
            setShowPreJoin(false);
          } finally {
            setIsLoading(false);
          }
        }}
        onBack={() => setShowPreJoin(false)}
        isLoading={isLoading}
      />
    );
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate display name
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }

    // Show pre-join screen
    setShowPreJoin(true);
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

      <form onSubmit={handleNext} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Display name input - for all users */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {user ? "Display Name" : "Your Name"}
          </label>
          {user && !isEditingName ? (
            // Show name with edit button for authenticated users
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-muted rounded-lg">
                <div className="font-medium">{displayName || user.email}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingName(true)}
                title="Edit name"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            // Show input field for guests or when editing
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user ? user.name || user.email : "Enter your name"}
                autoFocus={!user}
              />
              {user && isEditingName && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingName(false);
                    if (!displayName.trim()) {
                      setDisplayName(user.name || "");
                    }
                  }}
                >
                  Done
                </Button>
              )}
            </div>
          )}
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              Signed in as {user.email}
            </p>
          )}
        </div>

        {/* Password input (only if room has password) */}
        {room.hasPassword && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Room Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
            />
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          Next
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Room code: <span className="font-mono">{room.slug}</span>
      </div>
    </div>
  );
}
