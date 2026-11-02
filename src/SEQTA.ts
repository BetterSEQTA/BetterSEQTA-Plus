// This content script runs on every website, so it only checks whether the page
// is SEQTA and loads the rest of the extension on demand. Importing seqta/boot
// statically here made every site download and parse the whole bundle.

let hasSEQTAText = false;
let isSeqtaPage = false;

// This check is placed outside of the document load event due to issues with EP (https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues/84)
if (document.childNodes[1]) {
  hasSEQTAText =
    document.childNodes[1].textContent?.includes(
      "Copyright (c) SEQTA Software",
    ) ?? false;
  isSeqtaPage =
    hasSEQTAText &&
    (document.title.includes("SEQTA Learn") ||
      document.title.includes("SEQTA Engage"));
}

if (hasSEQTAText) {
  void import("@/seqta/boot").then(({ boot }) => boot(isSeqtaPage));
}

// Standalone 404 documents never pass the SEQTA SPA gate above.
if (!isSeqtaPage) {
  void import("@/seqta/bootErrorPage").then(({ bootErrorPage }) =>
    bootErrorPage(),
  );
}
