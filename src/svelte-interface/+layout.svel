<script lang="ts">
  // @ts-expect-error - svelte-hash-router is not typed
  import Router from 'svelte-hash-router'
  import browser from 'webextension-polyfill';

  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.innerHTML = `
  @font-face {
    font-family: 'IconFamily';
    src: url('${browser.runtime.getURL('resources/fonts/IconFamily.woff')}') format('woff'),
         url('${browser.runtime.getURL('resources/fonts/IconFamily.woff2')}') format('woff2');
    font-weight: normal;
    font-style: normal;
  }`;
  document.head.appendChild(style);
</script>

<Router />
