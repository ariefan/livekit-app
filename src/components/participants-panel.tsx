"use client";

import {
  useParticipants,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Track } from "livekit-client";

export function ParticipantsPanel() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const isHost = localParticipant.identity === participants[0]?.identity;

  const toggleMuteParticipant = async (identity: string) => {
    // Host can request mute (participant will receive a request)
    const participant = participants.find((p) => p.identity === identity);
    if (participant && participant !== localParticipant) {
      // Send data message to request mute
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "mute-request", target: identity }));
      await localParticipant.publishData(data, { reliable: true });
    }
  };

  const kickParticipant = async (identity: string) => {
    if (!isHost) return;
    // In a real app, you'd call your backend to remove the participant
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: "kick", target: identity }));
    await localParticipant.publishData(data, { reliable: true });
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">Participants</h3>
        <Badge variant="secondary">{participants.length}</Badge>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {participants.map((participant) => {
            const isMuted = !participant.isMicrophoneEnabled;
            const isVideoOff = !participant.isCameraEnabled;
            const isLocal = participant === localParticipant;
            const isFirstParticipant = participant.identity === participants[0]?.identity;

            return (
              <div
                key={participant.identity}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {participant.identity.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {participant.identity}
                      {isLocal && " (You)"}
                    </span>
                    <div className="flex gap-1">
                      {isFirstParticipant && (
                        <Badge variant="default" className="text-[10px] px-1 py-0">
                          Host
                        </Badge>
                      )}
                      {isMuted && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Muted
                        </Badge>
                      )}
                      {isVideoOff && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          No video
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {isHost && !isLocal && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => toggleMuteParticipant(participant.identity)}
                    >
                      Mute
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => kickParticipant(participant.identity)}
                    >
                      Kick
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
