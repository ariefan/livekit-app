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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-zinc-300">
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
              className="bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="room" className="text-sm font-medium text-gray-700 dark:text-zinc-300">
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
              className="bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
            disabled={isLoading || !room.trim() || !username.trim()}
          >
            {isLoading ? "Joining..." : "Join Room"}
          </Button>
        </form>

        {recentRooms.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-3">Recent Rooms</h3>
            <div className="space-y-2">
              {recentRooms.map((r) => (
                <div
                  key={r.name}
                  onClick={() => !isLoading && handleQuickJoin(r.name)}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <div>
                    <span className="text-gray-900 dark:text-white text-sm font-medium">{r.name}</span>
                    <p className="text-gray-500 dark:text-zinc-500 text-xs">{formatTime(r.lastJoined)}</p>
                  </div>
                  <button
                    onClick={(e) => removeRoom(r.name, e)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-gray-400 dark:text-zinc-600 text-xs mt-6">Powered by LiveKit</p>
    </div>
  );
}
