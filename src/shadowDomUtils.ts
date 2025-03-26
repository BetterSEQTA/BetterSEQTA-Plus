const sheetsMap = new Map();
export function updateStyle(id: string, content: string) {
  let style = sheetsMap.get(id);
  {
    if (style && !(style instanceof HTMLStyleElement)) {
      removeStyle(id);
      style = undefined;
    }
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.innerHTML = content;
      if (window.location.href.includes('chrome-extension://')) {
        document.head.appendChild(style);
      } else {
        const root = document.getElementById('ExtensionPopup');

        // if no root try again in a second
        if (!root) {
          setTimeout(() => updateStyle(id, content), 1000);
          return;
        }
        const shadowEl = root?.shadowRoot;
        shadowEl?.appendChild(style);
      }
    } else {
      style.innerHTML = content;
    }
  }
  sheetsMap.set(id, style);
}

export function removeStyle(id: string) {
  const style = sheetsMap.get(id);
  if (style) {
    if (window.location.href.includes('chrome-extension://')) {
      if (style instanceof CSSStyleSheet) {
        (document as any).adoptedStyleSheets = (
          document as any
        ).adoptedStyleSheets.filter((s: any) => s !== style);
      } else {
        document.head.removeChild(style);
      }
    } else {
      const root = document.getElementById('ExtensionPopup');
      const shadowEl: any = root?.shadowRoot;
      if (style instanceof CSSStyleSheet) {
        if (shadowEl) {
          shadowEl.adoptedStyleSheets = shadowEl.adoptedStyleSheets.filter(
            (s: any) => s !== style,
          );
        }
      } else if (shadowEl) {
        shadowEl.removeChild(style);
      }
    }
    sheetsMap.delete(id);
  }
}