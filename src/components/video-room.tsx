"use client";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";

interface VideoRoomProps {
  token: string;
  onDisconnect: () => void;
}

export function VideoRoom({ token, onDisconnect }: VideoRoomProps) {
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
      style={{ height: "100vh" }}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
