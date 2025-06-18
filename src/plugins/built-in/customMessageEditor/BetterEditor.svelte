<script lang="ts">
  import Editor from './Editor/Editor.svelte';
  import EditorStyles from './Editor/EditorStyles.css?raw';
  import EditorOverrideStyles from './Editor/EditorOverrideStyles.css?raw';
  import TiptapStyles from './Editor/TiptapStyles.css?raw';
  import { onMount } from 'svelte';
  import { settingsState } from '@/seqta/utils/listeners/SettingsState';

  interface Props {
    onchange: (value: string) => void;
    initialContent?: string;
    scale?: number; // Scale factor for the editor (1.0 = normal, 1.2 = 120%, etc.)
  }
  
  let { onchange, initialContent = '', scale = 1.3 }: Props = $props();
  
  let content = $state('');
  let betterEditor = $state<HTMLElement | null>(null);

  // Watch for content changes and call the callback
  $effect(() => {
    if (onchange) {
      onchange(content);
    }
  });

  onMount(async () => {
    if (betterEditor) {
      const styles = EditorStyles + EditorOverrideStyles + TiptapStyles;
      
      const scalingCSS = `
        .better-editor {
          --scale-factor: ${scale};
        }
        
        .better-editor .editor-prose {
          transform-origin: top left;
          zoom: ${scale};
          -moz-transform: scale(${scale});
          -moz-transform-origin: 0 0;
        }
        
        /* For Firefox which doesn't support zoom */
        @-moz-document url-prefix() {
          .better-editor .editor-prose {
            transform: scale(${scale});
            width: ${100 / scale}%;
          }
        }
      `;
      
      const styleElement = document.createElement('style');
      styleElement.textContent = styles + scalingCSS;
      betterEditor.appendChild(styleElement);
    }
  });
</script>

<div
  class="h-full better-editor {settingsState.DarkMode ? 'dark' : ''}" 
  bind:this={betterEditor}
  style="font-size: {scale * 16}px; --editor-scale: {scale};"
>
  <Editor bind:content {initialContent} />
</div>