"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinFormProps {
  onJoin: (room: string, username: string) => void;
  isLoading: boolean;
  defaultUsername?: string;
}

interface RecentRoom {
  name: string;
  lastJoined: number;
}

export function JoinForm({ onJoin, isLoading, defaultUsername = "" }: JoinFormProps) {
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState(defaultUsername);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recentRooms");
    if (stored) {
      try {
        setRecentRooms(JSON.parse(stored));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    if (!defaultUsername) {
      const savedUsername = localStorage.getItem("username");
      if (savedUsername) {
        setUsername(savedUsername);
      }
    }
  }, [defaultUsername]);

  useEffect(() => {
    if (defaultUsername) {
      setUsername(defaultUsername);
    }
  }, [defaultUsername]);

  const saveRoom = (roomName: string) => {
    const updated = [
      { name: roomName, lastJoined: Date.now() },
      ...recentRooms.filter((r) => r.name !== roomName),
    ].slice(0, 5);

    setRecentRooms(updated);
    localStorage.setItem("recentRooms", JSON.stringify(updated));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (room.trim() && username.trim()) {
      saveRoom(room.trim());
      localStorage.setItem("username", username.trim());
      onJoin(room.trim(), username.trim());
    }
  };

  const handleQuickJoin = (roomName: string) => {
    if (username.trim()) {
      saveRoom(roomName);
      localStorage.setItem("username", username.trim());
      onJoin(roomName, username.trim());
    } else {
      setRoom(roomName);
    }
  };

  const removeRoom = (roomName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentRooms.filter((r) => r.name !== roomName);
    setRecentRooms(updated);
    localStorage.setItem("recentRooms", JSON.stringify(updated));
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return days + "d ago";
    if (hours > 0) return hours + "h ago";
    if (minutes > 0) return minutes + "m ago";
    return "Just now";
  };

  return (
    <div className="w-full">
      <div className="bg-card rounded-2xl border p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - Input form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-muted-foreground">
                  Your Name
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="room" className="text-sm font-medium text-muted-foreground">
                  Room Name
                </label>
                <Input
                  id="room"
                  type="text"
                  placeholder="Enter room name"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-background"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5"
                disabled={isLoading || !room.trim() || !username.trim()}
              >
                {isLoading ? "Joining..." : "Join Room"}
              </Button>
            </form>
          </div>

          {/* Right column - Recent rooms */}
          <div className={recentRooms.length === 0 ? "hidden md:block" : ""}>
            <div className="md:border-l md:pl-6 md:border-border h-full">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Rooms</h3>
              {recentRooms.length > 0 ? (
                <div className="space-y-2">
                  {recentRooms.map((r) => (
                    <div
                      key={r.name}
                      onClick={() => !isLoading && handleQuickJoin(r.name)}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                    >
                      <div>
                        <span className="text-sm font-medium">{r.name}</span>
                        <p className="text-muted-foreground text-xs">{formatTime(r.lastJoined)}</p>
                      </div>
                      <button
                        onClick={(e) => removeRoom(r.name, e)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/50">No recent rooms yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
