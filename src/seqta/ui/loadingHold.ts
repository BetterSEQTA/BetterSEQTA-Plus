export const LOADING_SCREEN_DEBUG_DELAY_MS = 5000;

export function loadingScreenHoldMs(settings: {
  devMode?: boolean;
  devDelayLoadingScreen?: boolean;
}): number {
  return settings.devMode && settings.devDelayLoadingScreen
    ? LOADING_SCREEN_DEBUG_DELAY_MS
    : 0;
}
