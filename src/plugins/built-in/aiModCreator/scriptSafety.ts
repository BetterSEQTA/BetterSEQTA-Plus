const MAX_SCRIPT_LENGTH = 20_000;

const BLOCKED_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  reason: string;
}> = [
  {
    pattern:
      /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection|sendBeacon)\b/i,
    reason: "network access",
  },
  {
    pattern: /\b(?:chrome|browser)\s*\./i,
    reason: "extension API access",
  },
  {
    pattern:
      /\b(?:localStorage|sessionStorage|indexedDB|caches|cookieStore)\b/i,
    reason: "browser storage access",
  },
  { pattern: /\bdocument\s*\.\s*cookie\b/i, reason: "cookie access" },
  {
    pattern:
      /\b(?:eval|Function|AsyncFunction|GeneratorFunction|importScripts|Worker|SharedWorker)\s*\(/i,
    reason: "dynamic code execution",
  },
  { pattern: /\bimport\s*\(/i, reason: "dynamic imports" },
  {
    pattern: /\b(?:globalThis|top|parent|opener)\b/i,
    reason: "cross-world access",
  },
  {
    pattern: /\b(?:location|history)\s*(?:\.|\[|=)/i,
    reason: "navigation",
  },
  {
    pattern: /\bwindow\s*\.\s*(?:open|postMessage)\s*\(/i,
    reason: "cross-window messaging",
  },
  {
    pattern: /\.(?:src|srcset|href|action|formAction)\s*=/i,
    reason: "network-capable DOM properties",
  },
  {
    pattern:
      /\.setAttribute\s*\(\s*["'`](?:src|srcset|href|action|formaction|style|on[^"'`]*)["'`]/i,
    reason: "unsafe DOM attributes",
  },
  {
    pattern: /\.(?:outerHTML|insertAdjacentHTML)\b/i,
    reason: "raw HTML injection",
  },
  {
    pattern: /<\s*(?:script|iframe|object|embed|link|meta|form)\b/i,
    reason: "active HTML",
  },
  {
    pattern: /\.(?:submit|requestSubmit|click)\s*\(/i,
    reason: "programmatic page actions",
  },
  {
    pattern: /\b(?:while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\))/i,
    reason: "unbounded loops",
  },
  {
    pattern: /(?:__proto__|prototype\s*\[|constructor\s*\.\s*constructor)/i,
    reason: "prototype escape",
  },
];

const EMPTY_STRING_LITERAL = /^['"`]\s*['"`]$/;

function assertNoUnsafeInnerHtml(script: string): void {
  for (const match of script.matchAll(/\.innerHTML\s*=\s*([^;\n]+)/g)) {
    if (!EMPTY_STRING_LITERAL.test(match[1].trim())) {
      throw new Error("Advanced script blocked: raw HTML injection");
    }
  }
  if (/\.innerHTML\s*\+=/.test(script)) {
    throw new Error("Advanced script blocked: raw HTML injection");
  }
}

export function assertAdvancedScriptSafe(value: unknown): string {
  if (typeof value !== "string") throw new Error("Advanced script must be text");
  const script = value.trim();
  if (!script) throw new Error("Advanced script is empty");
  if (script.length > MAX_SCRIPT_LENGTH) {
    throw new Error(
      `Advanced script is too long (maximum ${MAX_SCRIPT_LENGTH} characters)`,
    );
  }
  assertNoUnsafeInnerHtml(script);
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(script)) {
      throw new Error(`Advanced script blocked: ${reason}`);
    }
  }
  return script;
}
