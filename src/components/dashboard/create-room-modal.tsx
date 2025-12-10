"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => {
          onClose();
          resetForm();
        }}
      />

      {/* Modal */}
      <div className="relative bg-card border rounded-lg shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Create a Room</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "instant" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("instant")}
            >
              Instant Meeting
            </Button>
            <Button
              type="button"
              variant={mode === "scheduled" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("scheduled")}
            >
              Schedule Meeting
            </Button>
          </div>

          {/* Room name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Room Name (optional)
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Meeting"
            />
          </div>

          {/* Scheduled date/time */}
          {mode === "scheduled" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required={mode === "scheduled"}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required={mode === "scheduled"}
                />
              </div>
            </div>
          )}

          {/* Password (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Room Password (optional)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for no password"
            />
          </div>

          {/* Allow guests toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Allow Guests</div>
              <div className="text-xs text-muted-foreground">
                Anyone with the link can join without logging in
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowGuests(!allowGuests)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                allowGuests ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  allowGuests ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onClose();
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading
                ? "Creating..."
                : mode === "instant"
                  ? "Start Meeting"
                  : "Schedule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
