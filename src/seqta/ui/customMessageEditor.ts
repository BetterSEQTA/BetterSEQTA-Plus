import stringToHTML from "../utils/stringToHTML";
import browser from 'webextension-polyfill';
import styles from "@blocknote/mantine/style.css?raw";

export default async function handleComposeMessage(): Promise<void> {
  console.log('COMPOSE MESSAGE!');

  const container: HTMLElement | null = document.querySelector('.pane .footer .pillbox');
  const simpleEditorButton: HTMLButtonElement | null = document.querySelector('.pane .footer .pillbox button.first') as HTMLButtonElement;

  if (container && simpleEditorButton) {
    const buttonHTML = /* html */ `
      <button class="button" id="betterEditorButton">
        Better Editor
      </button>
    `;
    const button: HTMLElement = stringToHTML(buttonHTML);

    // Check if the button already exists
    if (!container.querySelector('#betterEditorButton')) {
      // Insert the new button after the Simple editor button
      simpleEditorButton.insertAdjacentElement('afterend', button.firstElementChild as HTMLElement);
    }

    // Add click event listeners to the container (event delegation)
    container.addEventListener('click', handleButtonClick);
  }
}

function handleButtonClick(event: MouseEvent): void {
  console.log('handleButtonClick', event);
  const target = event.target as HTMLElement;

  if (target.tagName !== 'BUTTON') return;

  const container = target.closest('.pillbox') as HTMLElement;
  if (!container) return;

  const simpleEditorButton = container.querySelector('button.first') as HTMLButtonElement;
  const betterEditorButton = container.querySelector('#betterEditorButton') as HTMLButtonElement;

  if (!simpleEditorButton || !betterEditorButton) {
    console.error('Could not find Simple Editor or Better Editor buttons');
    return;
  }

  const isBetterEditorButton = target === betterEditorButton;
  const isSimpleEditorButton = target === simpleEditorButton;

  if (isBetterEditorButton) {
    activateBetterEditor(simpleEditorButton, betterEditorButton);
  } else if (isSimpleEditorButton) {
    activateSimpleEditor(simpleEditorButton, betterEditorButton);
  } else {
    deactivateBetterEditor(simpleEditorButton, betterEditorButton);
  }

  container.querySelectorAll('button').forEach(btn => btn.classList.remove('depressed'));
  target.classList.add('depressed');
}

function activateBetterEditor(simpleEditorButton: HTMLButtonElement, betterEditorButton: HTMLButtonElement): void {
  // Programmatically click the Simple Editor button first
  simpleEditorButton.click();

  // Then proceed with Better Editor activation
  simpleEditorButton.classList.remove('depressed');
  betterEditorButton.classList.add('depressed');

  const ckeInner = document.querySelector('.pane .cke_inner') as HTMLElement;
  if (ckeInner) ckeInner.style.display = 'none';

  let extensionEditor: HTMLIFrameElement | null = document.querySelector('.extension-editor') as HTMLIFrameElement;
  if (extensionEditor) {
    extensionEditor.style.display = 'block';
  } else {
    const extensionEditorIframe: HTMLIFrameElement = document.createElement('iframe');
    extensionEditorIframe.src = `${browser.runtime.getURL('src/interface/index.html')}#editor`;
    extensionEditorIframe.setAttribute('allowTransparency', 'true');
    extensionEditorIframe.setAttribute('excludeDarkCheck', 'true');
    extensionEditorIframe.classList.add('extension-editor');
    document.getElementById('cke_editor1')?.appendChild(extensionEditorIframe);
  }

  extensionEditor = document.querySelector('.extension-editor') as HTMLIFrameElement;
  const ckeEditor = document.querySelector('#cke_1_contents iframe.cke_wysiwyg_frame') as HTMLIFrameElement;

  window.addEventListener('message', (event) => handleEditorMessage(event, ckeEditor), { once: true });
}

function activateSimpleEditor(simpleEditorButton: HTMLButtonElement, betterEditorButton: HTMLButtonElement): void {
  simpleEditorButton.classList.add('depressed');
  betterEditorButton.classList.remove('depressed');

  const ckeInner = document.querySelector('.pane .cke_inner') as HTMLElement;
  const extensionEditor = document.querySelector('.extension-editor') as HTMLIFrameElement;

  if (ckeInner) ckeInner.style.removeProperty('display')
  if (extensionEditor) extensionEditor.style.display = 'none'
}

function deactivateBetterEditor(simpleEditorButton: HTMLButtonElement, betterEditorButton: HTMLButtonElement): void {
  const ckeInner = document.querySelector('.pane .cke_inner') as HTMLElement;
  const ckeContents = document.querySelector('.pane .cke_contents') as HTMLElement;
  const extensionEditor = document.querySelector('.extension-editor') as HTMLIFrameElement;

  if (ckeInner) ckeInner.style.removeProperty('display');
  if (ckeContents) ckeContents.style.removeProperty('display');
  if (extensionEditor) extensionEditor.style.removeProperty('display');

  simpleEditorButton.classList.remove('depressed');
  betterEditorButton.classList.remove('depressed');
}

function handleEditorMessage(event: MessageEvent, ckeEditor: HTMLIFrameElement): void {
  if (!event.origin.includes(browser.runtime.id) || event.data.type !== "message-html") return;

  if (ckeEditor.contentDocument) {
    ckeEditor.contentDocument.body.innerHTML = event.data.data + `<style>${styles}</style>`;
  }
}
