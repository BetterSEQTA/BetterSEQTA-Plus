import type { Plugin } from "@/plugins/core/types";
import { defineSettings, componentSetting, numberSetting } from "@/plugins/core/settingsHelpers";
import styles from "./styles.css?inline";
import BackgroundMusicSetting from "./BackgroundMusicSetting.svelte";
import localforage from "localforage";

const settings = defineSettings({
  uploader: componentSetting({
    title: "Background Music",
    description: "Upload a .wav audio file to play in the background.",
    component: BackgroundMusicSetting,
  }),
  volume: numberSetting({
    title: "Volume",
    description: "Set background music volume",
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
  }),
});

const store = localforage.createInstance({
  name: "background-music-store",
  storeName: "music",
});

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let cleanupRegistered = false;
let pendingGestureCancel: (() => void) | null = null;
let visibilityResumeTimeout: number | null = null;

async function loadAudioBlob(): Promise<Blob | null> {
  const blob = await store.getItem<Blob>("audio-blob");
  return blob && blob instanceof Blob ? blob : null;
}

function stopAndCleanupAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio.remove();
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function ensureGestureStart(handler: () => void): () => void {
  const eventTypes = ["pointerdown", "keydown", "touchstart"]; // broad user gesture coverage
  const listener = () => {
    handler();
    for (const type of eventTypes) {
      window.removeEventListener(type, listener);
    }
  };
  for (const type of eventTypes) {
    window.addEventListener(type, listener, { once: true, passive: true });
  }
  return () => {
    for (const type of eventTypes) {
      window.removeEventListener(type, listener);
    }
  };
}

async function startPlayback(volume: number): Promise<void> {
  const blob = await loadAudioBlob();
  if (!blob) return;

  stopAndCleanupAudio();

  currentObjectUrl = URL.createObjectURL(blob);
  const audio = new Audio(currentObjectUrl);
  audio.loop = true;
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  audio.style.display = "none";
  document.body.appendChild(audio);
  currentAudio = audio;

  try {
    // Attempt immediate play; may be blocked until gesture
    await audio.play();
  } catch {
    // Ignore; will be started after gesture if enabled
  }
}

const backgroundMusicPlugin: Plugin<typeof settings> = {
  id: "background-music",
  name: "Background Music",
  description: "Play your own music in the background while SEQTA is open.",
  version: "1.0.0",
  settings,
  styles,
  disableToggle: true,
  defaultEnabled: false,

  run: async (api) => {
    await api.storage.loaded;

    // react to specific setting changes
    api.settings.onChange("volume" as any, (value: any) => {
      const vol = (typeof value === "number" ? value : 0.5) as number;
      if (currentAudio) currentAudio.volume = Math.max(0, Math.min(1, vol));
    });

    // Note: Stop button/event removed by user; no stop handling needed

    // Start if we have audio and autoplay is enabled
    const tryStart = async () => {
      const vol = (api.settings as any).volume ?? 0.5;
      await startPlayback(vol);
    };

    // Always arm gesture start and attempt immediate start
    const cancel = ensureGestureStart(() => { tryStart(); });
    cleanupRegistered = true;
    (window as any).__betterseqta_bg_music_cancel__ = cancel;
    tryStart();

    // Pause on tab hide, resume on show with a small delay
    const visHandler = () => {
      if (!currentAudio) return;
      if (document.visibilityState === "hidden") {
        if (visibilityResumeTimeout !== null) {
          clearTimeout(visibilityResumeTimeout);
          visibilityResumeTimeout = null;
        }
        currentAudio.pause();
      } else if (document.visibilityState === "visible") {
        if (visibilityResumeTimeout !== null) {
          clearTimeout(visibilityResumeTimeout);
        }
        visibilityResumeTimeout = window.setTimeout(() => {
          visibilityResumeTimeout = null;
          currentAudio?.play().catch(() => {});
        }, 200);
      }
    };
    document.addEventListener("visibilitychange", visHandler);

    // Allow uploads to trigger refresh
    const uploadedHandler = () => {
      const vol = (api.settings as any).volume ?? 0.5;
      startPlayback(vol);
    };
    window.addEventListener("betterseqta-background-music-updated", uploadedHandler);

    return () => {
      document.removeEventListener("visibilitychange", visHandler);
      window.removeEventListener("betterseqta-background-music-updated", uploadedHandler);
      if (cleanupRegistered && (window as any).__betterseqta_bg_music_cancel__) {
        (window as any).__betterseqta_bg_music_cancel__();
        (window as any).__betterseqta_bg_music_cancel__ = undefined;
      }
      if (pendingGestureCancel) { pendingGestureCancel(); pendingGestureCancel = null; }
      if (visibilityResumeTimeout !== null) { clearTimeout(visibilityResumeTimeout); visibilityResumeTimeout = null; }
      stopAndCleanupAudio();
    };
  },
};

export default backgroundMusicPlugin;


