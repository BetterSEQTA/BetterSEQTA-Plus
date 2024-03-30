import browser from "webextension-polyfill";

/**
 * Open the Theme Creator sidebar, it is an embedded page loaded similar to the extension popup
 * @returns void
 */
export function OpenThemeCreator() {
    const width = '300px'

    const themeCreatorIframe: HTMLIFrameElement = document.createElement('iframe')
    themeCreatorIframe.src = `${browser.runtime.getURL('src/interface/index.html')}#themeCreator`
    themeCreatorIframe.id = 'themeCreatorIframe'
    themeCreatorIframe.setAttribute('allowTransparency', 'true')
    themeCreatorIframe.setAttribute('excludeDarkCheck', 'true')
    themeCreatorIframe.style.width = width
    themeCreatorIframe.style.border = 'none'
    
    const mainContent = document.querySelector('#container') as HTMLDivElement
    if (mainContent) mainContent.style.width = `calc(100% - ${width})`

    document.body.appendChild(themeCreatorIframe)
}