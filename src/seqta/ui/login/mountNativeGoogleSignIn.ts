const NATIVE_GOOGLE_BUTTON_SELECTOR =
  '.login .googleLogin [role="button"], .login .g_id_signin [role="button"]';

declare global {
  interface Window {
    _googleAuthSuccess?: (response: { credential?: string }) => void;
    _googleAuthFailure?: (response: { credential?: string }) => void;
    [key: string]: unknown;
  }
}

/** Wait for SEQTA's native Google Identity Services button to render. */
export function waitForNativeGoogleButton(
  root: ParentNode = document,
  timeoutMs = 10000,
): Promise<HTMLElement | null> {
  const existing = root.querySelector<HTMLElement>(NATIVE_GOOGLE_BUTTON_SELECTOR);
  if (existing) return Promise.resolve(existing);

  const login = root.querySelector(".login");
  if (!login) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (button: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(button);
    };

    const check = () => {
      const button = login.querySelector<HTMLElement>(NATIVE_GOOGLE_BUTTON_SELECTOR);
      if (button) finish(button);
    };

    const observer = new MutationObserver(check);
    observer.observe(login, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const timer = window.setTimeout(
      () => finish(login.querySelector<HTMLElement>(NATIVE_GOOGLE_BUTTON_SELECTOR)),
      timeoutMs,
    );
    check();
  });
}

function wrapGoogleAuthCallback(
  onCredential: (credential: string) => void,
): () => void {
  const previousSuccess = window._googleAuthSuccess;
  const previousFailure = window._googleAuthFailure;

  const wrapped = (response: { credential?: string }) => {
    if (response?.credential) {
      onCredential(response.credential);
      return;
    }
    previousSuccess?.(response);
  };

  window._googleAuthSuccess = wrapped;
  window._googleAuthFailure = wrapped;

  return () => {
    window._googleAuthSuccess = previousSuccess;
    window._googleAuthFailure = previousFailure;
  };
}

export type MountNativeGoogleSignInOptions = {
  container: HTMLElement;
  onCredential: (credential: string) => void | Promise<void>;
};

function createGoogleSignInButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "google-button";
  button.innerHTML = `
    <span class="google-button__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.5c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.6-5 3.6-8.2z"/>
        <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.7l-3.7-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8H1.3v2.9C3.2 21.1 7.3 24 12 24z"/>
        <path fill="#FBBC05" d="M5.6 14.6c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V7.1H1.3C.5 8.7 0 10.3 0 12s.5 3.3 1.3 4.9l4.3-3.3z"/>
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.3 0 3.2 2.9 1.3 7.1l4.3 3.3C6.5 7.8 9 5.8 12 5.8z"/>
      </svg>
    </span>
    <span class="google-button__label">Sign in with Google</span>
  `;
  return button;
}

/**
 * Styled Google button that delegates OAuth to SEQTA's native GSI control.
 * SEQTA already loads and initializes Google Sign-In; we only trigger it.
 */
export async function mountNativeGoogleSignIn({
  container,
  onCredential,
}: MountNativeGoogleSignInOptions): Promise<() => void> {
  container.replaceChildren();

  const button = createGoogleSignInButton();
  button.disabled = true;
  container.appendChild(button);

  const unwrapCallback = wrapGoogleAuthCallback((credential) => {
    void onCredential(credential);
  });

  const nativeButton = await waitForNativeGoogleButton();
  if (!nativeButton) {
    button.remove();
    unwrapCallback();
    return unwrapCallback;
  }

  button.disabled = false;
  button.addEventListener("click", () => {
    nativeButton.click();
  });

  return () => {
    button.remove();
    unwrapCallback();
  };
}
