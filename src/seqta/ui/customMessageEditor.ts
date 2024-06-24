import stringToHTML from "../utils/stringToHTML";
import browser from 'webextension-polyfill';
import styles from "@blocknote/mantine/style.css?raw";

export default async function handleComposeMessage(): Promise<void> {
  console.log('COMPOSE MESSAGE!');

  const container: HTMLElement | null = document.querySelector('.pane .footer .pillbox');
  const firstButton: HTMLButtonElement | null = document.querySelector('.pane .footer .pillbox button.first') as HTMLButtonElement;

  if (container && firstButton) {
    const buttonHTML = /* html */ `
      <button class="button">
        Better Editor
      </button>
    `;
    const button: HTMLElement = stringToHTML(buttonHTML);

    // Append the new button as the second child of options
    firstButton.parentNode?.insertBefore(button.firstChild as Node, firstButton.nextSibling);

    // Add click event listeners to both buttons
    container.addEventListener('click', (event: Event) => handleButtonClick(event, container, firstButton));
  }
}

function handleButtonClick(event: Event, container: HTMLElement, firstButton: HTMLButtonElement): void {
  const target = event.target as HTMLElement;

  if (target && target.classList.contains('button')) {
    const isBetterEditorButton = target.textContent?.trim() === 'Better Editor';

    if (isBetterEditorButton) {
      activateBetterEditor(container, firstButton);
    } else {
      deactivateBetterEditor(container, firstButton);
    }
  }
}

function activateBetterEditor(container: HTMLElement, firstButton: HTMLButtonElement): void {
  firstButton.classList.remove('depressed');
  container.children[1]?.classList.add('depressed');

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

function deactivateBetterEditor(container: HTMLElement, firstButton: HTMLButtonElement): void {
  const ckeInner = document.querySelector('.pane .cke_inner') as HTMLElement;
  const extensionEditor = document.querySelector('.extension-editor') as HTMLIFrameElement;

  if (ckeInner && extensionEditor) {
    ckeInner.style.display = 'block';
    firstButton.classList.add('depressed');
    container.children[1]?.classList.remove('depressed');
    extensionEditor.style.display = 'none';
  }
}

function handleEditorMessage(event: MessageEvent, ckeEditor: HTMLIFrameElement): void {
  if (!event.origin.includes(browser.runtime.id) || event.data.type !== "message-html") return;

  console.log('Message from extension editor', event.data.data);

  if (ckeEditor.contentDocument) {
    ckeEditor.contentDocument.body.innerHTML = event.data.data + `<style>${styles}</style>`;
  }
}
