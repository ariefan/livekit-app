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

interface VideoRoomProps {
  token: string;
  roomName: string;
  onDisconnect: () => void;
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

function RoomContent({ roomName, onLeave }: { roomName: string; onLeave: () => void }) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Map<string, number>>(new Map());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [meetingTranscript, setMeetingTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
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

  useEffect(() => {
    if (activePanel === "chat") {
      setUnreadCount(0);
      setLastMessageCount(chatMessages.length);
    } else if (chatMessages.length > lastMessageCount) {
      setUnreadCount(chatMessages.length - lastMessageCount);
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
    setActivePanel(activePanel === panel ? null : panel);
  };

  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMicEnabled);
  };

  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!isCameraEnabled);
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
    setRecordingError(null);

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
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Room Name Overlay */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex items-center gap-2">
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg">
            <span className="text-white/90 text-sm font-medium">{roomName}</span>
          </div>
          {isRecording && (
            <div className="bg-red-600 backdrop-blur-md px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">Recording</span>
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
        <div className="flex-shrink-0 py-4">
          <div className="flex items-center justify-center gap-3">
            {/* Mic Control */}
            <ButtonGroup>
              <Button
                variant={isMicEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleMic}
              >
                {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isMicEnabled ? "secondary" : "destructive"}
                    size="icon"
                    className="w-8"
                  >
                    <ChevronDown className="h-4 w-4" />
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
                onClick={toggleCamera}
              >
                {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isCameraEnabled ? "secondary" : "destructive"}
                    size="icon"
                    className="w-8"
                  >
                    <ChevronDown className="h-4 w-4" />
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

            {/* Screen Share */}
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="icon"
              onClick={toggleScreenShare}
            >
              <MonitorUp className="h-5 w-5" />
            </Button>

            {/* Record */}
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              onClick={toggleRecording}
              className="relative"
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Circle className="h-5 w-5 fill-current" />
              )}
              {isRecording && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
              )}
            </Button>

            {/* Hand Raise */}
            <Button
              variant={isHandRaised ? "default" : "secondary"}
              size="icon"
              onClick={toggleHandRaise}
              className={isHandRaised ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}
            >
              <Hand className="h-5 w-5" />
            </Button>

            {/* Captions */}
            {captionsSupported && (
              <CaptionsButton isActive={captionsEnabled} onClick={toggleCaptions} />
            )}

            <div className="w-px h-8 bg-border" />

            {/* Chat Toggle */}
            <Button
              variant={activePanel === "chat" ? "default" : "secondary"}
              size="icon"
              onClick={() => togglePanel("chat")}
              className="relative"
            >
              <MessageSquare className="h-5 w-5" />
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
              onClick={() => togglePanel("participants")}
              className="relative"
            >
              <Users className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-medium">
                {participants.length}
              </span>
            </Button>

            {/* AI Assistant Toggle */}
            <Button
              variant={activePanel === "ai" ? "default" : "secondary"}
              size="icon"
              onClick={() => togglePanel("ai")}
              className={activePanel === "ai" ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              <Sparkles className="h-5 w-5" />
            </Button>

            <div className="w-px h-8 bg-border" />

            {/* Leave Button */}
            <Button
              variant="destructive"
              size="icon"
              onClick={onLeave}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel && (
        <aside className="hidden md:flex w-80 flex-shrink-0 border-l border-zinc-800 flex-col bg-zinc-900 overflow-hidden">
          {activePanel === "chat" && <ChatPanel />}
          {activePanel === "participants" && <ParticipantsPanel roomName={roomName} raisedHands={raisedHands} />}
          {activePanel === "ai" && <AIAssistantPanel transcript={meetingTranscript} />}
        </aside>
      )}
    </div>
  );
}

export function VideoRoom({ token, roomName, onDisconnect }: VideoRoomProps) {
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={onDisconnect}
      data-lk-theme="default"
      className="h-screen overflow-hidden"
    >
      <RoomContent roomName={roomName} onLeave={onDisconnect} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
