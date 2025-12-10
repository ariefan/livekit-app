"use client";

import { useState, useEffect } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useChat,
  useMediaDevices,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  PhoneOff,
  ChevronDown,
  Check,
  Hand,
  Sparkles,
  Circle,
  Square,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatPanel } from "./chat-panel";
import { ParticipantsPanel } from "./participants-panel";
import { FocusLayout } from "./focus-layout";
import { CaptionsButton, CaptionsOverlay, useCaptions } from "./captions";
import { AIAssistantPanel } from "./ai-assistant-panel";
import { playSound, preloadSounds } from "@/lib/sounds";

interface VideoRoomProps {
  token: string;
  roomName: string;
  onDisconnect: () => void;
  initialAudio?: boolean;
  initialVideo?: boolean;
  isOwner?: boolean;
}

interface VideoGridProps {
  focusedIdentity: string | null;
  onFocus: (identity: string) => void;
  onUnfocus: () => void;
}

function VideoGrid({ focusedIdentity, onFocus, onUnfocus }: VideoGridProps) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // If a participant is focused, show focus layout
  if (focusedIdentity) {
    return (
      <FocusLayout
        tracks={tracks}
        focusedIdentity={focusedIdentity}
        onUnfocus={onUnfocus}
        onFocus={onFocus}
      />
    );
  }

  // Regular grid layout with click-to-focus
  return (
    <GridLayout
      tracks={tracks}
      className="h-full [&_.lk-participant-tile]:cursor-pointer"
    >
      <ParticipantTile
        onClick={(event) => {
          // Get participant identity from the clicked tile
          const tile = (event.target as HTMLElement).closest("[data-lk-participant-name]");
          const identity = tile?.getAttribute("data-lk-participant-name");
          if (identity) {
            onFocus(identity);
          }
        }}
      />
    </GridLayout>
  );
}

type PanelType = "chat" | "participants" | "ai" | null;

