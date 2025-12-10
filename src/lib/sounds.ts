type SoundName = "join" | "leave" | "record-start" | "record-stop" | "chat" | "hand-raise";

const soundPaths: Record<SoundName, string> = {
  join: "/sounds/join.mp3",
  leave: "/sounds/leave.mp3",
  "record-start": "/sounds/record-start.mp3",
  "record-stop": "/sounds/record-stop.mp3",
  chat: "/sounds/chat.mp3",
  "hand-raise": "/sounds/hand-raise.mp3",
};

// Cache for preloaded audio elements
const audioCache: Map<SoundName, HTMLAudioElement> = new Map();

/**
 * Preload all sounds for instant playback
 * Call this once when the app loads
 */
export function preloadSounds(): void {
  if (typeof window === "undefined") return;

  Object.entries(soundPaths).forEach(([name, path]) => {
    const audio = new Audio(path);
    audio.preload = "auto";
    audioCache.set(name as SoundName, audio);
  });
}

/**
 * Play a sound effect
 * @param name - The name of the sound to play
 * @param volume - Volume level from 0 to 1 (default: 0.5)
 */
export function playSound(name: SoundName, volume: number = 0.5): void {
  if (typeof window === "undefined") return;

  try {
    // Use cached audio or create new
    let audio = audioCache.get(name);

    if (!audio) {
      audio = new Audio(soundPaths[name]);
      audioCache.set(name, audio);
    }

    // Clone the audio for overlapping plays
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = Math.max(0, Math.min(1, volume));
    clone.play().catch(() => {
      // Ignore autoplay errors (user hasn't interacted yet)
    });
  } catch {
    // Ignore sound errors - not critical
  }
}
