"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Recording {
  id: string;
  roomName: string;
  s3Key: string;
  duration: number | null;
  size: number | null;
  status: string;
  shareToken: string | null;
  shareExpires: Date | null;
  createdAt: Date;
}

interface RecordingsListProps {
  recordings: Recording[];
}

export function RecordingsList({ recordings }: RecordingsListProps) {
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generateShareLink = async (recordingId: string) => {
    setIsGenerating(recordingId);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/share`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${window.location.origin}/recording/${data.shareToken}`;
        setShareLinks((prev) => ({ ...prev, [recordingId]: shareUrl }));
        navigator.clipboard.writeText(shareUrl);
        alert("Share link copied to clipboard!");
      }
    } finally {
      setIsGenerating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-600 hover:bg-green-600 text-white">
            {status}
          </Badge>
        );
      case "recording":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-600 text-white">
            {status}
          </Badge>
        );
      default:
        return <Badge variant="destructive">{status}</Badge>;
    }
  };

  if (recordings.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-12 text-center">
        <div className="text-muted-foreground mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No recordings yet</h3>
        <p className="text-muted-foreground">
          Start a meeting and record it to see your recordings here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Room
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date & Time
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {recordings.map((recording) => (
            <tr key={recording.id} className="hover:bg-muted/30">
              <td className="px-6 py-4">
                <div className="font-medium">{recording.roomName}</div>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {formatDuration(recording.duration)}
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {formatSize(recording.size)}
              </td>
              <td className="px-6 py-4">
                {getStatusBadge(recording.status)}
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {formatDateTime(recording.createdAt)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {recording.status === "completed" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateShareLink(recording.id)}
                        disabled={isGenerating === recording.id}
                      >
                        {isGenerating === recording.id ? "..." : "Share"}
                      </Button>
                      <Button size="sm" asChild>
                        <a href={`/api/recordings/${recording.id}/download`}>
                          Download
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
