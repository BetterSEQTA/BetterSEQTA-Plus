const MENU_UPDATE_COLOURS = "menu.update.colours";
const SUBJECT_PREFIX = "timetable.subject.colour.";
const TUTOR_PREFIX = "timetable.tutor.";
const CLEANUP_FOLLOWUP_MS = 300;
let cleanupFollowup = null;

function isTesStyling() {
  return document.getElementById("logo-style")?.textContent.includes("tesSeqta") ?? false;
}

function dismissStaleDialogs(forceColour) {
  for (const pane of document.querySelectorAll(".uiSlidePane")) {
    if (pane.querySelector(".pane.colourChooser")) {
      pane.remove();
      continue;
    }
    if (!forceColour && pane.classList.contains("shown")) continue;
    if (!pane.classList.contains("shown")) pane.remove();
  }

  for (const container of document.querySelectorAll(".modaliser-container")) {
    const modal = container.querySelector(".modaliser");
    if (!modal?.childElementCount || !container.classList.contains("visible")) {
      container.remove();
    }
  }

  document.body.classList.remove("clr-open");
  document.documentElement.classList.remove("clr-open");
}

function scheduleCleanup() {
  dismissStaleDialogs(true);
  clearTimeout(cleanupFollowup);
  cleanupFollowup = setTimeout(() => {
    cleanupFollowup = null;
    dismissStaleDialogs(true);
  }, CLEANUP_FOLLOWUP_MS);
}

function applyMenuColours() {
  if (!window.user) return;
  const fallback = isTesStyling() ? "#2b3547" : "#dddddd";
  for (const item of document.querySelectorAll("#menu li[data-colour]")) {
    const prefName = item.getAttribute("data-colour");
    if (!prefName) continue;
    const pref = window.user.getPreference(prefName);
    item.style.setProperty("--item-colour", pref?.value || fallback);
  }
}

function reconcileQuickbars() {
  let fixed = 0;
  for (const quickbar of document.querySelectorAll(".timetablepage .quickbar.visible")) {
    if (!quickbar.querySelector(".wrapper")?.childElementCount) {
      quickbar.classList.remove("visible");
      fixed++;
    }
  }
  if (fixed) {
    try {
      window.msg.send("calendar.quickbar.hide");
    } catch {}
  }
}

function findEntry(calendarId, code) {
  if (calendarId) {
    const byId = document.querySelector(
      `.timetablepage .entry[data-calendarid="${CSS.escape(calendarId)}"]`,
    );
    if (byId) return byId;
  }
  if (!code) return null;
  for (const entry of document.querySelectorAll(".timetablepage .entry.class")) {
    const title = entry.querySelector(".title")?.textContent?.trim() ?? "";
    if (title.includes(code)) return entry;
  }
  return null;
}

function normalizeQuickbarContext(contents) {
  if (!contents) return contents;

  reconcileQuickbars();

  const { element } = contents;
  if (!element?.isConnected) {
    const calendarId = element?.getAttribute?.("data-calendarid") || contents.data?.calendarid;
    const replacement = findEntry(calendarId, contents.data?.code);
    if (replacement) contents.element = replacement;
  }

  return contents;
}

function isColourPref(handle) {
  return (
    typeof handle === "string" &&
    (handle.startsWith(SUBJECT_PREFIX) || handle.startsWith(TUTOR_PREFIX))
  );
}

function onMenuColourUpdate() {
  try {
    applyMenuColours();
  } catch (err) {
    console.error("[BetterSEQTA+] menu.update.colours failed:", err);
  }
  scheduleCleanup();
  reconcileQuickbars();
}

function neutralizeBrokenListeners(msg) {
  for (const listener of msg.listeners?.[MENU_UPDATE_COLOURS] ?? []) {
    if (listener) listener.fn = onMenuColourUpdate;
  }
}

function patchMsg(msg) {
  if (!msg || msg.__bsplusPatched) return;

  const send = msg.send.bind(msg);
  const register = msg.register.bind(msg);

  msg.send = (handle, contents, suppressLogs, noRecord) => {
    if (handle === MENU_UPDATE_COLOURS) {
      onMenuColourUpdate();
      return;
    }
    if (isColourPref(handle)) {
      const result = send(handle, contents, suppressLogs, noRecord);
      scheduleCleanup();
      reconcileQuickbars();
      return result;
    }
    if (handle === "calendar.quickbar.class") {
      return send(handle, normalizeQuickbarContext(contents), suppressLogs, noRecord);
    }
    return send(handle, contents, suppressLogs, noRecord);
  };

  msg.register = (handle, callback, clear, ignoreHistory) =>
    register(
      handle,
      handle === MENU_UPDATE_COLOURS ? onMenuColourUpdate : callback,
      clear,
      ignoreHistory,
    );

  neutralizeBrokenListeners(msg);
  msg.__bsplusPatched = true;
}

function tryPatch() {
  if (window.__bsplusMenuColoursPatched) return true;
  if (!window.msg?.send) return false;
  patchMsg(window.msg);
  window.__bsplusMenuColoursPatched = true;
  return true;
}

if (!tryPatch()) {
  let interval = 25;
  let waited = 0;
  const poll = () => {
    if (tryPatch() || (waited += interval) >= 120000) return;
    if (window.msg) neutralizeBrokenListeners(window.msg);
    interval = Math.min(interval * 2, 2000);
    setTimeout(poll, interval);
  };
  poll();
}
