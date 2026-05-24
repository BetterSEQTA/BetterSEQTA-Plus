import browser from "webextension-polyfill";
import Color from "color";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { lightenAndPaleColor } from "./lightenAndPaleColor";
import ColorLuminance from "./ColorLuminance";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { getAdaptiveColour } from "@/seqta/utils/adaptiveThemeColour";
import { getCustomThemeAdaptiveCssVariableBindings } from "@/seqta/ui/colors/customThemeAdaptiveBindings";

import darkLogo from "@/resources/icons/betterseqta-light-full.png";
import lightLogo from "@/resources/icons/betterseqta-dark-full.png";

const ADAPTIVE_THEME_TRANSITION_MS = 400;

let colorTransitionRafId: number | null = null;
let lastInterpolatedHex: string | null = null;

// Helper functions
const setCSSVar = (varName: any, value: any) =>
  document.documentElement.style.setProperty(varName, value);
const applyProperties = (props: any) =>
  Object.entries(props).forEach(([key, value]) => setCSSVar(key, value));

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Best-effort parse of a single sRGB hex from a colour string (hex, rgb, or gradient). */
function parseRepresentativeHex(s: string): string | null {
  if (!s || !s.trim()) return null;
  const trimmed = s.trim();
  try {
    return Color(trimmed).hex();
  } catch {
    // continue
  }
  if (trimmed.includes("gradient")) {
    const regex =
      /#[0-9a-fA-F]{6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/gi;
    const stops = trimmed.match(regex);
    if (stops?.length) {
      try {
        return Color(stops[0]).hex();
      } catch {
        // continue
      }
    }
  }
  const hexMatch = trimmed.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/);
  if (hexMatch) {
    try {
      return Color(hexMatch[0]).hex();
    } catch {
      // continue
    }
  }
  const rgbaMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbaMatch) {
    try {
      return Color.rgb(
        Number(rgbaMatch[1]),
        Number(rgbaMatch[2]),
        Number(rgbaMatch[3]),
      ).hex();
    } catch {
      // continue
    }
  }
  return null;
}

function getFromHex(): string | null {
  const fromComputed = parseRepresentativeHex(
    getComputedStyle(document.documentElement).getPropertyValue("--better-main").trim(),
  );
  if (fromComputed) return fromComputed;
  return lastInterpolatedHex;
}

function cancelColorTransition() {
  if (colorTransitionRafId !== null) {
    cancelAnimationFrame(colorTransitionRafId);
    colorTransitionRafId = null;
  }
}

function getRepresentativeRgbChannels(s: string): { r: number; g: number; b: number } | null {
  const parsedHex = parseRepresentativeHex(s);
  if (!parsedHex) return null;
  try {
    const [r, g, b] = Color(parsedHex).rgb().array();
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
    };
  } catch {
    return null;
  }
}

