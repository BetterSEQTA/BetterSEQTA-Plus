import type { Plugin } from "@/plugins/core/types";
import {
  booleanSetting,
  componentSetting,
  defineSettings,
  numberSetting,
} from "@/plugins/core/settingsHelpers";
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
    description:
      "Pause music when switching to another tab or minimizing the browser",
    default: true,
  }),
});

const store = localforage.createInstance({
  name: "background-music-store",
  storeName: "music",
});

const HINT_ID = "bsplus-bg-music-hint";

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let pendingGestureCancel: (() => void) | null = null;
let visibilityResumeTimeout: number | null = null;
let hintElement: HTMLElement | null = null;
let isPlaying = false;

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
  isPlaying = false;
}

function hideAutoplayHint(): void {
  if (hintElement) {
    hintElement.remove();
    hintElement = null;
  }
}

function showAutoplayHint(onActivate: () => void): void {
  hideAutoplayHint();
  const hint = document.createElement("button");
  hint.id = HINT_ID;
  hint.type = "button";
  hint.className = "bsplus-bg-music-hint";
  hint.textContent = "Tap to start background music";
  hint.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    onActivate();
  });
  document.body.appendChild(hint);
  hintElement = hint;
}

function disarmGesturePlayback(): void {
  if (pendingGestureCancel) {
    pendingGestureCancel();
    pendingGestureCancel = null;
  }
}

/** Prepare <audio> so play() can run synchronously inside a user-gesture handler. */
async function prepareAudioElement(volume: number): Promise<boolean> {
  const blob = await loadAudioBlob();
  if (!blob) {
    stopAndCleanupAudio();
    hideAutoplayHint();
    return false;
  }

  if (!currentAudio) {
    stopAndCleanupAudio();
    currentObjectUrl = URL.createObjectURL(blob);
    const audio = new Audio(currentObjectUrl);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.preload = "auto";
    audio.style.display = "none";
    document.body.appendChild(audio);
    currentAudio = audio;
  } else {
    currentAudio.volume = Math.max(0, Math.min(1, volume));
  }

  return true;
}

/**
 * Must be called synchronously from a user-gesture handler (no await before this).
 */
function playPreparedAudio(volume: number): boolean {
  if (!currentAudio) return false;
  currentAudio.volume = Math.max(0, Math.min(1, volume));
  try {
    const result = currentAudio.play();
    void result
      .then(() => {
        isPlaying = true;
        hideAutoplayHint();
        disarmGesturePlayback();
      })
      .catch(() => {
        isPlaying = false;
      });
    return true;
  } catch {
    isPlaying = false;
    return false;
  }
}

async function tryAutoplay(volume: number): Promise<boolean> {
  const ready = await prepareAudioElement(volume);
  if (!ready || !currentAudio) return false;

  try {
    await currentAudio.play();
    isPlaying = true;
    hideAutoplayHint();
    disarmGesturePlayback();
    return true;
  } catch {
    isPlaying = false;
    return false;
  }
}

function armGesturePlayback(onGesture: () => void): void {
  disarmGesturePlayback();

  const listener = (event: Event) => {
    if (event.type === "keydown") {
      const key = (event as KeyboardEvent).key;
      if (key !== "Enter" && key !== " ") return;
    }
    onGesture();
  };

  const options: AddEventListenerOptions = { capture: true, passive: true };
  const types = ["pointerdown", "keydown", "touchstart"] as const;
  for (const type of types) {
    document.addEventListener(type, listener, options);
  }

  pendingGestureCancel = () => {
    for (const type of types) {
      document.removeEventListener(type, listener, options);
    }
    hideAutoplayHint();
  };

  showAutoplayHint(onGesture);
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

    const getVolume = () =>
      (api.settings as { volume?: number }).volume ?? 0.5;

    const gestureStart = () => {
      if (!currentAudio) return;
      playPreparedAudio(getVolume());
    };

    const ensurePlayback = async () => {
      const vol = getVolume();
      const ready = await prepareAudioElement(vol);
      if (!ready) return;

      if (isPlaying && currentAudio && !currentAudio.paused) {
        hideAutoplayHint();
        disarmGesturePlayback();
        return;
      }

      const autoplayed = await tryAutoplay(vol);
      if (!autoplayed) {
        armGesturePlayback(gestureStart);
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
        void ensurePlayback();
      }
    });

    await ensurePlayback();

    const visHandler = () => {
      const pauseOnHidden =
        (api.settings as { pauseOnHidden?: boolean }).pauseOnHidden ?? true;

      if (document.visibilityState === "hidden") {
        if (!pauseOnHidden || !currentAudio) return;
        if (visibilityResumeTimeout !== null) {
          clearTimeout(visibilityResumeTimeout);
          visibilityResumeTimeout = null;
        }
        currentAudio.pause();
        isPlaying = false;
        return;
      }

      if (!currentAudio) {
        void ensurePlayback();
        return;
      }

      if (!pauseOnHidden) return;

      if (visibilityResumeTimeout !== null) {
        clearTimeout(visibilityResumeTimeout);
      }
      visibilityResumeTimeout = window.setTimeout(() => {
        visibilityResumeTimeout = null;
        void tryAutoplay(getVolume());
      }, 200);
    };
    document.addEventListener("visibilitychange", visHandler);

    const pageshowHandler = () => void ensurePlayback();
    window.addEventListener("pageshow", pageshowHandler);

    const uploadedHandler = () => void ensurePlayback();
    window.addEventListener(
      "betterseqta-background-music-updated",
      uploadedHandler,
    );

    const stopHandler = () => {
      disarmGesturePlayback();
      stopAndCleanupAudio();
      hideAutoplayHint();
    };
    window.addEventListener("betterseqta-background-music-stop", stopHandler);

    return () => {
      document.removeEventListener("visibilitychange", visHandler);
      window.removeEventListener("pageshow", pageshowHandler);
      window.removeEventListener(
        "betterseqta-background-music-updated",
        uploadedHandler,
      );
      window.removeEventListener(
        "betterseqta-background-music-stop",
        stopHandler,
      );
      disarmGesturePlayback();
      hideAutoplayHint();
      if (visibilityResumeTimeout !== null) {
        clearTimeout(visibilityResumeTimeout);
        visibilityResumeTimeout = null;
      }
      stopAndCleanupAudio();
    };
  },
};

export default backgroundMusicPlugin;
