"use client";

import { useState } from "react";
import {
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Button } from "@/components/ui/button";

interface ParticipantsPanelProps {
  roomName?: string;
  raisedHands?: Map<string, number>;
}

export function ParticipantsPanel({ roomName, raisedHands = new Map() }: ParticipantsPanelProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Sort participants: raised hands first (by timestamp), then others
  const sortedParticipants = [...participants].sort((a, b) => {
    const aHand = raisedHands.get(a.identity);
    const bHand = raisedHands.get(b.identity);
    if (aHand && bHand) return aHand - bHand; // Earlier hand raise first
    if (aHand) return -1;
    if (bHand) return 1;
    return 0;
  });
  const [copied, setCopied] = useState(false);

  const isHost = localParticipant.identity === participants[0]?.identity;

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const toggleMuteParticipant = async (identity: string) => {
    const participant = participants.find((p) => p.identity === identity);
    if (participant && participant !== localParticipant) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "mute-request", target: identity }));
      await localParticipant.publishData(data, { reliable: true });
    }
  };

  const kickParticipant = async (identity: string) => {
    if (!isHost) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: "kick", target: identity }));
    await localParticipant.publishData(data, { reliable: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Copy Link */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Participants
          </h3>
          <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-full font-medium">
            {participants.length}
          </span>
        </div>

        {/* Copy Room Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={copyRoomLink}
          className="w-full gap-2 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Copy invite link
            </>
          )}
        </Button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {sortedParticipants.map((participant) => {
          const isMuted = !participant.isMicrophoneEnabled;
          const isVideoOff = !participant.isCameraEnabled;
          const isLocal = participant === localParticipant;
          const isFirstParticipant = participant.identity === participants[0]?.identity;
          const isSpeaking = participant.isSpeaking;
          const hasRaisedHand = raisedHands.has(participant.identity);

          return (
            <div
              key={participant.identity}
              className={`flex items-center justify-between p-3 rounded-lg transition-all group ${
                isSpeaking
                  ? "bg-green-500/10 ring-1 ring-green-500/30"
                  : "hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar with Speaking Indicator */}
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isLocal ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-300"
                  } ${isSpeaking ? "ring-2 ring-green-500 ring-offset-1 ring-offset-zinc-900" : ""}`}>
                    {participant.identity.slice(0, 2).toUpperCase()}
                  </div>
                  {/* Speaking Animation */}
                  {isSpeaking && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">
                      {participant.identity}
                    </span>
                    {isLocal && (
                      <span className="text-zinc-500 text-xs">(You)</span>
                    )}
                    {isFirstParticipant && (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-medium">
                        Host
                      </span>
                    )}
                    {hasRaisedHand && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <path d="M18 8.5a1.5 1.5 0 0 0-3 0v2.5h-1V6.5a1.5 1.5 0 0 0-3 0v4.5h-1V5.5a1.5 1.5 0 0 0-3 0v5.5h-1V8.5a1.5 1.5 0 0 0-3 0v8c0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5v-8z"/>
                        </svg>
                        Hand
                      </span>
                    )}
                  </div>

                  {/* Status Icons */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Mic Status */}
                    <div className={`flex items-center gap-1 ${isMuted ? "text-red-400" : "text-green-400"}`}>
                      {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23"/>
                          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </div>

                    {/* Camera Status */}
                    <div className={`flex items-center gap-1 ${isVideoOff ? "text-red-400" : "text-green-400"}`}>
                      {isVideoOff ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"/>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                      )}
                    </div>

                    {/* Speaking indicator text */}
                    {isSpeaking && (
                      <span className="text-green-400 text-[10px] font-medium">Speaking</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Host Controls */}
              {isHost && !isLocal && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    onClick={() => toggleMuteParticipant(participant.identity)}
                    title="Request mute"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23"/>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => kickParticipant(participant.identity)}
                    title="Remove from room"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="18" y1="8" x2="23" y2="13"/>
                      <line x1="23" y1="8" x2="18" y2="13"/>
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - Host info */}
      {isHost && (
        <div className="px-4 py-3 border-t border-zinc-800">
          <p className="text-zinc-500 text-xs text-center">
            You are the host. Hover over participants for controls.
          </p>
        </div>
      )}
    </div>
  );
}
