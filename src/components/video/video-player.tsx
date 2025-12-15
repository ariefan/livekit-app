"use client";

import { forwardRef } from "react";
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  url: string;
  playing: boolean;
  volume: number;
  playbackRate: number;
  onProgress: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
  onDuration: (duration: number) => void;
  onEnded: () => void;
  onError: (error: any) => void;
  onReady: () => void;
}

export const VideoPlayer = forwardRef<any, VideoPlayerProps>(
  ({ url, playing, volume, playbackRate, onProgress, onDuration, onEnded, onError, onReady }, ref) => {
    const Player = ReactPlayer as any;

    return (
      <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
        {url ? (
          <Player
            ref={ref}
            url={url}
            playing={playing}
            volume={volume}
            playbackRate={playbackRate}
            onProgress={onProgress}
            onDuration={onDuration}
            onEnded={onEnded}
            onError={onError}
            onReady={onReady}
            width="100%"
            height="100%"
            controls={false}
            config={{
              file: {
                attributes: {
                  controlsList: "nodownload",
                  disablePictureInPicture: false,
                  crossOrigin: "anonymous",
                },
                forceVideo: true,
              },
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground">Loading video...</div>
          </div>
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
