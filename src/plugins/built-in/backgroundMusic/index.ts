import type { Plugin } from "@/plugins/core/types";
import { booleanSetting, componentSetting, defineSettings, numberSetting } from "@/plugins/core/settingsHelpers";
import styles from "./styles.css?inline";
import BackgroundMusicSetting from "./BackgroundMusicSetting.svelte";
import localforage from "localforage";

const settings = defineSettings({
  uploader: componentSetting({
    title: "Background Music",
    description: "Upload a .wav or .mp3 audio file to play in the background",
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
  pauseOnHidden: booleanSetting({
    title: "Pause when tab hidden",
    description: "Pause music when switching to another tab or minimizing the browser",
    default: true,
  }),
});

const store = localforage.createInstance({
  name: "background-music-store",
  storeName: "music",
});

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
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

function disarmGesturePlayback(): void {
  if (pendingGestureCancel) {
    pendingGestureCancel();
    pendingGestureCancel = null;
  }
}

function armGesturePlayback(handler: () => void): void {
  disarmGesturePlayback();
  const eventTypes = ["pointerdown", "keydown", "touchstart"] as const;
  const listener = () => {
    disarmGesturePlayback();
    handler();
  };
  for (const type of eventTypes) {
    window.addEventListener(type, listener, { once: true, passive: true });
  }
  pendingGestureCancel = () => {
    for (const type of eventTypes) {
      window.removeEventListener(type, listener);
    }
  };
}

async function startPlayback(volume: number): Promise<boolean> {
  const blob = await loadAudioBlob();
  if (!blob) return false;

  if (!currentAudio) {
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
  } else {
    currentAudio.volume = Math.max(0, Math.min(1, volume));
  }

  try {
    await currentAudio.play();
    return true;
  } catch {
    return false;
  }
}

const backgroundMusicPlugin: Plugin<typeof settings> = {
  id: "background-music",
  name: "Background Music",
  description: "Play your own music in the background while SEQTA is open",
  version: "1.0.0",
  settings,
  styles,
  disableToggle: true,
  defaultEnabled: false,

  run: async (api) => {
    await api.storage.loaded;

    const tryStart = async () => {
      const blob = await loadAudioBlob();
      if (!blob) return;

      const vol = (api.settings as { volume?: number }).volume ?? 0.5;
      const played = await startPlayback(vol);
      if (played) {
        disarmGesturePlayback();
      } else {
        armGesturePlayback(() => void tryStart());
      }
    };

    api.settings.onChange("volume" as never, (value: unknown) => {
      const vol = typeof value === "number" ? value : 0.5;
      if (currentAudio) currentAudio.volume = Math.max(0, Math.min(1, vol));
    });

    api.settings.onChange("pauseOnHidden" as never, (value: unknown) => {
      const pauseOnHidden = typeof value === "boolean" ? value : true;
      if (
        !pauseOnHidden &&
        currentAudio?.paused &&
        document.visibilityState === "visible"
      ) {
        void tryStart();
      }
    });

    armGesturePlayback(() => void tryStart());
    void tryStart();

    const visHandler = () => {
      if (!currentAudio) {
        if (document.visibilityState === "visible") void tryStart();
        return;
      }

      const pauseOnHidden =
        (api.settings as { pauseOnHidden?: boolean }).pauseOnHidden ?? true;
      if (!pauseOnHidden) return;

      if (document.visibilityState === "hidden") {
        if (visibilityResumeTimeout !== null) {
          clearTimeout(visibilityResumeTimeout);
          visibilityResumeTimeout = null;
        }
        currentAudio.pause();
      } else {
        if (visibilityResumeTimeout !== null) {
          clearTimeout(visibilityResumeTimeout);
        }
        visibilityResumeTimeout = window.setTimeout(() => {
          visibilityResumeTimeout = null;
          void tryStart();
        }, 200);
      }
    };
    document.addEventListener("visibilitychange", visHandler);

    const pageshowHandler = () => void tryStart();
    window.addEventListener("pageshow", pageshowHandler);

    const uploadedHandler = () => void tryStart();
    window.addEventListener("betterseqta-background-music-updated", uploadedHandler);

    return () => {
      document.removeEventListener("visibilitychange", visHandler);
      window.removeEventListener("pageshow", pageshowHandler);
      window.removeEventListener(
        "betterseqta-background-music-updated",
        uploadedHandler,
      );
      disarmGesturePlayback();
      if (visibilityResumeTimeout !== null) {
        clearTimeout(visibilityResumeTimeout);
        visibilityResumeTimeout = null;
      }
      stopAndCleanupAudio();
    };
  },
};

export default backgroundMusicPlugin;
