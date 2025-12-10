"use client";

import { useState, useEffect, useRef } from "react";
import { createLocalVideoTrack, createLocalAudioTrack, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Video, VideoOff, ArrowLeft, ArrowRight } from "lucide-react";

interface PreJoinProps {
  username: string;
  roomName: string;
  onJoin: (audioEnabled: boolean, videoEnabled: boolean) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function PreJoin({ username, roomName, onJoin, onBack, isLoading }: PreJoinProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  // Get device list
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));

        // Set defaults
        const defaultVideo = devices.find((d) => d.kind === "videoinput");
        const defaultAudio = devices.find((d) => d.kind === "audioinput");
        if (defaultVideo) setSelectedVideoDevice(defaultVideo.deviceId);
        if (defaultAudio) setSelectedAudioDevice(defaultAudio.deviceId);
      } catch (e) {
        console.error("Failed to get devices:", e);
      }
    };

    getDevices();
  }, []);

  // Create video track
  useEffect(() => {
    if (!selectedVideoDevice || !isVideoEnabled) {
      return;
    }

    let isCancelled = false;

    const createVideoTrack = async () => {
      try {
        const track = await createLocalVideoTrack({ deviceId: selectedVideoDevice });

        if (isCancelled) {
          track.stop();
          return;
        }

        videoTrackRef.current = track;

        if (videoRef.current) {
          track.attach(videoRef.current);
        }
      } catch (e) {
        console.error("Failed to create video track:", e);
      }
    };

    createVideoTrack();

    return () => {
      isCancelled = true;
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
      }
    };
  }, [selectedVideoDevice, isVideoEnabled]);

  // Create audio track and analyzer
  useEffect(() => {
    if (!selectedAudioDevice || !isAudioEnabled) {
      return;
    }

    let isCancelled = false;

    const createAudioTrackAndAnalyzer = async () => {
      try {
        const track = await createLocalAudioTrack({ deviceId: selectedAudioDevice });

        if (isCancelled) {
          track.stop();
          return;
        }

        audioTrackRef.current = track;

        // Create audio context for level metering
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        const source = audioContextRef.current.createMediaStreamSource(
          new MediaStream([track.mediaStreamTrack])
        );
        source.connect(analyserRef.current);

        // Start level monitoring
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(Math.min(100, (avg / 128) * 100));
          }
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (e) {
        console.error("Failed to create audio track:", e);
      }
    };

    createAudioTrackAndAnalyzer();

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }
    };
  }, [selectedAudioDevice, isAudioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTrackRef.current) videoTrackRef.current.stop();
      if (audioTrackRef.current) audioTrackRef.current.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const handleJoin = () => {
    // Stop preview tracks before joining
    if (videoTrackRef.current) videoTrackRef.current.stop();
    if (audioTrackRef.current) audioTrackRef.current.stop();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    onJoin(isAudioEnabled, isVideoEnabled);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  return (
    <div className="h-screen overflow-auto flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ready to join?</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Check your camera and microphone before joining <span className="text-foreground font-medium">{roomName}</span>
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-card rounded-2xl border overflow-hidden shadow-xl">
          {/* Video Preview - keep dark for video contrast */}
          <div className="relative aspect-video bg-black">
            {isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="w-24 h-24 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <span className="text-3xl font-semibold text-foreground">
                    {username.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Username badge */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <span className="text-white text-sm font-medium">{username}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 space-y-6">
            {/* Audio/Video toggles and level meter */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleAudio}
                className={
                  isAudioEnabled
                    ? "h-12 w-12"
                    : "h-12 w-12 border-destructive/50 bg-destructive/10 hover:bg-destructive/20 text-destructive"
                }
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                className={
                  isVideoEnabled
                    ? "h-12 w-12"
                    : "h-12 w-12 border-destructive/50 bg-destructive/10 hover:bg-destructive/20 text-destructive"
                }
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            </div>

            {/* Audio level meter */}
            {isAudioEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Microphone level</span>
                  <span>{Math.round(audioLevel)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}

            {/* Device selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Camera</label>
                <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || "Camera"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Microphone</label>
                <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || "Microphone"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <Button
                onClick={handleJoin}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Joining...
                  </span>
                ) : (
                  <>
                    Join Room
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
