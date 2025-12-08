"use client";

import { useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  ControlBar,
  useDataChannel,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <GridLayout tracks={tracks} style={{ height: "calc(100vh - 80px)" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function RoomContent({ roomName }: { roomName: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { localParticipant } = useLocalParticipant();

  // Handle incoming data messages (for kick/mute requests)
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(message.payload));

      if (data.type === "kick" && data.target === localParticipant.identity) {
        alert("You have been removed from the room");
        window.location.reload();
      }

      if (data.type === "mute-request" && data.target === localParticipant.identity) {
        // Mute local audio
        localParticipant.setMicrophoneEnabled(false);
      }
    } catch (e) {
      // Not a JSON message, ignore
    }
  });

  return (
    <div className="flex h-screen">
      {/* Main video area */}
      <div className="flex-1 flex flex-col bg-black">
        <div className="p-2 bg-background/80 backdrop-blur flex items-center justify-between">
          <h2 className="font-semibold text-sm">Room: {roomName}</h2>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </button>
        </div>

        <VideoGrid />

        <ControlBar variation="minimal" />
      </div>

      {/* Sidebar with Chat & Participants */}
      {sidebarOpen && (
        <div className="w-80 flex flex-col">
          <Tabs defaultValue="chat" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 m-0">
              <ChatPanel />
            </TabsContent>
            <TabsContent value="participants" className="flex-1 m-0">
              <ParticipantsPanel />
            </TabsContent>
          </Tabs>
        </div>
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
    >
      <RoomContent roomName={roomName} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
