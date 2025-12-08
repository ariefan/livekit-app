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

interface VideoRoomProps {
  token: string;
  roomName: string;
  onDisconnect: () => void;
}

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} className="h-full">
      <ParticipantTile />
    </GridLayout>
  );
}

type PanelType = "chat" | "participants" | null;

function RoomContent({ roomName, onLeave }: { roomName: string; onLeave: () => void }) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { localParticipant } = useLocalParticipant();
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

  const selectAudioDevice = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    await localParticipant.setMicrophoneEnabled(true, { deviceId });
  };

  const selectVideoDevice = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    await localParticipant.setCameraEnabled(true, { deviceId });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Room Name Overlay */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg">
            <span className="text-white/90 text-sm font-medium">{roomName}</span>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 min-h-0">
          <VideoGrid />
        </div>

        {/* Bottom Control Bar */}
        <div className="flex-shrink-0 py-4">
          <div className="flex items-center justify-center gap-3">
            {/* Mic Control */}
            <ButtonGroup>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMic}
                className={
                  isMicEnabled
                    ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                    : "border-red-500/50 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                }
              >
                {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "w-8",
                      isMicEnabled
                        ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                        : "border-red-500/50 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 bg-zinc-900 border-zinc-800">
                  {audioDevices.map((device) => (
                    <DropdownMenuItem
                      key={device.deviceId}
                      onClick={() => selectAudioDevice(device.deviceId)}
                      className="text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer"
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
                variant="outline"
                size="icon"
                onClick={toggleCamera}
                className={
                  isCameraEnabled
                    ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                    : "border-red-500/50 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                }
              >
                {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "w-8",
                      isCameraEnabled
                        ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                        : "border-red-500/50 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 bg-zinc-900 border-zinc-800">
                  {videoDevices.map((device) => (
                    <DropdownMenuItem
                      key={device.deviceId}
                      onClick={() => selectVideoDevice(device.deviceId)}
                      className="text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer"
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
              variant="outline"
              size="icon"
              onClick={toggleScreenShare}
              className={
                isScreenSharing
                  ? "border-blue-500/50 bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
              }
            >
              <MonitorUp className="h-5 w-5" />
            </Button>

            <div className="w-px h-8 bg-zinc-700" />

            {/* Chat Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => togglePanel("chat")}
              className={cn(
                "relative",
                activePanel === "chat"
                  ? "border-blue-500/50 bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
              )}
            >
              <MessageSquare className="h-5 w-5" />
              {unreadCount > 0 && activePanel !== "chat" && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {/* Participants Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => togglePanel("participants")}
              className={cn(
                "relative",
                activePanel === "participants"
                  ? "border-blue-500/50 bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
              )}
            >
              <Users className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-zinc-600 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-medium">
                {participants.length}
              </span>
            </Button>

            <div className="w-px h-8 bg-zinc-700" />

            {/* Leave Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={onLeave}
              className="border-red-500/50 bg-red-600 hover:bg-red-700 text-white"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel && (
        <aside className="w-80 flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-900 overflow-hidden">
          {activePanel === "chat" && <ChatPanel />}
          {activePanel === "participants" && <ParticipantsPanel roomName={roomName} />}
        </aside>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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
