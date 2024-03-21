(function () {
  'use strict';

  const injectTime = performance.now();
  (async () => {
    if ("vendor/crx-client-preamble.js")
      await import(
        /* @vite-ignore */
        chrome.runtime.getURL("vendor/crx-client-preamble.js")
      );
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("vendor/vite-client.js")
    );
    const { onExecute } = await import(
      /* @vite-ignore */
      chrome.runtime.getURL("../src/SEQTA.ts.js")
    );
    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });
  })().catch(console.error);

})();
