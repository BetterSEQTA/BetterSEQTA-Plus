export const ANALYTICS_MOTION_CLASS = "bsplus-analytics-motion";

export function analyticsMotionEnabled(animations: boolean | undefined): boolean {
  return animations === true;
}

export function applyAnalyticsMotionClass(
  target: { classList: { toggle: (token: string, force?: boolean) => unknown } },
  animations: boolean | undefined,
): void {
  target.classList.toggle(ANALYTICS_MOTION_CLASS, analyticsMotionEnabled(animations));
}
