import browser from "webextension-polyfill";

function detectOsNameFromNavigator(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? "";

  const userAgentData = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  if (userAgentData?.platform) {
    const mapped: Record<string, string> = {
      Windows: "Windows",
      macOS: "macOS",
      Linux: "Linux",
      Android: "Android",
      iOS: "iOS",
      "Chrome OS": "ChromeOS",
    };
    return mapped[userAgentData.platform] ?? userAgentData.platform;
  }

  if (/Win/i.test(platform) || ua.includes("Windows")) return "Windows";
  if (/Mac/i.test(platform) || ua.includes("Mac OS X") || ua.includes("Macintosh")) return "macOS";
  if (/Linux/i.test(platform) || ua.includes("Linux")) return "Linux";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";

  return platform || "Unknown OS";
}

function detectBrowserNameFromUserAgent(ua: string): string {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "Browser";
}

async function detectBrowserName(): Promise<string> {
  try {
    const runtime = browser.runtime as typeof browser.runtime & {
      getBrowserInfo?: () => Promise<{ name?: string }>;
    };
    if (typeof runtime.getBrowserInfo === "function") {
      const info = await runtime.getBrowserInfo();
      if (info.name === "Firefox") return "Firefox";
      if (info.name) return info.name;
    }
  } catch {
    // Fall back to user-agent parsing below.
  }

  if (typeof navigator !== "undefined") {
    return detectBrowserNameFromUserAgent(navigator.userAgent);
  }

  return "Browser";
}

/**
 * Friendly device label for BetterSEQTA+ cloud login (`device_name` on POST /api/bsplus/login).
 * Format: "Chrome on Windows", "Firefox on macOS", etc.
 */
export async function getBsplusDeviceName(): Promise<string> {
  const browserName = await detectBrowserName();
  const osName =
    typeof navigator !== "undefined" ? detectOsNameFromNavigator() : "Unknown OS";
  return `${browserName} on ${osName}`;
}
