"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [allowGuests, setAllowGuests] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: name || `Meeting ${new Date().toLocaleDateString()}`,
        allowGuests,
        password: password || undefined,
      };

      if (mode === "scheduled" && scheduledDate && scheduledTime) {
        body.isScheduled = true;
        body.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create room");
        return;
      }

      onClose();
      resetForm();

      if (mode === "instant") {
        router.push(`/room/${data.room.slug}`);
      } else {
        router.push("/dashboard/rooms");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setMode("instant");
    setName("");
    setPassword("");
    setAllowGuests(true);
    setScheduledDate("");
    setScheduledTime("");
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          onClose();
          resetForm();
        }}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Create a Room</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("instant")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                mode === "instant"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Instant Meeting
            </button>
            <button
              type="button"
              onClick={() => setMode("scheduled")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                mode === "scheduled"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Schedule Meeting
            </button>
          </div>

          {/* Room name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Room Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Meeting"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Scheduled date/time */}
          {mode === "scheduled" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required={mode === "scheduled"}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required={mode === "scheduled"}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Password (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Room Password (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for no password"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Allow guests toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Allow Guests</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Anyone with the link can join without logging in
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowGuests(!allowGuests)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                allowGuests ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  allowGuests ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
            >
              {isLoading
                ? "Creating..."
                : mode === "instant"
                  ? "Start Meeting"
                  : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
