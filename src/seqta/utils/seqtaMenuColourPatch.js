/**
 * PAGE context — patches broken menu.update.colours and removes stuck colour-dialog layers.
 */
(function () {
  if (window.__bsplusMenuColoursPatched) return;

  var MENU_UPDATE_COLOURS = "menu.update.colours";
  var SUBJECT_PREFIX = "timetable.subject.colour.";
  var TUTOR_PREFIX = "timetable.tutor.";
  var CLEANUP_FOLLOWUP_MS = 300;
  var cleanupFollowup = null;

  function isTesStyling() {
    var el = document.getElementById("logo-style");
    return el && el.textContent.indexOf("tesSeqta") !== -1;
  }

  function dismissStaleDialogs(forceColour) {
    var slide = 0;
    var panes = document.querySelectorAll(".uiSlidePane");
    for (var i = 0; i < panes.length; i++) {
      var p = panes[i];
      if (p.querySelector(".pane.colourChooser")) {
        p.remove();
        slide++;
        continue;
      }
      if (!forceColour && p.classList.contains("shown")) continue;
      if (!p.classList.contains("shown")) {
        p.remove();
        slide++;
      }
    }

    var modal = 0;
    var containers = document.querySelectorAll(".modaliser-container");
    for (var j = 0; j < containers.length; j++) {
      var c = containers[j];
      var m = c.querySelector(".modaliser");
      if (!m || !m.childElementCount || !c.classList.contains("visible")) {
        c.remove();
        modal++;
      }
    }

    document.body.classList.remove("clr-open");
    document.documentElement.classList.remove("clr-open");
    return { slideRemoved: slide, modalRemoved: modal };
  }

  function scheduleCleanup() {
    dismissStaleDialogs(true);
    if (cleanupFollowup) clearTimeout(cleanupFollowup);
    cleanupFollowup = setTimeout(function () {
      cleanupFollowup = null;
      dismissStaleDialogs(true);
    }, CLEANUP_FOLLOWUP_MS);
  }

  function applyMenuColours() {
    if (!window.user) return;
    var def = isTesStyling() ? "#2b3547" : "#dddddd";
    var items = document.querySelectorAll("#menu li[data-colour]");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var prefName = item.getAttribute("data-colour");
      if (!prefName) continue;
      var pref = window.user.getPreference(prefName);
      item.style.setProperty("--item-colour", (pref && pref.value) || def);
    }
  }

  function reconcileQuickbars() {
    var fixed = 0;
    var quickbars = document.querySelectorAll(".timetablepage .quickbar.visible");
    for (var i = 0; i < quickbars.length; i++) {
      var qb = quickbars[i];
      var w = qb.querySelector(".wrapper");
      if (!w || !w.childElementCount) {
        qb.classList.remove("visible");
        fixed++;
      }
    }
    if (fixed) {
      try {
        window.msg.send("calendar.quickbar.hide");
      } catch (err) {
        /* ignore */
      }
    }
    return fixed;
  }

  function findEntry(calendarId, code) {
    if (calendarId) {
      var byId = document.querySelector(
        ".timetablepage .entry[data-calendarid=\"" + calendarId + "\"]",
      );
      if (byId) return byId;
    }
    if (!code) return null;
    var entries = document.querySelectorAll(".timetablepage .entry.class");
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var titleEl = entry.querySelector(".title");
      var title =
        titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";
      if (title && title.indexOf(code) !== -1) return entry;
    }
    return null;
  }

  function normalizeQuickbarContext(contents) {
    if (!contents) return contents;

    reconcileQuickbars();

    var element = contents.element;
    var calendarId =
      (element && element.getAttribute && element.getAttribute("data-calendarid")) ||
      (contents.data && contents.data.calendarid);
    var code = contents.data && contents.data.code;
    var connected =
      element &&
      element.isConnected &&
      typeof document.contains === "function" &&
      document.contains(element);

    if (!connected) {
      var replacement = findEntry(calendarId, code);
      if (replacement) contents.element = replacement;
    }

    return contents;
  }

  function isColourPref(handle) {
    return (
      typeof handle === "string" &&
      (handle.indexOf(SUBJECT_PREFIX) === 0 || handle.indexOf(TUTOR_PREFIX) === 0)
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
    var listeners = msg.listeners && msg.listeners[MENU_UPDATE_COLOURS];
    if (!listeners) return;
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i]) listeners[i].fn = onMenuColourUpdate;
    }
  }

  function patchMsg(msg) {
    if (!msg || msg.__bsplusPatched) return;

    var send = msg.send.bind(msg);
    var register = msg.register.bind(msg);

    msg.send = function (handle, contents, suppressLogs, noRecord) {
      if (handle === MENU_UPDATE_COLOURS) {
        onMenuColourUpdate();
        return;
      }
      if (isColourPref(handle)) {
        var result = send(handle, contents, suppressLogs, noRecord);
        scheduleCleanup();
        reconcileQuickbars();
        return result;
      }
      if (handle === "calendar.quickbar.class") {
        return send(
          handle,
          normalizeQuickbarContext(contents),
          suppressLogs,
          noRecord,
        );
      }
      return send(handle, contents, suppressLogs, noRecord);
    };

    msg.register = function (handle, callback, clear, ignoreHistory) {
      if (handle === MENU_UPDATE_COLOURS) {
        return register(handle, onMenuColourUpdate, clear, ignoreHistory);
      }
      return register(handle, callback, clear, ignoreHistory);
    };

    neutralizeBrokenListeners(msg);
    msg.__bsplusPatched = true;
  }

  function tryPatch() {
    if (window.__bsplusMenuColoursPatched) return true;
    if (!window.msg || !window.msg.send) return false;
    patchMsg(window.msg);
    window.__bsplusMenuColoursPatched = true;
    return true;
  }

  if (!tryPatch()) {
    var interval = setInterval(function () {
      if (tryPatch()) {
        clearInterval(interval);
      } else if (window.msg) {
        neutralizeBrokenListeners(window.msg);
      }
    }, 25);
    setTimeout(function () {
      clearInterval(interval);
    }, 120000);
  }
})();
