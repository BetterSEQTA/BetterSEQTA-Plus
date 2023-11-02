const downloadTheme = (themeName: string, themeURL: string) => {
  // send message to the background script
  chrome.runtime.sendMessage({
    type: 'currentTab',
    info: 'SetTheme',
    body: {
      themeName: themeName,
      themeURL: themeURL
    }
  });
}


export default function ThemeSelector() {
  return (
  <button onClick={() => downloadTheme('Dark', 'https://raw.githubusercontent.com/SethBurkart123/BetterSEQTA-Themes/main/themes/test.json')}>Dark</button>
  )
}