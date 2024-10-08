import Browser from "webextension-polyfill";

(async () => {
  const result = await Browser.storage.local.get();
  if (result.DarkMode) {
    document.body.classList.add('dark');
  }
})();