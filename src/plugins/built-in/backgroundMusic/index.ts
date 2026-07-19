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
let gesturePending = false;
let ensureInFlight: Promise<void> | null = null;

const clamp = (v: number) => Math.max(0, Math.min(1, v));

async function waitForBody(): Promise<HTMLElement> {
  if (document.body) return document.body;
  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  });
  return document.body!;
}

function clearHint(): void {
  hintEl?.remove();
  hintEl = null;
}

function disarmGesture(): void {
  gestureCleanup?.();
  gestureCleanup = null;
  gesturePending = false;
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

  const body = await waitForBody();

  if (!audio) {
    stopAudio();
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.loop = true;
    audio.preload = "auto";
    audio.style.display = "none";
    body.append(audio);
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
      clearHint();
      return true;
    })
    .catch(() => false);
}

/** Must stay synchronous — any await before play() drops user activation. */
function playFromUserGesture(vol: number): void {
  if (!audio) {
    gesturePending = true;
    return;
  }
  audio.volume = clamp(vol);
  void audio.play().then(
    () => {
      disarmGesture();
      clearHint();
    },
    () => {
      // Keep listeners armed; show hint if somehow missing.
      if (!hintEl) showHint(() => playFromUserGesture(vol));
    },
  );
}

function showHint(onActivate: () => void): void {
  clearHint();
  if (!document.body) return;
  const hint = document.createElement("button");
  hint.id = "bsplus-bg-music-hint";
  hint.type = "button";
  hint.className = "bsplus-bg-music-hint";
  hint.textContent = "Tap to start background music";
  hint.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    onActivate();
  });
  document.body.append(hint);
  hintEl = hint;
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
    window.addEventListener(type, listener, gestureOpts);
    document.addEventListener(type, listener, gestureOpts);
  }
  gestureCleanup = () => {
    for (const type of GESTURE_EVENTS) {
      window.removeEventListener(type, listener, gestureOpts);
      document.removeEventListener(type, listener, gestureOpts);
    }
  };
  showHint(onGesture);
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
    const pauseOnHidden = () =>
      (api.settings as BgSettings).pauseOnHidden ?? true;

    const runEnsurePlayback = async () => {
      if (!(await prepareAudio(vol()))) return;

      if (audio && !audio.paused) {
        disarmGesture();
        clearHint();
        return;
      }

      // Arm unlock before autoplay so the next click/key can call play()
      // synchronously (async gaps drop user activation).
      if (!gestureCleanup) {
        armGesture(() => playFromUserGesture(vol()));
      }

      if (gesturePending) {
        gesturePending = false;
        playFromUserGesture(vol());
        if (audio && !audio.paused) return;
      }

      if (await attemptPlay(vol())) return;

      // Retry after load — some browsers allow autoplay once the page settles
      // or Media Engagement Index applies from prior visits.
      for (const delayMs of [500, 1500, 3000]) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (!audio || !audio.paused) return;
        if (await attemptPlay(vol())) return;
      }
    };

    const ensurePlayback = () => {
      if (!ensureInFlight) {
        ensureInFlight = runEnsurePlayback().finally(() => {
          ensureInFlight = null;
        });
      }
      return ensureInFlight;
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
        void ensurePlayback();
      }, 200);
    };

    const onUpdated = () => void ensurePlayback();
    const onStop = () => {
      disarmGesture();
      clearHint();
      stopAudio();
    };

    const pageChange = api.seqta.onPageChange(() => {
      void ensurePlayback();
    });

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onUpdated);
    window.addEventListener("betterseqta-background-music-updated", onUpdated);
    window.addEventListener("betterseqta-background-music-stop", onStop);

    void ensurePlayback();

    return () => {
      pageChange.unregister();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onUpdated);
      window.removeEventListener(
        "betterseqta-background-music-updated",
        onUpdated,
      );
      window.removeEventListener("betterseqta-background-music-stop", onStop);
      if (resumeTimer) clearTimeout(resumeTimer);
      disarmGesture();
      clearHint();
      stopAudio();
    };
  },
};

export default backgroundMusicPlugin;
