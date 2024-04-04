import { base64toblobURL } from '../../utils/imageConversions';

export const imageData: Record<string, { url: string; variableName: string }> = {};

export const UpdateImageData = (image: { id: string; base64: string }) => {
  const { id, base64 } = image;

  if (imageData[id]) {
    imageData[id].url = base64toblobURL(base64);
    const { variableName } = imageData[id];
    document.documentElement.style.setProperty('--' + variableName, `url(${imageData[id].url})`);
  }
};

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