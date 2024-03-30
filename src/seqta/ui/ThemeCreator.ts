import browser from "webextension-polyfill";
import popup from '../../interface/index.html?url'

/**
 * Open the Theme Creator sidebar, it is an embedded page loaded similar to the extension popup
 */
export function OpenThemeCreator() {
    const container = document.querySelector('#container')
    const themeCreatorIframe: HTMLIFrameElement = document.createElement('iframe')
    themeCreatorIframe.src = `${browser.runtime.getURL(popup)}#themeCreator`
    themeCreatorIframe.id = 'themeCreatorIframe'
    themeCreatorIframe.setAttribute('allowTransparency', 'true')
    themeCreatorIframe.setAttribute('excludeDarkCheck', 'true')
    themeCreatorIframe.style.border = 'none'
    container!.appendChild(themeCreatorIframe)
}