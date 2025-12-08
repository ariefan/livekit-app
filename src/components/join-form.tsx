"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface JoinFormProps {
  onJoin: (room: string, username: string) => void;
  isLoading: boolean;
}

interface RecentRoom {
  name: string;
  lastJoined: number;
}

export function JoinForm({ onJoin, isLoading }: JoinFormProps) {
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    // Load recent rooms from localStorage
    const stored = localStorage.getItem("recentRooms");
    if (stored) {
      try {
        setRecentRooms(JSON.parse(stored));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Load saved username
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const saveRoom = (roomName: string) => {
    const updated = [
      { name: roomName, lastJoined: Date.now() },
      ...recentRooms.filter((r) => r.name !== roomName),
    ].slice(0, 5); // Keep last 5 rooms

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

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Join Video Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
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
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="room" className="text-sm font-medium">
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Joining..." : "Join Room"}
            </Button>
          </form>

          {recentRooms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recent Rooms
              </h3>
              <div className="space-y-2">
                {recentRooms.map((r) => (
                  <div
                    key={r.name}
                    onClick={() => handleQuickJoin(r.name)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatTime(r.lastJoined)}
                      </Badge>
                    </div>
                    <button
                      onClick={(e) => removeRoom(r.name, e)}
                      className="text-muted-foreground hover:text-destructive text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
