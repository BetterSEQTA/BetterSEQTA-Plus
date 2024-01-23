import backgroundPage from 'url:./background/background.html'

export async function appendBackgroundToUI() {
  console.log('Starting appendBackgroundToUI...');

  const parent = document.getElementById('container');

  // embed background.html
  const background = document.createElement('iframe');
  background.id = 'background';
  background.classList.add('imageBackground');
  background.setAttribute('excludeDarkCheck', 'true');
  background.src = backgroundPage;
  parent!.appendChild(background);
}
