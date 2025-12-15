"use client";

import { forwardRef, useState, useEffect } from "react";
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
    const [nativeVideoError, setNativeVideoError] = useState<string | null>(null);
    const [nativeVideoDuration, setNativeVideoDuration] = useState<number>(0);

    // Test native video loading for CORS debugging
    useEffect(() => {
      if (url) {
        const testVideo = document.createElement('video');
        testVideo.crossOrigin = 'anonymous';
        testVideo.src = url;

        testVideo.onloadedmetadata = () => {
          console.log('✅ Native video loaded successfully! Duration:', testVideo.duration);
          setNativeVideoDuration(testVideo.duration);
          setNativeVideoError(null);
        };

        testVideo.onerror = (e) => {
          console.error('❌ Native video failed to load:', e);
          console.error('This indicates a CORS issue with the S3 bucket');
          setNativeVideoError('CORS error - check bucket CORS configuration');
        };
      }
    }, [url]);

    return (
      <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
        {url ? (
          <>
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
            {/* CORS Diagnostic Info */}
            {nativeVideoError && (
              <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white p-2 text-xs">
                <strong>CORS Error:</strong> {nativeVideoError}
                <br />
                <small>Check iDrive E2 bucket CORS settings for: Accept-Ranges, Content-Range headers</small>
              </div>
            )}
            {nativeVideoDuration > 0 && (
              <div className="absolute top-0 right-0 bg-green-500/90 text-white p-1 text-xs">
                Native: {nativeVideoDuration.toFixed(1)}s
              </div>
            )}
          </>
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
