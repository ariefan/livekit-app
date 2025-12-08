"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocalParticipant, useDataChannel } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Captions as CaptionsIcon, CaptionsOff } from "lucide-react";

interface CaptionEntry {
  participant: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface CaptionsProps {
  onTranscriptUpdate?: (transcript: string) => void;
}

// Extend window for WebKit Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function CaptionsButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={
        isActive
          ? "border-blue-500/50 bg-blue-600 hover:bg-blue-700 text-white"
          : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
      }
    >
      {isActive ? <CaptionsIcon className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
    </Button>
  );
}

export function CaptionsOverlay({ captions }: { captions: CaptionEntry[] }) {
  // Filter to show only recent captions (last 10 seconds)
  const recentCaptions = captions.filter(
    (c) => Date.now() - c.timestamp < 10000
  );

  if (recentCaptions.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
        {recentCaptions.slice(-3).map((caption, index) => (
          <p
            key={`${caption.participant}-${caption.timestamp}-${index}`}
            className={`text-white text-sm leading-relaxed ${
              caption.isFinal ? "opacity-100" : "opacity-70"
            }`}
          >
            <span className="font-medium text-blue-400">{caption.participant}: </span>
            {caption.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export function useCaptions(onTranscriptUpdate?: (transcript: string) => void) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fullTranscriptRef = useRef<string>("");
  const { localParticipant } = useLocalParticipant();

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Listen for captions from other participants
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(message.payload));

      if (data.type === "caption") {
        setCaptions((prev) => {
          // If this is a final caption from the same participant, update the last one
          if (data.isFinal) {
            const lastFromSame = prev.findIndex(
              (c) => c.participant === data.participant && !c.isFinal
            );
            if (lastFromSame !== -1) {
              const updated = [...prev];
              updated[lastFromSame] = {
                participant: data.participant,
                text: data.text,
                timestamp: data.timestamp,
                isFinal: true,
              };
              return updated;
            }
          }

          return [
            ...prev,
            {
              participant: data.participant,
              text: data.text,
              timestamp: data.timestamp,
              isFinal: data.isFinal,
            },
          ].slice(-20); // Keep last 20 entries
        });
      }
    } catch {
      // Not a caption message
    }
  });

  // Broadcast caption to other participants
  const broadcastCaption = useCallback(
    (text: string, isFinal: boolean) => {
      if (!localParticipant) return;

      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "caption",
          participant: localParticipant.identity,
          text,
          timestamp: Date.now(),
          isFinal,
        })
      );
      localParticipant.publishData(data, { reliable: isFinal });

      // Also add to local captions
      setCaptions((prev) => {
        if (isFinal) {
          const lastFromSelf = prev.findIndex(
            (c) => c.participant === localParticipant.identity && !c.isFinal
          );
          if (lastFromSelf !== -1) {
            const updated = [...prev];
            updated[lastFromSelf] = {
              participant: localParticipant.identity,
              text,
              timestamp: Date.now(),
              isFinal: true,
            };
            return updated;
          }
        }

        return [
          ...prev,
          {
            participant: localParticipant.identity,
            text,
            timestamp: Date.now(),
            isFinal,
          },
        ].slice(-20);
      });

      // Update full transcript for AI
      if (isFinal) {
        fullTranscriptRef.current += `${localParticipant.identity}: ${text}\n`;
        onTranscriptUpdate?.(fullTranscriptRef.current);
      }
    },
    [localParticipant, onTranscriptUpdate]
  );

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;

      broadcastCaption(text, result.isFinal);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setIsEnabled(false);
      }
    };

    recognition.onend = () => {
      // Restart if still enabled
      if (isEnabled && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isSupported, broadcastCaption, isEnabled]);

  // Start/stop based on isEnabled
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isEnabled) {
      try {
        recognitionRef.current.start();
      } catch {
        // Already started
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
    }
  }, [isEnabled]);

  const toggleCaptions = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  return {
    isEnabled,
    isSupported,
    captions,
    toggleCaptions,
    fullTranscript: fullTranscriptRef.current,
  };
}
