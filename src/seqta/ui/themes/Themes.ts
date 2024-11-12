export const imageData: Record<string, { url: string; variableName: string }> = {};

export function applyCustomCSS(customCSS: string) {
  let styleElement = document.getElementById('custom-theme');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'custom-theme';
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = customCSS;
}

export function removeImageFromDocument(variableName: string) {
  document.documentElement.style.removeProperty('--' + variableName);
}