function RoomContent({ roomName, onLeave, isOwner = false }: { roomName: string; onLeave: () => void; isOwner?: boolean }) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Map<string, number>>(new Map());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [meetingTranscript, setMeetingTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isMicLoading, setIsMicLoading] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const { localParticipant } = useLocalParticipant();

  const { isEnabled: captionsEnabled, captions, toggleCaptions, isSupported: captionsSupported } = useCaptions(
    (transcript) => setMeetingTranscript(transcript)
  );
  const participants = useParticipants();
  const { chatMessages } = useChat();

  const audioDevices = useMediaDevices({ kind: "audioinput" });
  const videoDevices = useMediaDevices({ kind: "videoinput" });

  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

  const isMicEnabled = localParticipant.isMicrophoneEnabled;
  const isCameraEnabled = localParticipant.isCameraEnabled;

  const handleLeave = async () => {
    // Stop recording if active before leaving
    if (isRecording && egressId) {
      try {
        await fetch("/api/recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", egressId }),
        });
      } catch (e) {
        console.error("Failed to stop recording on leave:", e);
      }
    }

    playSound("leave", 0.5);
    // Small delay to let sound start playing before disconnect
    setTimeout(onLeave, 100);
  };

  // Preload sounds and play join sound on mount
  useEffect(() => {
    preloadSounds();
    playSound("join");
  }, []);

  useEffect(() => {
    if (activePanel === "chat") {
      setUnreadCount(0);
      setLastMessageCount(chatMessages.length);
    } else if (chatMessages.length > lastMessageCount) {
      setUnreadCount(chatMessages.length - lastMessageCount);
      // Play chat sound when new message arrives and chat panel is closed
      playSound("chat", 0.3);
    }
  }, [chatMessages.length, activePanel, lastMessageCount]);

  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(message.payload));

      if (data.type === "kick" && data.target === localParticipant.identity) {
        alert("You have been removed from the room");
        window.location.reload();
      }

      if (data.type === "mute-request" && data.target === localParticipant.identity) {
        localParticipant.setMicrophoneEnabled(false);
      }

      if (data.type === "hand-raise") {
        setRaisedHands((prev) => {
          const next = new Map(prev);
          if (data.raised) {
            next.set(data.participant, data.timestamp);
            // Play hand raise sound when someone else raises their hand
            if (data.participant !== localParticipant.identity) {
              playSound("hand-raise", 0.4);
            }
          } else {
            next.delete(data.participant);
          }
          return next;
        });
      }

      if (data.type === "recording-status") {
        setIsRecording(data.isRecording);
      }
    } catch (e) {
      // Not a JSON message, ignore
    }
  });

  const togglePanel = (panel: PanelType) => {
    if (panel === "chat" && activePanel !== "chat") {
      setUnreadCount(0);
      setLastMessageCount(chatMessages.length);
    }
    const newPanel = activePanel === panel ? null : panel;
    setActivePanel(newPanel);
    // On mobile, show the panel drawer
    if (newPanel && window.innerWidth < 768) {
      setShowMobilePanel(true);
    }
  };

  const closeMobilePanel = () => {
    setShowMobilePanel(false);
    setActivePanel(null);
  };

  const toggleMic = async () => {
    if (isMicLoading) return;
    setIsMicLoading(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicEnabled);
    } finally {
      setIsMicLoading(false);
    }
  };

  const toggleCamera = async () => {
    if (isCameraLoading) return;
    setIsCameraLoading(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenSharing);
      setIsScreenSharing(!isScreenSharing);
    } catch (e) {
      console.error("Screen share error:", e);
    }
  };

  const toggleHandRaise = () => {
    const newRaised = !isHandRaised;
    setIsHandRaised(newRaised);

    // Update local state immediately
    setRaisedHands((prev) => {
      const next = new Map(prev);
      if (newRaised) {
        next.set(localParticipant.identity, Date.now());
      } else {
        next.delete(localParticipant.identity);
      }
      return next;
    });

    // Broadcast to others
    const encoder = new TextEncoder();
    const data = encoder.encode(
      JSON.stringify({
        type: "hand-raise",
        participant: localParticipant.identity,
        raised: newRaised,
        timestamp: Date.now(),
      })
    );
    localParticipant.publishData(data, { reliable: true });
  };

  const selectAudioDevice = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    await localParticipant.setMicrophoneEnabled(true, { deviceId });
  };

  const selectVideoDevice = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    await localParticipant.setCameraEnabled(true, { deviceId });
  };

  const toggleRecording = async () => {
    if (isRecordingLoading) return;

    setRecordingError(null);
    setIsRecordingLoading(true);

    try {
      if (isRecording && egressId) {
        // Stop recording
        const response = await fetch("/api/recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", egressId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to stop recording");
        }

        setIsRecording(false);
        setEgressId(null);
        playSound("record-stop", 0.5);

        // Broadcast recording stopped to all participants
        const encoder = new TextEncoder();
        const data = encoder.encode(
          JSON.stringify({ type: "recording-status", isRecording: false })
        );
        localParticipant.publishData(data, { reliable: true });
      } else {
        // Start recording
        const response = await fetch("/api/recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", roomName }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to start recording");
        }

        setIsRecording(true);
        setEgressId(data.egressId);
        playSound("record-start", 0.5);

        // Broadcast recording started to all participants
        const encoder = new TextEncoder();
        const broadcastData = encoder.encode(
          JSON.stringify({ type: "recording-status", isRecording: true })
        );
        localParticipant.publishData(broadcastData, { reliable: true });
      }
    } catch (error) {
      console.error("Recording error:", error);
      setRecordingError(error instanceof Error ? error.message : "Recording failed");
    } finally {
      setIsRecordingLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Room Name Overlay */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex items-center gap-2">
          <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-lg">
            <span className="text-white/90 text-xs md:text-sm font-medium">{roomName}</span>
          </div>
          {isRecording && (
            <div className="bg-red-600 backdrop-blur-md px-2 py-1.5 md:px-3 md:py-2 rounded-lg flex items-center gap-1.5 md:gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs md:text-sm font-medium">REC</span>
            </div>
          )}
        </div>

        {/* Video Grid */}
        <div className="flex-1 min-h-0 relative">
          <VideoGrid
            focusedIdentity={focusedIdentity}
            onFocus={setFocusedIdentity}
            onUnfocus={() => setFocusedIdentity(null)}
          />

          {/* Captions Overlay */}
          {captionsEnabled && <CaptionsOverlay captions={captions} />}
        </div>

        {/* Bottom Control Bar */}
        <div className="flex-shrink-0 py-2 md:py-4 px-2">
          <div className="flex items-center justify-center gap-1.5 md:gap-3 flex-wrap">
            {/* Mic Control */}
            <ButtonGroup>
              <Button
                variant={isMicEnabled ? "secondary" : "destructive"}
                size="icon"
                className="h-10 w-10 md:h-10 md:w-10"
                onClick={toggleMic}
                disabled={isMicLoading}
              >
                {isMicLoading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isMicEnabled ? (
                  <Mic className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <MicOff className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isMicEnabled ? "secondary" : "destructive"}
                    size="icon"
                    className="w-6 md:w-8 h-10"
                  >
                    <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64">
                  {audioDevices.map((device) => (
                    <DropdownMenuItem
                      key={device.deviceId}
                      onClick={() => selectAudioDevice(device.deviceId)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {selectedAudioDevice === device.deviceId && <Check className="h-4 w-4" />}
                        <span className="truncate">{device.label || "Microphone"}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>

            {/* Camera Control */}
            <ButtonGroup>
              <Button
                variant={isCameraEnabled ? "secondary" : "destructive"}
                size="icon"
                className="h-10 w-10 md:h-10 md:w-10"
                onClick={toggleCamera}
                disabled={isCameraLoading}
              >
                {isCameraLoading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isCameraEnabled ? (
                  <Video className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <VideoOff className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isCameraEnabled ? "secondary" : "destructive"}
                    size="icon"
                    className="w-6 md:w-8 h-10"
                  >
                    <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64">
                  {videoDevices.map((device) => (
                    <DropdownMenuItem
                      key={device.deviceId}
                      onClick={() => selectVideoDevice(device.deviceId)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {selectedVideoDevice === device.deviceId && <Check className="h-4 w-4" />}
                        <span className="truncate">{device.label || "Camera"}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>

            {/* Screen Share - hidden on small mobile */}
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="icon"
              className="hidden sm:flex h-10 w-10"
              onClick={toggleScreenShare}
            >
              <MonitorUp className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            {/* Record - only visible to room owner, hidden on small mobile */}
            {isOwner && (
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="icon"
                className="hidden sm:flex h-10 w-10 relative"
                onClick={toggleRecording}
                disabled={isRecordingLoading}
                title={isRecording ? "Stop Recording" : "Start Recording"}
              >
                {isRecordingLoading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isRecording ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4 md:h-5 md:w-5 fill-current" />
                )}
                {isRecording && !isRecordingLoading && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
                )}
              </Button>
            )}

            {/* Hand Raise - hidden on small mobile */}
            <Button
              variant={isHandRaised ? "default" : "secondary"}
              size="icon"
              className="hidden sm:flex h-10 w-10"
              onClick={toggleHandRaise}
              style={isHandRaised ? { backgroundColor: '#eab308', color: 'black' } : {}}
            >
              <Hand className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            {/* Captions - hidden on small mobile */}
            {captionsSupported && (
              <div className="hidden sm:block">
                <CaptionsButton isActive={captionsEnabled} onClick={toggleCaptions} />
              </div>
            )}

            <div className="hidden sm:block w-px h-8 bg-border" />

            {/* Chat Toggle */}
            <Button
              variant={activePanel === "chat" ? "default" : "secondary"}
              size="icon"
              className="h-10 w-10 relative"
              onClick={() => togglePanel("chat")}
            >
              <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
              {unreadCount > 0 && activePanel !== "chat" && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {/* Participants Toggle */}
            <Button
              variant={activePanel === "participants" ? "default" : "secondary"}
              size="icon"
              className="h-10 w-10 relative"
              onClick={() => togglePanel("participants")}
            >
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              <span className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-medium">
                {participants.length}
              </span>
            </Button>

            {/* More options dropdown for mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="sm:hidden h-10 w-10"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={toggleScreenShare}>
                  <MonitorUp className="h-4 w-4 mr-2" />
                  {isScreenSharing ? "Stop Sharing" : "Share Screen"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleRecording} disabled={isRecordingLoading}>
                  {isRecordingLoading ? (
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isRecording ? (
                    <Square className="h-4 w-4 mr-2" />
                  ) : (
                    <Circle className="h-4 w-4 mr-2 fill-current" />
                  )}
                  {isRecordingLoading ? "Loading..." : isRecording ? "Stop Recording" : "Record"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleHandRaise}>
                  <Hand className="h-4 w-4 mr-2" />
                  {isHandRaised ? "Lower Hand" : "Raise Hand"}
                </DropdownMenuItem>
                {captionsSupported && (
                  <DropdownMenuItem onClick={toggleCaptions}>
                    <span className="mr-2 text-sm">CC</span>
                    {captionsEnabled ? "Disable Captions" : "Enable Captions"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => togglePanel("ai")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Assistant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Assistant Toggle - hidden on mobile (in more menu) */}
            <Button
              variant={activePanel === "ai" ? "default" : "secondary"}
              size="icon"
              className="hidden sm:flex h-10 w-10"
              onClick={() => togglePanel("ai")}
              style={activePanel === "ai" ? { backgroundColor: '#9333ea' } : {}}
            >
              <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            <div className="w-px h-8 bg-border" />

            {/* Leave Button */}
            <Button
              variant="destructive"
              size="icon"
              className="h-10 w-10"
              onClick={handleLeave}
            >
              <PhoneOff className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Side Panel - Desktop */}
      {activePanel && (
        <aside className="hidden md:flex w-80 flex-shrink-0 border-l border-zinc-800 flex-col bg-zinc-900 overflow-hidden">
          {activePanel === "chat" && <ChatPanel />}
          {activePanel === "participants" && <ParticipantsPanel roomName={roomName} raisedHands={raisedHands} />}
          {activePanel === "ai" && <AIAssistantPanel transcript={meetingTranscript} />}
        </aside>
      )}

      {/* Mobile Panel Drawer */}
      {showMobilePanel && activePanel && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={closeMobilePanel}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer handle */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white">
                {activePanel === "chat" && "Chat"}
                {activePanel === "participants" && "Participants"}
                {activePanel === "ai" && "AI Assistant"}
              </h3>
              <Button variant="ghost" size="icon" onClick={closeMobilePanel}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              {activePanel === "chat" && <ChatPanel />}
              {activePanel === "participants" && <ParticipantsPanel roomName={roomName} raisedHands={raisedHands} />}
              {activePanel === "ai" && <AIAssistantPanel transcript={meetingTranscript} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function VideoRoom({ token, roomName, onDisconnect, initialAudio = true, initialVideo = true, isOwner = false }: VideoRoomProps) {
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={initialVideo}
      audio={initialAudio}
      onDisconnected={onDisconnect}
      data-lk-theme="default"
      className="h-screen overflow-hidden"
    >
      <RoomContent roomName={roomName} onLeave={onDisconnect} isOwner={isOwner} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
