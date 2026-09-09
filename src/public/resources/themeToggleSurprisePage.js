/* Maintainer note: page-context YouTube IFrame API for theme toggle easter egg. */
(function () {
  if (window.__bsplusThemeSurprisePage) return;
  window.__bsplusThemeSurprisePage = true;

  var MESSAGE_SOURCE = "betterseqta-theme-surprise";
  var ytPlayer = null;
  var apiReady = false;
  var pendingMountId = null;

  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;
    if (pendingMountId) {
      var mountId = pendingMountId;
      pendingMountId = null;
      openPlayer(mountId);
    }
  };

  if (
    !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
  ) {
    var apiScript = document.createElement("script");
    apiScript.src = "https://www.youtube.com/iframe_api";
    (document.head || document.documentElement).appendChild(apiScript);
  }

  function openPlayer(mountId) {
    if (!apiReady) {
      pendingMountId = mountId;
      return;
    }

    if (ytPlayer) {
      ytPlayer.playVideo();
      ytPlayer.unMute();
      return;
    }

    ytPlayer = new YT.Player(mountId, {
      height: "360",
      width: "640",
      videoId: "dQw4w9WgXcQ",
      playerVars: {
        autoplay: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: function (event) {
          event.target.unMute();
          event.target.playVideo();
        },
        onError: function (event) {
          console.warn(
            "[BetterSEQTA+] Theme toggle surprise YouTube error:",
            event.data,
          );
        },
      },
    });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window || !event.data) return;
    if (event.data.source !== MESSAGE_SOURCE) return;

    if (event.data.type === "open" && event.data.mountId) {
      openPlayer(event.data.mountId);
      return;
    }

    if (event.data.type === "close") {
      try {
        if (ytPlayer && ytPlayer.destroy) {
          ytPlayer.destroy();
        }
      } catch (error) {}
      ytPlayer = null;
      pendingMountId = null;
    }
  });
})();
