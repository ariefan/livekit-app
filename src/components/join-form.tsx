"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    const stored = localStorage.getItem("recentRooms");
    if (stored) {
      try {
        setRecentRooms(JSON.parse(stored));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

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

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Video Chat</h1>
          <p className="text-zinc-500 text-sm mt-1">Join or create a room to start a video call</p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-zinc-300">
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
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="room" className="text-sm font-medium text-zinc-300">
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
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
              disabled={isLoading || !room.trim() || !username.trim()}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                  Join Room
                </span>
              )}
            </Button>
          </form>

          {/* Recent Rooms */}
          {recentRooms.length > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Recent Rooms
              </h3>
              <div className="space-y-2">
                {recentRooms.map((r) => (
                  <div
                    key={r.name}
                    onClick={() => !isLoading && handleQuickJoin(r.name)}
                    className={`flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 cursor-pointer transition-all group ${
                      isLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>
                      <div>
                        <span className="text-white text-sm font-medium">{r.name}</span>
                        <p className="text-zinc-500 text-xs">{formatTime(r.lastJoined)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => removeRoom(r.name, e)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all p-1"
                      title="Remove from history"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          Powered by LiveKit
        </p>
      </div>
    </div>
  );
}
