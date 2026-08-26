import {
  ANALYTICS_MOTION_CLASS,
  analyticsMotionEnabled,
  applyAnalyticsMotionClass,
} from "./motion";

describe("analyticsMotionEnabled", () => {
  it("is on only when the animations setting is true", () => {
    expect(analyticsMotionEnabled(true)).toBe(true);
    expect(analyticsMotionEnabled(false)).toBe(false);
  });
});

describe("applyAnalyticsMotionClass", () => {
  it("adds the motion class when animations are enabled", () => {
    const el = { classList: { toggle: jest.fn() } };
    applyAnalyticsMotionClass(el, true);
    expect(el.classList.toggle).toHaveBeenCalledWith(ANALYTICS_MOTION_CLASS, true);
  });

  it("removes the motion class when animations are disabled", () => {
    const el = { classList: { toggle: jest.fn() } };
    applyAnalyticsMotionClass(el, false);
    expect(el.classList.toggle).toHaveBeenCalledWith(ANALYTICS_MOTION_CLASS, false);
  });
});
