"use client";

import { useState } from "react";

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

  if (recordings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
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
        <p className="text-gray-500 dark:text-gray-400">
          Start a meeting and record it to see your recordings here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Room
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {recordings.map((recording) => (
            <tr key={recording.id}>
              <td className="px-6 py-4">
                <div className="font-medium">{recording.roomName}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDuration(recording.duration)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatSize(recording.size)}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    recording.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : recording.status === "recording"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {recording.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(recording.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {recording.status === "completed" && (
                    <>
                      <button
                        onClick={() => generateShareLink(recording.id)}
                        disabled={isGenerating === recording.id}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                      >
                        {isGenerating === recording.id ? "..." : "Share"}
                      </button>
                      <a
                        href={`/api/recordings/${recording.id}/download`}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        Download
                      </a>
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
