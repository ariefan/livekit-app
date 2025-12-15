"use client";

import { forwardRef, useRef, useEffect, useImperativeHandle } from "react";

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
    const videoRef = useRef<HTMLVideoElement>(null);

    // Expose seekTo method for parent component
    useImperativeHandle(ref, () => ({
      seekTo: (time: number, type: string) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
    }));

    // Handle playing state
    useEffect(() => {
      if (videoRef.current) {
        if (playing) {
          videoRef.current.play().catch((e) => {
            console.error('Error playing video:', e);
            onError(e);
          });
        } else {
          videoRef.current.pause();
        }
      }
    }, [playing, onError]);

    // Handle volume
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
      }
    }, [volume]);

    // Handle playback rate
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackRate;
      }
    }, [playbackRate]);

    // Handle video events
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleLoadedMetadata = () => {
        console.log('✅ Video metadata loaded! Duration:', video.duration);
        onDuration(video.duration);
        onReady();
      };

      const handleTimeUpdate = () => {
        if (video.duration) {
          const played = video.currentTime / video.duration;
          onProgress({
            played,
            playedSeconds: video.currentTime,
            loaded: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) / video.duration : 0,
            loadedSeconds: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
          });
        }
      };

      const handleEnded = () => {
        onEnded();
      };

      const handleError = (e: Event) => {
        console.error('Video error:', e);
        onError(e);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('error', handleError);
      };
    }, [onDuration, onProgress, onEnded, onError, onReady]);

    return (
      <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
        {url ? (
          <video
            ref={videoRef}
            src={url}
            crossOrigin="anonymous"
            className="w-full h-full"
            preload="metadata"
            playsInline
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
