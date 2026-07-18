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

const GESTURE_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;
const gestureOpts: AddEventListenerOptions = { capture: true, passive: true };

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let gestureCleanup: (() => void) | null = null;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let hintEl: HTMLElement | null = null;

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function clearHint(): void {
  hintEl?.remove();
  hintEl = null;
}

function disarmGesture(): void {
  gestureCleanup?.();
  gestureCleanup = null;
}

function stopAudio(): void {
  audio?.pause();
  audio?.remove();
  audio = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
}

/** Prepare <audio> so play() can run synchronously inside a user-gesture handler. */
async function prepareAudio(vol: number): Promise<boolean> {
  const blob = await store.getItem<Blob>("audio-blob");
  if (!(blob instanceof Blob)) {
    stopAudio();
    clearHint();
    return false;
  }
  if (!audio) {
    stopAudio();
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.loop = true;
    audio.preload = "auto";
    audio.style.display = "none";
    document.body.append(audio);
  }
  audio.volume = clamp(vol);
  return true;
}

function attemptPlay(vol: number): Promise<boolean> {
  if (!audio) return Promise.resolve(false);
  audio.volume = clamp(vol);
  return audio
    .play()
    .then(() => {
      disarmGesture();
      return true;
    })
    .catch(() => false);
}

function armGesture(onGesture: () => void): void {
  disarmGesture();
  const listener = (event: Event) => {
    if (event.type === "keydown") {
      const key = (event as KeyboardEvent).key;
      if (key !== "Enter" && key !== " ") return;
    }
    onGesture();
  };
  for (const type of GESTURE_EVENTS) {
    document.addEventListener(type, listener, gestureOpts);
  }
  gestureCleanup = () => {
    for (const type of GESTURE_EVENTS) {
      document.removeEventListener(type, listener, gestureOpts);
    }
    clearHint();
  };

  clearHint();
  const hint = document.createElement("button");
  hint.id = "bsplus-bg-music-hint";
  hint.type = "button";
  hint.className = "bsplus-bg-music-hint";
  hint.textContent = "Tap to start background music";
  hint.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    onGesture();
  });
  document.body.append(hint);
  hintEl = hint;
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

    type BgSettings = { volume?: number; pauseOnHidden?: boolean };
    const vol = () => (api.settings as BgSettings).volume ?? 0.5;
    const pauseOnHidden = () => (api.settings as BgSettings).pauseOnHidden ?? true;

    const gesturePlay = () => {
      void attemptPlay(vol());
    };

    const ensurePlayback = async () => {
      if (!(await prepareAudio(vol()))) return;
      if (audio && !audio.paused) {
        disarmGesture();
        return;
      }
      if (!(await attemptPlay(vol()))) armGesture(gesturePlay);
    };

    api.settings.onChange("volume" as never, (value: unknown) => {
      if (typeof value === "number" && audio) audio.volume = clamp(value);
    });

    api.settings.onChange("pauseOnHidden" as never, (value: unknown) => {
      if (
        value === false &&
        audio?.paused &&
        document.visibilityState === "visible"
      ) {
        void ensurePlayback();
      }
    });

    await ensurePlayback();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (!pauseOnHidden() || !audio) return;
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = null;
        audio.pause();
        return;
      }
      if (!audio) {
        void ensurePlayback();
        return;
      }
      if (!pauseOnHidden()) return;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        void attemptPlay(vol());
      }, 200);
    };

    const onUpdated = () => void ensurePlayback();
    const onStop = () => {
      disarmGesture();
      stopAudio();
    };
    const teardown = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onUpdated);
      window.removeEventListener("betterseqta-background-music-updated", onUpdated);
      window.removeEventListener("betterseqta-background-music-stop", onStop);
      if (resumeTimer) clearTimeout(resumeTimer);
      disarmGesture();
      stopAudio();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onUpdated);
    window.addEventListener("betterseqta-background-music-updated", onUpdated);
    window.addEventListener("betterseqta-background-music-stop", onStop);

    return teardown;
  },
};

export default backgroundMusicPlugin;
