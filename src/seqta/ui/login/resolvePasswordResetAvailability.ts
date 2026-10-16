import {
  fetchLoginShellConfig,
  isPasswordResetAvailable,
  type SeqtaLoginShellConfig,
} from "@/seqta/utils/seqtaLoginShellConfig";

export type PasswordResetAvailability = {
  available: boolean;
  resetLink: string | null;
};

export type PasswordResetDomState = PasswordResetAvailability & {
  /** Whether SEQTA rendered a `.reset` section (even if hidden). */
  resetPresent: boolean;
};

/** Detect whether SEQTA's reset block is shown — ignore inherited visibility from hidden `.login`. */
function isResetSectionShown(element: HTMLElement): boolean {
  if (element.hidden) return false;
  if (element.style.display === "none") return false;
  if (typeof getComputedStyle !== "function") return true;
  return getComputedStyle(element).display !== "none";
}

/** Read forgot-password availability from SEQTA's native `.login` shell. */
export function extractPasswordResetFromLoginDom(
  root: ParentNode | null = document.querySelector(".login"),
): PasswordResetDomState {
  if (!root) {
    return { available: false, resetLink: null, resetPresent: false };
  }

  const resetRoot = root.querySelector(".reset");
  if (!(resetRoot instanceof HTMLElement)) {
    return { available: false, resetLink: null, resetPresent: false };
  }

  if (!isResetSectionShown(resetRoot)) {
    return { available: false, resetLink: null, resetPresent: true };
  }

  const externalLink = resetRoot.querySelector("a[href]");
  if (externalLink instanceof HTMLAnchorElement && externalLink.href) {
    return {
      available: true,
      resetLink: externalLink.href,
      resetPresent: true,
    };
  }

  if (resetRoot.querySelector(".forgot, button")) {
    return { available: true, resetLink: null, resetPresent: true };
  }

  return { available: false, resetLink: null, resetPresent: true };
}

/**
 * Use the login probe as the source of truth when available.
 * Fall back to the native shell only when the probe is unavailable.
 */
export function mergePasswordResetAvailability(
  api: SeqtaLoginShellConfig | null,
  dom: PasswordResetDomState,
): PasswordResetAvailability {
  if (api) {
    const available = isPasswordResetAvailable(api);
    return {
      available,
      resetLink: available ? (api.resetLink ?? dom.resetLink) : null,
    };
  }

  if (dom.available) {
    return { available: true, resetLink: dom.resetLink };
  }

  return { available: false, resetLink: null };
}

export async function resolvePasswordResetAvailability(
  options: { timeoutMs?: number } = {},
): Promise<PasswordResetAvailability> {
  const timeoutMs = options.timeoutMs ?? 4000;

  const api = await fetchLoginShellConfig();
  const immediateDom = extractPasswordResetFromLoginDom();
  const merged = mergePasswordResetAvailability(api, immediateDom);

  if (api || immediateDom.available || immediateDom.resetPresent) {
    return merged;
  }

  const login = document.querySelector(".login");
  if (!login) return merged;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: PasswordResetAvailability) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(value);
    };

    const check = () => {
      const dom = extractPasswordResetFromLoginDom(login);
      if (dom.resetPresent || dom.available) {
        finish(mergePasswordResetAvailability(api, dom));
      }
    };

    const observer = new MutationObserver(check);
    observer.observe(login, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style", "class", "hidden"],
    });

    const timer = window.setTimeout(
      () =>
        finish(
          mergePasswordResetAvailability(api, extractPasswordResetFromLoginDom(login)),
        ),
      timeoutMs,
    );
    check();
  });
}

export type PasswordResetUi = {
  forgotWrap: HTMLElement;
  onInternalReset?: () => void;
};

export function applyPasswordResetUi(
  ui: PasswordResetUi,
  reset: PasswordResetAvailability,
) {
  ui.forgotWrap.replaceChildren();

  if (!reset.available) return;

  if (reset.resetLink) {
    const link = document.createElement("a");
    link.className = "text-link";
    link.href = reset.resetLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Forgot your password?";
    ui.forgotWrap.appendChild(link);
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "text-link";
  button.textContent = "Forgot your password?";
  button.addEventListener("click", () => ui.onInternalReset?.());
  ui.forgotWrap.appendChild(button);
}

export function watchPasswordResetAvailability(
  onChange: (reset: PasswordResetAvailability) => void,
  options: { api?: SeqtaLoginShellConfig | null } = {},
): () => void {
  const login = document.querySelector(".login");
  if (!login) return () => {};

  const notify = () => {
    onChange(
      mergePasswordResetAvailability(
        options.api ?? null,
        extractPasswordResetFromLoginDom(login),
      ),
    );
  };

  const observer = new MutationObserver(notify);
  observer.observe(login, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ["style", "class", "hidden"],
  });

  return () => observer.disconnect();
}
