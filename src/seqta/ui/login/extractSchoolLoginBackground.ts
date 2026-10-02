export type SchoolLoginBackgroundMedia = {
  src: string;
  type: "image" | "video";
};

type BackgroundCandidate = SchoolLoginBackgroundMedia & {
  score: number;
};

const BACKGROUND_HINT =
  /(?:background|backdrop|banner|wallpaper|branding|hero|cover|slide)/i;
const LOGO_HINT = /(?:logo|crest|emblem|badge|icon|avatar|mark)/i;

/** Pull a URL out of a CSS `background-image` value. */
export function parseCssBackgroundUrl(value: string): string | null {
  if (!value || value === "none") return null;

  const match = value.match(/url\(\s*(['"]?)([^'")]+)\1\s*\)/i);
  return match?.[2]?.trim() ?? null;
}

/** Resolve relative branding paths against the current SEQTA origin. */
export function resolveSchoolMediaUrl(
  url: string,
  origin: string = location.origin,
): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `${location.protocol}${url}`;
  if (url.startsWith("/")) return `${origin}${url}`;
  return new URL(url, `${origin}/`).href;
}

function elementArea(element: Element): number {
  if (!(element instanceof HTMLElement)) return 0;
  return Math.max(0, element.offsetWidth) * Math.max(0, element.offsetHeight);
}

function scoreMediaSource(
  element: Element,
  source: "css" | "img" | "video",
  url: string,
): number {
  let score = 0;
  const className = element.className?.toString() ?? "";
  const id = element.id ?? "";

  if (element.classList.contains("login")) score += 120;
  if (BACKGROUND_HINT.test(className) || BACKGROUND_HINT.test(id)) score += 80;
  if (/\/branding\b/i.test(url)) score += 90;
  if (LOGO_HINT.test(className) || LOGO_HINT.test(id)) score -= 120;

  const area = elementArea(element);
  if (area > 0) score += Math.min(100, Math.log10(area + 1) * 20);

  if (source === "css") score += 30;
  if (source === "video") score += 20;

  if (element instanceof HTMLImageElement) {
    const width = element.naturalWidth || element.width;
    const height = element.naturalHeight || element.height;
    if (width > 0 && height > 0) {
      score += Math.min(80, Math.log10(width * height + 1) * 15);
      if (width < 220 && height < 220) score -= 90;
    }
  }

  return score;
}

function addCandidate(
  candidates: BackgroundCandidate[],
  element: Element,
  source: "css" | "img" | "video",
  url: string | null | undefined,
  origin: string,
) {
  if (!url) return;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "none") return;

  candidates.push({
    src: resolveSchoolMediaUrl(trimmed, origin),
    type: source === "video" ? "video" : "image",
    score: scoreMediaSource(element, source, trimmed),
  });
}

function collectCandidates(root: ParentNode, origin: string): BackgroundCandidate[] {
  const candidates: BackgroundCandidate[] = [];
  const elements =
    root instanceof Element ? [root, ...root.querySelectorAll("*")] : [];

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;

    if (element instanceof HTMLVideoElement && element.currentSrc) {
      addCandidate(candidates, element, "video", element.currentSrc, origin);
    } else if (element instanceof HTMLVideoElement && element.src) {
      addCandidate(candidates, element, "video", element.src, origin);
    } else if (element instanceof HTMLImageElement && element.currentSrc) {
      addCandidate(candidates, element, "img", element.currentSrc, origin);
    } else if (element instanceof HTMLImageElement && element.src) {
      addCandidate(candidates, element, "img", element.src, origin);
    }

    if (element instanceof HTMLPictureElement) {
      for (const source of element.querySelectorAll("source[src]")) {
        addCandidate(
          candidates,
          element,
          "img",
          source.getAttribute("src"),
          origin,
        );
      }
    }

    addCandidate(
      candidates,
      element,
      "css",
      parseCssBackgroundUrl(element.style.backgroundImage),
      origin,
    );

    if (typeof getComputedStyle === "function") {
      const computed = getComputedStyle(element);
      addCandidate(
        candidates,
        element,
        "css",
        parseCssBackgroundUrl(computed.backgroundImage),
        origin,
      );
    }
  }

  return candidates;
}

/** Read the school-provided login wallpaper from SEQTA's native `.login` shell. */
export function extractSchoolLoginBackground(
  root: ParentNode | null = document.querySelector(".login"),
  origin: string = location.origin,
): SchoolLoginBackgroundMedia | null {
  if (!root) return null;

  const candidates = collectCandidates(root, origin);
  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best.score > 0 ? { src: best.src, type: best.type } : null;
}

export async function resolveSchoolLoginBackground(
  options: { timeoutMs?: number; origin?: string } = {},
): Promise<SchoolLoginBackgroundMedia | null> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const origin = options.origin ?? location.origin;

  const immediate = extractSchoolLoginBackground(
    document.querySelector(".login"),
    origin,
  );
  if (immediate) return immediate;

  const login = document.querySelector(".login");
  if (!login) return null;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: SchoolLoginBackgroundMedia | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(result);
    };

    const check = () => {
      const result = extractSchoolLoginBackground(login, origin);
      if (result) finish(result);
    };

    const observer = new MutationObserver(check);
    observer.observe(login, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style", "class", "src"],
    });

    for (const img of login.querySelectorAll("img")) {
      if (img.complete) continue;
      img.addEventListener("load", check, { once: true });
      img.addEventListener("error", check, { once: true });
    }

    const timer = window.setTimeout(
      () => finish(extractSchoolLoginBackground(login, origin)),
      timeoutMs,
    );
    check();
  });
}
