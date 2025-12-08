"use client";

import { TrackReferenceOrPlaceholder, ParticipantTile } from "@livekit/components-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FocusLayoutProps {
  tracks: TrackReferenceOrPlaceholder[];
  focusedIdentity: string;
  onUnfocus: () => void;
  onFocus?: (identity: string) => void;
}

export function FocusLayout({ tracks, focusedIdentity, onUnfocus, onFocus }: FocusLayoutProps) {
  // Find the focused track
  const focusedTrack = tracks.find(
    (track) => track.participant?.identity === focusedIdentity
  );

  // Other tracks (excluding focused)
  const otherTracks = tracks.filter(
    (track) => track.participant?.identity !== focusedIdentity
  );

  if (!focusedTrack) {
    return null;
  }

  return (
    <div className="h-full flex gap-2 p-2">
      {/* Main focused view */}
      <div className="flex-1 relative rounded-xl overflow-hidden bg-zinc-900">
        <ParticipantTile trackRef={focusedTrack} />

        {/* Unfocus button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onUnfocus}
          className="absolute top-3 right-3 z-10 bg-black/50 border-zinc-600 hover:bg-black/70 text-white backdrop-blur-sm"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Focused indicator */}
        <div className="absolute top-3 left-3 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Spotlighted
        </div>
      </div>

      {/* Filmstrip - other participants */}
      {otherTracks.length > 0 && (
        <div className="w-48 flex flex-col gap-2 overflow-y-auto">
          {otherTracks.map((track) => (
            <div
              key={track.participant?.identity || Math.random()}
              className="aspect-video rounded-lg overflow-hidden bg-zinc-900 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => {
                if (track.participant?.identity && onFocus) {
                  onFocus(track.participant.identity);
                }
              }}
            >
              <ParticipantTile trackRef={track} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
