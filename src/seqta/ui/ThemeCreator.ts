import browser from "webextension-polyfill";

/**
 * Open the Theme Creator sidebar, it is an embedded page loaded similar to the extension popup
 * @returns void
 */
export function OpenThemeCreator() {
  const width = '310px';

  const themeCreatorIframe: HTMLIFrameElement = document.createElement('iframe');
  themeCreatorIframe.src = `${browser.runtime.getURL('src/interface/index.html')}#themeCreator`;
  themeCreatorIframe.id = 'themeCreatorIframe';
  themeCreatorIframe.setAttribute('allowTransparency', 'true');
  themeCreatorIframe.setAttribute('excludeDarkCheck', 'true');
  themeCreatorIframe.style.border = 'none';
  themeCreatorIframe.style.width = width;

  const mainContent = document.querySelector('#container') as HTMLDivElement;
  if (mainContent) mainContent.style.width = `calc(100% - ${width})`;

  // close button
  const closeButton = document.createElement('button');
  closeButton.classList.add('themeCloseButton');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', CloseThemeCreator);
  document.body.appendChild(closeButton);

  const resizeBar = document.createElement('div');
  resizeBar.classList.add('resizeBar');
  resizeBar.style.right = '307.5px';

  let isDragging = false;
  let currentX: number;

  const mouseDownHandler = (e: MouseEvent) => {
    isDragging = true;
    currentX = e.clientX;
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    document.body.style.userSelect = 'none';
    themeCreatorIframe.style.pointerEvents = 'none'; // Disable pointer events on iframe during resize
  };

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - currentX;
    currentX = e.clientX;
    const newWidth = Math.min(Math.max(310, themeCreatorIframe.offsetWidth - dx), 600);
    themeCreatorIframe.style.width = `${newWidth}px`;
    mainContent.style.width = `calc(100% - ${newWidth}px)`;
    resizeBar.style.right = `${newWidth - 2.5}px`;
  };

  const mouseUpHandler = () => {
    isDragging = false;
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    document.body.style.userSelect = '';
    themeCreatorIframe.style.pointerEvents = 'auto';
  };

  resizeBar.addEventListener('mousedown', mouseDownHandler);
  resizeBar.addEventListener('mouseover', () => resizeBar.style.opacity = '1');
  resizeBar.addEventListener('mouseout', () => resizeBar.style.opacity = '0');

  document.body.appendChild(themeCreatorIframe);
  document.body.appendChild(resizeBar);
}

/**
 * Close the Theme Creator sidebar
 * @returns void
 */
export function CloseThemeCreator() {
  const themeCreatorIframe = document.getElementById('themeCreatorIframe');
  const closeButton = document.querySelector('.themeCloseButton') as HTMLButtonElement;
  const resizeBar = document.querySelector('.resizeBar') as HTMLDivElement;
  
  if (themeCreatorIframe) themeCreatorIframe.remove();
  if (closeButton) closeButton.remove();
  if (resizeBar) resizeBar.remove();

  const mainContent = document.querySelector('#container') as HTMLDivElement;
  if (mainContent) mainContent.style.width = '100%';
}