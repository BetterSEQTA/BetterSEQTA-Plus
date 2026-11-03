import { choosePause, pauseMessage } from "@/seqta/utils/remoteStatus";

// SEQTA's page styles aren't patched while paused, so the bar carries its own inline styles.
const BUTTON_STYLE =
  "border:0;border-radius:8px;padding:6px 12px;font:inherit;font-weight:600;cursor:pointer;";

export function showPauseNotice(): void {
  const bar = document.createElement("div");
  bar.setAttribute("role", "status");
  bar.style.cssText =
    "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:12px;max-width:min(560px,calc(100vw - 32px));padding:12px 16px;border-radius:12px;background:#1f1f1f;color:#fff;font:14px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);";

  const text = document.createElement("span");
  text.textContent = pauseMessage();

  const runAnyway = document.createElement("button");
  runAnyway.textContent = "Run Anyway";
  runAnyway.style.cssText = `${BUTTON_STYLE}background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4);`;
  runAnyway.onclick = async () => {
    await choosePause(true);
    location.reload();
  };

  const ok = document.createElement("button");
  ok.textContent = "OK";
  ok.style.cssText = `${BUTTON_STYLE}background:#fff;color:#111;`;
  ok.onclick = async () => {
    await choosePause(false);
    bar.remove();
  };

  bar.append(text, runAnyway, ok);
  document.body.append(bar);
}
