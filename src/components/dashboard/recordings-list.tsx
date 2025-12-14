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
import { Film, Clock, HardDrive, Share2, Download, Trash2, ChevronDown, ChevronRight, MessageSquare, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
  chatLog: string | null;
  transcript: string | null;
  sessionId: string | null;
}

interface RecordingsListProps {
  recordings: Recording[];
}

// Group recordings by session (room + date)
function groupBySession(recordings: Recording[]) {
  const grouped = new Map<string, Recording[]>();

  recordings.forEach((rec) => {
    // Create session key from room name and date
    const date = new Date(rec.createdAt);
    const sessionKey = `${rec.roomName}-${date.toLocaleDateString()}`;

    if (!grouped.has(sessionKey)) {
      grouped.set(sessionKey, []);
    }
    grouped.get(sessionKey)!.push(rec);
  });

  return Array.from(grouped.entries()).map(([key, recs]) => ({
    sessionKey: key,
    roomName: recs[0].roomName,
    date: recs[0].createdAt,
    recordings: recs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  }));
}

export function RecordingsList({
  recordings: initialRecordings,
}: RecordingsListProps) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [recordings, setRecordings] = useState(initialRecordings);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedRecordings, setExpandedRecordings] = useState<Set<string>>(new Set());

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
    const confirmed = await confirm({
      title: "Delete Recording",
      description: `Are you sure you want to delete the recording from "${roomName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

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

  const toggleSession = (sessionKey: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) {
        next.delete(sessionKey);
      } else {
        next.add(sessionKey);
      }
      return next;
    });
  };

  const toggleRecording = (recordingId: string) => {
    setExpandedRecordings((prev) => {
      const next = new Set(prev);
      if (next.has(recordingId)) {
        next.delete(recordingId);
      } else {
        next.add(recordingId);
      }
      return next;
    });
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

  const sessions = groupBySession(recordings);

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
    <div className="space-y-6">
      {sessions.map((session) => (
        <Card key={session.sessionKey} className="overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
            onClick={() => toggleSession(session.sessionKey)}
          >
            <div className="flex items-center gap-3">
              {expandedSessions.has(session.sessionKey) ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold">{session.roomName}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(session.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })} • {session.recordings.length} recording{session.recordings.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {expandedSessions.has(session.sessionKey) && (
            <CardContent className="p-0 border-t">
              {session.recordings.map((recording) => (
                <div key={recording.id} className="border-b last:border-b-0">
                  {/* Recording header */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Film className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">
                            {formatDateTime(recording.createdAt)}
                          </span>
                          {getStatusBadge(recording.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(recording.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3.5 w-3.5" />
                            {formatSize(recording.size)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
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

                              {/* Toggle chat/transcript button */}
                              {(recording.chatLog || recording.transcript) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRecording(recording.id)}
                                >
                                  {expandedRecordings.has(recording.id) ? (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-1" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="h-4 w-4 mr-1" />
                                      View Details
                                    </>
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteRecording(recording.id, recording.roomName)}
                            disabled={isDeleting === recording.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {isDeleting === recording.id ? "..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable chat and transcript */}
                    {expandedRecordings.has(recording.id) && (
                      <div className="mt-4 space-y-4 pt-4 border-t">
                        {recording.chatLog && (
                          <div>
                            <h4 className="flex items-center gap-2 font-medium mb-2">
                              <MessageSquare className="h-4 w-4" />
                              Chat Messages
                            </h4>
                            <div className="bg-muted rounded-lg p-3 max-h-64 overflow-y-auto">
                              {JSON.parse(recording.chatLog).map((msg: any, idx: number) => (
                                <div key={idx} className="mb-2 last:mb-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium">{msg.from}:</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-0.5">{msg.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {recording.transcript && (
                          <div>
                            <h4 className="flex items-center gap-2 font-medium mb-2">
                              <FileText className="h-4 w-4" />
                              Transcript
                            </h4>
                            <div className="bg-muted rounded-lg p-3 max-h-64 overflow-y-auto">
                              <p className="text-sm whitespace-pre-wrap">{recording.transcript}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
