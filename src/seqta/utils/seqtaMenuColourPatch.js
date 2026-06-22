/**
 * PAGE context only — patches SEQTA menu.update.colours and removes stuck colour-dialog
 * layers (uiSlidePane + modaliser) that block timetable entry clicks after a colour save.
 */
(function () {
  if (window.__bsplusMenuColoursPatched) return;

  var LOG = "[BetterSEQTA+] timetable colour:";
  var MENU_UPDATE_COLOURS = "menu.update.colours";
  var SUBJECT_COLOUR_PREF_PREFIX = "timetable.subject.colour.";
  var TUTOR_COLOUR_PREF_PREFIX = "timetable.tutor.";

  function log(event, detail) {
    if (detail !== undefined) {
      console.info(LOG, event, detail);
    } else {
      console.info(LOG, event);
    }
  }

  function isTesStylingEnabled() {
    var logoStyle = document.getElementById("logo-style");
    return logoStyle && logoStyle.textContent.indexOf("tesSeqta") !== -1;
  }

  function countOverlayState() {
    return {
      slidePanes: document.querySelectorAll(".uiSlidePane").length,
      slidePanesShown: document.querySelectorAll(".uiSlidePane.shown").length,
      colourChoosers: document.querySelectorAll(
        ".uiSlidePane .pane.colourChooser",
      ).length,
      modalisers: document.querySelectorAll(".modaliser-container").length,
      modalisersVisible: document.querySelectorAll(
        ".modaliser-container.visible",
      ).length,
      quickbarsVisible: document.querySelectorAll(
        ".timetablepage .quickbar.visible",
      ).length,
    };
  }

  function applyMenuSubjectColours() {
    if (!window.user) return;
    var defaultColour = isTesStylingEnabled() ? "#2b3547" : "#dddddd";
    var items = document.querySelectorAll("#menu li[data-colour]");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var prefName = item.getAttribute("data-colour");
      if (!prefName) continue;
      var pref = window.user.getPreference(prefName);
      var colour = (pref && pref.value) || defaultColour;
      item.style.setProperty("--item-colour", colour);
    }
  }

  function dismissStaleModaliserContainers() {
    var removed = 0;
    var containers = document.querySelectorAll(".modaliser-container");
    for (var i = 0; i < containers.length; i++) {
      var container = containers[i];
      var modal = container.querySelector(".modaliser");
      var empty = !modal || modal.childElementCount === 0;
      var hidden = !container.classList.contains("visible");
      if (empty || hidden) {
        container.remove();
        removed++;
      }
    }
    return removed;
  }

  function dismissStaleColourSlidePanes(forceColourChooser) {
    var removed = 0;
    var panes = document.querySelectorAll(".uiSlidePane");
    for (var i = 0; i < panes.length; i++) {
      var pane = panes[i];
      var isColourChooser = pane.querySelector(".pane.colourChooser");
      if (isColourChooser) {
        pane.remove();
        removed++;
        continue;
      }
      if (!forceColourChooser && pane.classList.contains("shown")) continue;
      if (!pane.classList.contains("shown")) {
        pane.remove();
        removed++;
      }
    }
    return removed;
  }

  function dismissStaleColourDialogs(forceColourChooser) {
    var slideRemoved = dismissStaleColourSlidePanes(forceColourChooser);
    var modalRemoved = dismissStaleModaliserContainers();
    document.body.classList.remove("clr-open");
    document.documentElement.classList.remove("clr-open");
    return {
      slideRemoved: slideRemoved,
      modalRemoved: modalRemoved,
      overlays: countOverlayState(),
    };
  }

  function reconcileStuckQuickbars(reason) {
    var fixed = 0;
    var quickbars = document.querySelectorAll(".timetablepage .quickbar.visible");
    for (var i = 0; i < quickbars.length; i++) {
      var qb = quickbars[i];
      var wrapper = qb.querySelector(".wrapper");
      if (!wrapper || !wrapper.childElementCount) {
        qb.classList.remove("visible");
        fixed++;
      }
    }
    if (fixed > 0) {
      log("cleared stuck quickbar shell (" + reason + ")", { fixed: fixed });
      try {
        window.msg.send("calendar.quickbar.hide");
      } catch (err) {
        /* ignore */
      }
    }
    return fixed;
  }

  function findEntryElement(calendarId, code) {
    if (calendarId) {
      var byCalendar = document.querySelector(
        ".timetablepage .entry[data-calendarid=\"" + calendarId + "\"]",
      );
      if (byCalendar) return byCalendar;
    }
    if (code) {
      var entries = document.querySelectorAll(".timetablepage .entry.class");
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var titleEl = entry.querySelector(".title");
        var title =
          titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";
        if (title && title.indexOf(code) !== -1) return entry;
      }
    }
    return null;
  }

  function normalizeQuickbarOpenContext(contents) {
    if (!contents) return contents;

    reconcileStuckQuickbars("before-open");

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
      var replacement = findEntryElement(calendarId, code);
      if (replacement) {
        contents.element = replacement;
        log("replaced detached quickbar entry element", {
          calendarId: calendarId,
          code: code,
        });
      } else {
        log("quickbar entry element detached, no replacement found", {
          calendarId: calendarId,
          code: code,
        });
      }
    }

    return contents;
  }

  function logQuickbarOpenResult(phase) {
    var qb = document.querySelector(".timetablepage .quickbar.visible");
    var wrapper = qb && qb.querySelector(".wrapper");
    log("quickbar open result (" + phase + ")", {
      visible: !!qb,
      hasWrapper: !!wrapper,
      wrapperChildren: wrapper ? wrapper.childElementCount : 0,
      overlays: countOverlayState(),
    });
  }

  function scheduleColourDialogCleanup(reason) {
    var delays = [0, 100, 300, 600];
    for (var i = 0; i < delays.length; i++) {
      (function (delay) {
        setTimeout(function () {
          var result = dismissStaleColourDialogs(true);
          if (
            result.slideRemoved > 0 ||
            result.modalRemoved > 0 ||
            delay === 0
          ) {
            log("cleanup (" + reason + ", +" + delay + "ms)", result);
          }
        }, delay);
      })(delays[i]);
    }
  }

  function isSubjectOrTutorColourPref(handle) {
    return (
      typeof handle === "string" &&
      (handle.indexOf(SUBJECT_COLOUR_PREF_PREFIX) === 0 ||
        handle.indexOf(TUTOR_COLOUR_PREF_PREFIX) === 0)
    );
  }

  function runMenuColourUpdate() {
    log("menu.update.colours intercepted", countOverlayState());
    try {
      applyMenuSubjectColours();
    } catch (err) {
      console.error("[BetterSEQTA+] menu.update.colours failed:", err);
    }
    scheduleColourDialogCleanup("menu.update.colours");
    reconcileStuckQuickbars("after-colour-save");
  }

  function fixedMenuColourHandler() {
    runMenuColourUpdate();
  }

  function neutralizeBrokenMenuColourListeners(msg) {
    var listeners = msg.listeners && msg.listeners[MENU_UPDATE_COLOURS];
    if (!listeners) return;
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i]) {
        listeners[i].fn = fixedMenuColourHandler;
      }
    }
  }

  function patchMsg(msg) {
    if (!msg || msg.__bsplusPatched) return;

    var originalSend = msg.send.bind(msg);
    msg.send = function (handle, contents, suppressLogs, noRecord) {
      if (handle === MENU_UPDATE_COLOURS) {
        runMenuColourUpdate();
        return;
      }

      if (isSubjectOrTutorColourPref(handle)) {
        log("colour pref save detected", {
          pref: handle,
          colour: contents,
          overlays: countOverlayState(),
        });
        var prefResult = originalSend(
          handle,
          contents,
          suppressLogs,
          noRecord,
        );
        scheduleColourDialogCleanup("pref:" + handle);
        reconcileStuckQuickbars("after-colour-save");
        return prefResult;
      }

      if (handle === "calendar.quickbar.class") {
        var openContext = normalizeQuickbarOpenContext(contents);
        var label =
          openContext &&
          openContext.data &&
          (openContext.data.description || openContext.data.code);
        log("quickbar open msg.send", {
          subject: label,
          elementConnected:
            openContext &&
            openContext.element &&
            openContext.element.isConnected,
          overlays: countOverlayState(),
        });
        var openResult;
        try {
          openResult = originalSend(
            handle,
            openContext,
            suppressLogs,
            noRecord,
          );
        } catch (err) {
          console.error("[BetterSEQTA+] quickbar open failed:", err);
          throw err;
        }
        setTimeout(function () {
          logQuickbarOpenResult("+50ms");
        }, 50);
        setTimeout(function () {
          logQuickbarOpenResult("+200ms");
        }, 200);
        return openResult;
      }

      if (handle === "calendar.quickbar.hide") {
        log("quickbar hide msg.send", countOverlayState());
        return originalSend(handle, contents, suppressLogs, noRecord);
      }

      return originalSend(handle, contents, suppressLogs, noRecord);
    };

    var originalRegister = msg.register.bind(msg);
    msg.register = function (handle, callback, clear, ignoreHistory) {
      if (handle === MENU_UPDATE_COLOURS) {
        return originalRegister(
          handle,
          fixedMenuColourHandler,
          clear,
          ignoreHistory,
        );
      }
      if (handle === "calendar.quickbar.class") {
        return originalRegister(
          handle,
          function (context) {
            log("quickbar class handler invoked", {
              elementConnected:
                context &&
                context.element &&
                context.element.isConnected,
              subject:
                context &&
                context.data &&
                (context.data.description || context.data.code),
            });
            return callback(context);
          },
          clear,
          ignoreHistory,
        );
      }
      return originalRegister(handle, callback, clear, ignoreHistory);
    };

    neutralizeBrokenMenuColourListeners(msg);
    msg.__bsplusPatched = true;
  }

  function tryPatch() {
    if (window.__bsplusMenuColoursPatched) return true;
    if (!window.msg || !window.msg.send) return false;
    patchMsg(window.msg);
    window.__bsplusMenuColoursPatched = true;
    log("patch active");
    return true;
  }

  document.addEventListener(
    "click",
    function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var entry = target.closest(".timetablepage .entry");
      if (!entry) return;

      var before = countOverlayState();
      var cleanup = dismissStaleColourDialogs(false);
      var calendarId = entry.getAttribute("data-calendarid");
      var instance = entry.getAttribute("data-instance");
      var titleEl = entry.querySelector(".title");
      var title = titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";
      log("entry click (capture)", {
        calendarId: calendarId,
        instance: instance,
        title: title,
        before: before,
        cleanup: cleanup,
      });
    },
    true,
  );

  if (!tryPatch()) {
    var interval = setInterval(function () {
      if (tryPatch()) {
        clearInterval(interval);
      } else if (window.msg) {
        neutralizeBrokenMenuColourListeners(window.msg);
      }
    }, 25);
    setTimeout(function () {
      clearInterval(interval);
    }, 120000);
  }
})();
