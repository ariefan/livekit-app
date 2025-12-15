"use client";

import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Film,
  Clock,
  HardDrive,
  Share2,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  FileText,
  Play,
  Calendar,
} from "lucide-react";
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
    recordings: recs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
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
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(groupBySession(initialRecordings).map((s) => s.sessionKey))
  );
  const [expandedRecordings, setExpandedRecordings] = useState<Set<string>>(
    new Set()
  );

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

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
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
          <Badge className="bg-green-600/20 text-green-600 hover:bg-green-600/20 border-green-600/30 text-xs">
            Ready
          </Badge>
        );
      case "recording":
        return (
          <Badge className="bg-blue-600/20 text-blue-600 hover:bg-blue-600/20 border-blue-600/30 text-xs animate-pulse">
            Recording
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="text-xs">
            {status}
          </Badge>
        );
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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[180px]">Time</TableHead>
            <TableHead className="w-20">Duration</TableHead>
            <TableHead className="w-20">Size</TableHead>
            <TableHead className="w-20">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <Fragment key={session.sessionKey}>
              {/* Session Header Row */}
              <TableRow
                className="bg-muted/30 hover:bg-muted/40 cursor-pointer"
                onClick={() => toggleSession(session.sessionKey)}
              >
                <TableCell colSpan={5} className="py-2">
                  <div className="flex items-center gap-2">
                    {expandedSessions.has(session.sessionKey) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{session.roomName}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(session.date)}
                    </span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {session.recordings.length}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>

              {/* Recording Rows */}
              {expandedSessions.has(session.sessionKey) &&
                session.recordings.map((recording) => (
                  <Fragment key={recording.id}>
                    <TableRow className="group">
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2 pl-6">
                          <Film className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {formatTime(recording.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(recording.duration)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <HardDrive className="h-3 w-3" />
                          {formatSize(recording.size)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {getStatusBadge(recording.status)}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {recording.status === "completed" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                asChild
                              >
                                <a href={`/recordings/${recording.id}/watch`}>
                                  <Play className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => generateShareLink(recording.id)}
                                disabled={isGenerating === recording.id}
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                asChild
                              >
                                <a
                                  href={`/api/recordings/${recording.id}/download`}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              {(recording.chatLog || recording.transcript) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => toggleRecording(recording.id)}
                                >
                                  {expandedRecordings.has(recording.id) ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              deleteRecording(recording.id, recording.roomName)
                            }
                            disabled={isDeleting === recording.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details Row */}
                    {expandedRecordings.has(recording.id) && (
                      <TableRow key={`details-${recording.id}`}>
                        <TableCell colSpan={5} className="py-0">
                          <div className="pl-6 py-3 space-y-3 bg-muted/20">
                            {recording.chatLog && (
                              <div>
                                <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Chat Messages
                                </h4>
                                <div className="bg-background rounded border p-2 max-h-40 overflow-y-auto text-sm">
                                  {JSON.parse(recording.chatLog).map(
                                    (msg: { from: string; message: string; timestamp: number }, idx: number) => (
                                      <div key={idx} className="mb-1.5 last:mb-0">
                                        <span className="font-medium">
                                          {msg.from}:
                                        </span>{" "}
                                        <span className="text-muted-foreground">
                                          {msg.message}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                            {recording.transcript && (
                              <div>
                                <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
                                  <FileText className="h-3.5 w-3.5" />
                                  Transcript
                                </h4>
                                <div className="bg-background rounded border p-2 max-h-40 overflow-y-auto text-sm">
                                  <p className="whitespace-pre-wrap text-muted-foreground">
                                    {recording.transcript}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
