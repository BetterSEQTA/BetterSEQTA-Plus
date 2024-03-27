import Browser from "webextension-polyfill";

console.log('hi');

(async () => {
  const result = await Browser.storage.local.get();
  if (result.DarkMode) {
    document.body.classList.add('dark');
  }
})();