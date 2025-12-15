"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  MessageSquare,
  FileText,
  Loader2,
} from "lucide-react";
import { VideoPlayer } from "./video-player";
import { ChatTimeline } from "./chat-timeline";
import { TranscriptPanel } from "./transcript-panel";
import { useToast } from "@/components/ui/toast";

interface VideoPlayerPageProps {
  recordingId: string;
  isPublic?: boolean;
  shareToken?: string;
}

interface RecordingData {
  videoUrl: string;
  duration: number | null;
  chatLog: string | null;
  transcript: string | null;
  recordingStartedAt: number;
  roomName: string;
}

export function VideoPlayerPage({
  recordingId,
  isPublic = false,
  shareToken,
}: VideoPlayerPageProps) {
  const { toast } = useToast();
  const playerRef = useRef<any>(null);

  // Recording data
  const [data, setData] = useState<RecordingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"chat" | "transcript">("chat");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch recording data
  const fetchRecordingData = async () => {
    try {
      const endpoint = isPublic
        ? `/api/recording/${shareToken}/stream`
        : `/api/recordings/${recordingId}/stream`;

      const res = await fetch(endpoint);

      if (!res.ok) {
        if (res.status === 410) {
          throw new Error("This share link has expired");
        }
        throw new Error("Failed to load recording");
      }

      const recordingData = await res.json();
      console.log("Recording data fetched:", recordingData);
      console.log("Video URL:", recordingData.videoUrl);
      setData(recordingData);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load recording";
      setError(message);
      toast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecordingData();
  }, [recordingId, shareToken]);

  // Refresh URL every 50 minutes (presigned URLs expire in 1 hour)
  useEffect(() => {
    if (!data) return;

    const interval = setInterval(() => {
      fetchRecordingData();
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(interval);
  }, [data]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          setPlaying((prev) => !prev);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          setMuted((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const seekRelative = (seconds: number) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      playerRef.current.seekTo(newTime, "seconds");
    }
  };

  const handleSeek = (time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, "seconds");
      setCurrentTime(time);
    }
  };

  const handleProgress = (state: {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
  }) => {
    if (!seeking) {
      setCurrentTime(state.playedSeconds);
    }
  };

  const handleSeekStart = () => {
    setSeeking(true);
  };

  const handleSeekEnd = (value: number[]) => {
    setSeeking(false);
    handleSeek(value[0]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading recording...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Failed to load recording</p>
          <p className="text-sm text-muted-foreground">{error || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{data.roomName}</h1>
          <p className="text-sm text-muted-foreground">Recording Playback</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a href={isPublic ? `/recording/${shareToken}` : "/dashboard/recordings"}>
            Close
          </a>
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video section */}
        <div className="flex-1 flex flex-col bg-black">
          {/* Video player */}
          <div className="flex-1 flex items-center justify-center">
            <VideoPlayer
              ref={playerRef}
              url={data.videoUrl}
              playing={playing}
              volume={muted ? 0 : volume}
              playbackRate={playbackRate}
              onProgress={handleProgress}
              onDuration={setDuration}
              onEnded={() => setPlaying(false)}
              onError={(e) => {
                console.error("Video error:", e);
                console.error("Error type:", typeof e);
                console.error("Error details:", JSON.stringify(e, null, 2));
                toast("Failed to play video", "error");
              }}
              onReady={() => {
                console.log("Video ready - ReactPlayer initialized successfully");
                console.log("Video URL loaded:", data?.videoUrl);
              }}
            />
          </div>

          {/* Custom controls */}
          <div className="bg-card border-t p-4 space-y-3">
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-12">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={(value) => {
                  setCurrentTime(value[0]);
                  handleSeekStart();
                }}
                onValueCommit={handleSeekEnd}
                className="flex-1"
              />
              <span className="text-xs font-mono text-muted-foreground w-12">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log("Play button clicked. Current playing state:", playing);
                    console.log("Video URL:", data?.videoUrl);
                    console.log("Duration:", duration);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                {/* Skip buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => seekRelative(-5)}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => seekRelative(5)}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMuted(!muted)}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Slider
                    value={[muted ? 0 : volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={(value) => {
                      setVolume(value[0] / 100);
                      if (value[0] > 0) setMuted(false);
                    }}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Playback speed */}
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  className="bg-background border rounded px-2 py-1 text-sm"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-96 border-l flex flex-col bg-card">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "transcript")} className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="transcript" className="gap-2">
                <FileText className="h-4 w-4" />
                Transcript
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 m-0">
              <ChatTimeline
                chatLog={data.chatLog}
                recordingStartedAt={data.recordingStartedAt}
                currentVideoTime={currentTime}
                onSeek={handleSeek}
              />
            </TabsContent>

            <TabsContent value="transcript" className="flex-1 m-0">
              <TranscriptPanel transcript={data.transcript} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
