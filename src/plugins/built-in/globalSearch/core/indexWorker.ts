self.addEventListener('message', (e: Event) => {
  console.log(e);
});

self.postMessage({ type: 'ready' });