function applyColorsWith(selectedColor: string) {
  if (settingsState.transparencyEffects) {
    document.documentElement.classList.add("transparencyEffects");
  }

  // Common properties, always applied
  const commonProps = {
    "--better-sub": "#161616",
    "--better-alert-highlight": "#c61851",
    "--better-main": selectedColor,
  };

  // Mode-based properties, applied if storedSetting is provided
  let modeProps = {};
  modeProps = settingsState.DarkMode
    ? {
        "--betterseqta-logo": `url(${browser.runtime.getURL(darkLogo)})`,
      }
    : {
        "--better-pale": lightenAndPaleColor(selectedColor),
        "--betterseqta-logo": `url(${browser.runtime.getURL(lightLogo)})`,
      };

  if (settingsState.DarkMode) {
    document.documentElement.style.removeProperty("--better-pale");
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Dynamic properties, always applied
  const rgbThreshold = GetThresholdOfColor(selectedColor);
  const isBright = rgbThreshold > 210;
  const dynamicProps = {
    "--text-color": isBright ? "black" : "white",
    "--better-light":
      selectedColor === "#ffffff"
        ? "#b7b7b7"
        : ColorLuminance(selectedColor, 0.95),
  };

  // Apply all the properties
  applyProperties({ ...commonProps, ...modeProps, ...dynamicProps });

  if (settingsState.selectedTheme) {
    const channels = getRepresentativeRgbChannels(selectedColor);
    for (const binding of getCustomThemeAdaptiveCssVariableBindings()) {
      if (!binding.channel) {
        setCSSVar(binding.cssVarName, selectedColor);
        continue;
      }

      if (!channels) {
        continue;
      }

      if (binding.channel === "r") {
        setCSSVar(binding.cssVarName, String(channels.r));
      } else if (binding.channel === "g") {
        setCSSVar(binding.cssVarName, String(channels.g));
      } else {
        setCSSVar(binding.cssVarName, String(channels.b));
      }
    }
  }

  // Let themes opt-in to overriding only adaptive accent output.
  // A theme can define `--adaptive-better-main` from adaptive channel bindings.
  if (settingsState.selectedTheme && settingsState.adaptiveThemeColour) {
    const adaptiveOverride = getComputedStyle(document.documentElement)
      .getPropertyValue("--adaptive-better-main")
      .trim();
    if (adaptiveOverride) {
      setCSSVar("--better-main", adaptiveOverride);
    }
  }

  let alliframes = document.getElementsByTagName("iframe");

  for (let i = 0; i < alliframes.length; i++) {
    const element = alliframes[i];

    if (element.getAttribute("excludeDarkCheck") == "true") {
      continue;
    }

    if (settingsState.DarkMode) {
      element.contentDocument?.documentElement.classList.add("dark");
    } else {
      element.contentDocument?.documentElement.classList.remove("dark");
    }
  }
}

function toSoftGradient(hex: string): string {
  const base = Color(hex);
  const analogous = base.rotate(30).lighten(0.25).saturate(0.15);
  const mid = base.mix(analogous, 0.5).hex();
  return `linear-gradient(135deg, ${hex} 0%, ${mid} 50%, ${analogous.hex()} 100%)`;
}

export async function updateAllColors() {
  let effectiveColor =
    settingsState.selectedColor !== ""
      ? settingsState.selectedColor
      : "#007bff";

  let adaptiveHex: string | null = null;

  if (settingsState.adaptiveThemeColour) {
    const adaptiveColor = await getAdaptiveColour();
    if (adaptiveColor) {
      adaptiveHex = adaptiveColor;
      effectiveColor = settingsState.adaptiveThemeGradient
        ? toSoftGradient(adaptiveColor)
        : adaptiveColor;
    }
  }

  const baseSelected =
    settingsState.selectedColor !== "" ? settingsState.selectedColor : "#007bff";
  const toHex =
    adaptiveHex ?? parseRepresentativeHex(baseSelected);

  const shouldAnimate =
    settingsState.adaptiveThemeColour &&
    (settingsState.adaptiveThemeColourTransition ?? true) &&
    !!toHex;

  const applyImmediate = () => {
    cancelColorTransition();
    applyColorsWith(effectiveColor);
    if (toHex) lastInterpolatedHex = toHex;
  };

  if (!shouldAnimate) {
    applyImmediate();
    return;
  }

  const fromHex = getFromHex();

  if (!fromHex || !toHex || fromHex === toHex) {
    applyImmediate();
    return;
  }

  const useSoftGradientOnFrames =
    !!adaptiveHex && !!settingsState.adaptiveThemeGradient;

  cancelColorTransition();

  const start = performance.now();

  const step = (now: number) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / ADAPTIVE_THEME_TRANSITION_MS);
    const eased = easeInOutCubic(t);
    const interpolatedHex = Color(fromHex).mix(Color(toHex), eased).hex();
    const display = useSoftGradientOnFrames
      ? toSoftGradient(interpolatedHex)
      : interpolatedHex;
    applyColorsWith(display);

    if (t < 1) {
      colorTransitionRafId = requestAnimationFrame(step);
    } else {
      colorTransitionRafId = null;
      applyColorsWith(effectiveColor);
      lastInterpolatedHex = toHex;
    }
  };

  colorTransitionRafId = requestAnimationFrame(step);
}
