<script lang="ts">
  import Placeholder from '@tiptap/extension-placeholder';
  import Commands from './Plugins/Commands/command';
  import { Dropcursor } from '@tiptap/extension-dropcursor';
  import Image from '@tiptap/extension-image'
  import BubbleMenu from '@tiptap/extension-bubble-menu';
  import Typography from '@tiptap/extension-typography';
  import TaskList from '@tiptap/extension-task-list';
  import TaskItem from '@tiptap/extension-task-item';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';

  import { Editor } from '@tiptap/core';

  import CommandList from './Plugins/Commands/CommandList.svelte';
  import suggestion from './Plugins/Commands/suggestion';
  import { slashVisible } from './Plugins/Commands/stores';
  import { get } from 'svelte/store';
  
  import BubbleMenuComponent from './Plugins/BubbleMenu.svelte';

  import { onMount, onDestroy } from 'svelte';
  import EditorStyles from './EditorOverrideStyles.css?raw';

  // Make htmlContent bindable from parent components
  let { content = $bindable(''), initialContent = '' } = $props<{ content: string; initialContent?: string }>();

  let commandListInstance = $state<any>(null);

  let element = $state<HTMLElement | null>(null);
  let editor = $state<Editor | null>(null);

  onMount(() => {
    editor = new Editor({
      element: element!,
      content: initialContent || '',
      editorProps: {
        attributes: {
          class: 'focus:outline-none px-3 md:px-0',
        },
        handleKeyDown: (_, event) => {
          // Handle keyboard events when slash menu is visible
          if (get(slashVisible) && commandListInstance) {
            if (event.key === 'Enter' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              const handled = commandListInstance.handleKeydown(event, editor);
              if (handled) {
                return true; // Prevent TipTap from handling this event
              }
            }
          }
          return false; // Let TipTap handle other events
        },
      },
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: ({ node }: { node: any }) => {
            if (node.type.name === 'heading') {
              return 'Heading';
            } else if (node.type.name === 'paragraph') {
              return "Type '/' for commands";
            }

            return 'Type something...';
          },
        }),
        TaskList,
        TaskItem,
        Link,
        Typography,
        Commands.configure({
          suggestion,
        }),
        BubbleMenu.configure({
          element: document.querySelector('.menu') as HTMLElement,
        }),
        Dropcursor.configure({ width: 5, color: '#ddeeff' }),
        Image.configure({
          allowBase64: true,
        }),
      ],
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor;
      },
      onUpdate: ({ editor }: { editor: Editor }) => {
        // Update the htmlContent with the editor's HTML plus CSS
        const editorHTML = editor.getHTML();
        content = `<div class="editor-prose">${editorHTML}<${''}style>${EditorStyles}</${''}style></div>`;
      },
    });
  });

  onMount(() => {
    if (initialContent) {
      content = initialContent;
    }
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  function handleKeydownCapture(event: KeyboardEvent) {
    if (commandListInstance && editor && get(slashVisible)) {
      if (event.key === 'Escape') {
        if (commandListInstance.handleKeydown(event, editor)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  }

  function handleClick(event: MouseEvent) {
    if (!editor) return;
    
    // Check if the click happened in empty space below content
    const editorElement = element;
    if (!editorElement) return;
    
    const clickY = event.clientY;
    
    // Get the last node in the editor
    const lastNode = editorElement.lastElementChild;
    if (lastNode) {
      const lastNodeRect = lastNode.getBoundingClientRect();
      
      // If click is below the last content node, move cursor to end
      if (clickY > lastNodeRect.bottom) {
        const docSize = editor.state.doc.content.size;
        editor.commands.setTextSelection(docSize);
        editor.commands.focus();
        event.preventDefault();
      }
    }
  }
</script>

<div class="relative h-full">
  <div
    class="w-full min-h-full editor-prose"
    bind:this={element}
    onkeydown={handleKeydownCapture}
    onclick={handleClick}
    role="textbox"
    tabindex="-1">
  </div>
  <CommandList bind:this={commandListInstance} />
</div>

<BubbleMenuComponent bind:editor />