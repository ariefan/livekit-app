"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Film, Clock, HardDrive, Share2, Download, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Recording {
  id: string;
  roomName: string;
  s3Key: string;
  egressId: string;
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

export function RecordingsList({
  recordings: initialRecordings,
}: RecordingsListProps) {
  const { toast } = useToast();
  const [recordings, setRecordings] = useState(initialRecordings);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Auto-cleanup: sync recording statuses with LiveKit on mount
  useEffect(() => {
    const hasRecordingStatus = initialRecordings.some(
      (r) => r.status === "recording"
    );
    if (!hasRecordingStatus) return;

    const cleanup = async () => {
      try {
        const res = await fetch("/api/recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cleanup" }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.cleaned > 0) {
            // Refresh the page to get updated statuses
            window.location.reload();
          }
        }
      } catch (e) {
        console.error("Failed to cleanup recordings:", e);
      }
    };

    cleanup();
  }, [initialRecordings]);

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

  const formatDateTimeShort = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deleteRecording = async (recordingId: string, roomName: string) => {
    if (
      !confirm(`Delete recording from "${roomName}"? This cannot be undone.`)
    ) {
      return;
    }

    setIsDeleting(recordingId);
    try {
      const res = await fetch(`/api/recordings/${recordingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove from local state
        setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
        toast("Recording deleted", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to delete recording", "error");
      }
    } catch (e) {
      console.error("Failed to delete recording:", e);
      toast("Failed to delete recording", "error");
    } finally {
      setIsDeleting(null);
    }
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
        navigator.clipboard.writeText(shareUrl);
        toast("Share link copied to clipboard!", "success");
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
          <Film className="w-16 h-16 mx-auto" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-medium mb-2">No recordings yet</h3>
        <p className="text-muted-foreground">
          Start a meeting and record it to see your recordings here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="space-y-4 md:hidden">
        {recordings.map((recording) => (
          <Card key={recording.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{recording.roomName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTimeShort(recording.createdAt)}
                  </p>
                </div>
                {getStatusBadge(recording.status)}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(recording.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5" />
                  {formatSize(recording.size)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2">
                {recording.status === "completed" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateShareLink(recording.id)}
                      disabled={isGenerating === recording.id}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      {isGenerating === recording.id ? "..." : "Share"}
                    </Button>
                    <Button size="sm" asChild>
                      <a href={`/api/recordings/${recording.id}/download`}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    deleteRecording(recording.id, recording.roomName)
                  }
                  disabled={isDeleting === recording.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Room</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings.map((recording) => (
              <TableRow key={recording.id}>
                <TableCell>
                  <div className="font-medium">{recording.roomName}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDuration(recording.duration)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatSize(recording.size)}
                </TableCell>
                <TableCell>{getStatusBadge(recording.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(recording.createdAt)}
                </TableCell>
                <TableCell className="text-right">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        deleteRecording(recording.id, recording.roomName)
                      }
                      disabled={isDeleting === recording.id}
                    >
                      {isDeleting === recording.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
