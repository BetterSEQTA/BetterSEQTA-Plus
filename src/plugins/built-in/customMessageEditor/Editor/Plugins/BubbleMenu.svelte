<script lang="ts">
  import { Icon, Bold, Italic, Strikethrough, CodeBracket, ChevronDown } from 'svelte-hero-icons';
  import { M } from 'motion-start';
  import type { Editor } from '@tiptap/core';

  let { editor = $bindable() } = $props<{ editor: Editor | null }>();

  // Turn into dropdown state
  let showTurnInto = $state(false);
  
  // Turn into options
  const turnIntoOptions = [
    { id: 'paragraph', label: 'Text', icon: 'T', iconClass: 'font-mono' },
    { id: 'heading1', label: 'Heading 1', icon: 'H1', iconClass: 'font-bold' },
    { id: 'heading2', label: 'Heading 2', icon: 'H2', iconClass: 'font-bold' },
    { id: 'heading3', label: 'Heading 3', icon: 'H3', iconClass: 'font-bold' },
    { id: 'separator' },
    { id: 'bulletList', label: 'Bulleted list', icon: '•' },
    { id: 'orderedList', label: 'Numbered list', icon: '1.' },
    { id: 'taskList', label: 'To-do list', icon: '☐' },
    { id: 'separator' },
    { id: 'codeBlock', label: 'Code', icon: '</>' },
    { id: 'blockquote', label: 'Quote', icon: '"' }
  ];

  function getCurrentBlockType(): string {
    if (!editor) return 'Text';
    
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    if (editor.isActive('bulletList')) return 'Bulleted list';
    if (editor.isActive('orderedList')) return 'Numbered list';
    if (editor.isActive('taskList')) return 'To-do list';
    if (editor.isActive('codeBlock')) return 'Code';
    if (editor.isActive('blockquote')) return 'Quote';
    
    return 'Text';
  }
  
  function turnInto(type: string) {
    if (!editor) return;
    
    switch (type) {
      case 'paragraph':
        editor.chain().focus().setParagraph().run();
        break;
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'taskList':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
    }
    showTurnInto = false;
  }
  
  function handleKeydown(event: KeyboardEvent) {
    // Close modals/dropdowns on Escape
    if (event.key === 'Escape') {
      if (showTurnInto) {
        showTurnInto = false;
        event.preventDefault();
      }
    }
  }
  
  function handleClick(event: MouseEvent) {
    // Close turn into dropdown if clicking outside
    if (showTurnInto && !(event.target as Element).closest('.turn-into-dropdown')) {
      showTurnInto = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleClick} />

<!-- Main Bubble Menu -->
<M.div 
  class="flex gap-1 items-center p-1 rounded-lg border shadow-xl backdrop-blur-lg menu dark:bg-zinc-900/90 bg-white/90 dark:border-zinc-700/30 border-zinc-200/50"
  layout
  transition={{ duration: 0.3, ease: "easeInOut" }}
>
  {#if editor}
    <M.div 
      class="flex gap-1 items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <!-- Turn Into Dropdown -->
      <div class="relative turn-into-dropdown">
        <M.button
          onclick={() => showTurnInto = !showTurnInto}
          class="flex gap-1 items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Turn into"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {getCurrentBlockType()}
          <M.div
            animate={{ rotate: showTurnInto ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon src={ChevronDown} size="14" />
          </M.div>
        </M.button>
        
        {#if showTurnInto}
          <M.div 
            class="absolute left-0 top-full z-50 mt-1 w-48 bg-white rounded-lg border shadow-xl dark:bg-zinc-800 border-zinc-200/40 dark:border-zinc-700/40"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {#each turnIntoOptions as option}
              {#if option.id === 'separator'}
                <div class="my-1 h-px bg-zinc-200/60 dark:bg-zinc-600/60"></div>
              {:else}
                <button 
                  onclick={() => turnInto(option.id)} 
                  class="flex gap-2 items-center px-3 py-2 w-full text-sm text-left transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-700/40"
                >
                  <span class="{option.iconClass || ''}">{option.icon}</span> 
                  {option.label}
                </button>
              {/if}
            {/each}
          </M.div>
        {/if}
      </div>
      
      <div class="mx-1 w-px h-6 bg-zinc-300 dark:bg-zinc-600"></div>
      
      <M.button
        onclick={() => editor.chain().focus().toggleBold().run()}
        class="p-2 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700' : '' }"
        title="Bold"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Icon src={Bold} size="16" />
      </M.button>
      
      <M.button
        onclick={() => editor.chain().focus().toggleItalic().run()}
        class="p-2 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700' : '' }"
        title="Italic"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Icon src={Italic} size="16" />
      </M.button>
      
      <M.button
        onclick={() => editor.chain().focus().toggleStrike().run()}
        class="p-2 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {editor.isActive('strike') ? 'bg-zinc-200 dark:bg-zinc-700' : '' }"
        title="Strikethrough"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Icon src={Strikethrough} size="16" />
      </M.button>
      
      <M.button
        onclick={() => editor.chain().focus().toggleCode().run()}
        class="p-2 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 {editor.isActive('code') ? 'bg-zinc-200 dark:bg-zinc-700' : '' }"
        title="Code"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Icon src={CodeBracket} size="16" />
      </M.button>
    </M.div>
  {/if}
</M.div> 