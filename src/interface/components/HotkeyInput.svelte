<script lang="ts">
  import { isValidHotkey, parseHotkey } from '@/plugins/built-in/globalSearch/src/utils/hotkeyUtils';

  let { value, onChange } = $props<{ 
    value: string, 
    onChange: (newValue: string) => void 
  }>();

  let isRecording = $state(false);
  let recordedKeys = $state<Set<string>>(new Set());
  let inputElement = $state<HTMLInputElement>();

  const formatKeyForHotkey = (key: string): string => {
    // Map special keys to their hotkey format
    const keyMap: Record<string, string> = {
      'Control': 'ctrl',
      'Meta': 'cmd',
      'Alt': 'alt',
      'Shift': 'shift',
      ' ': 'space',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'Escape': 'esc',
      'Enter': 'enter',
      'Tab': 'tab',
      'Backspace': 'backspace',
      'Delete': 'delete',
    };

    return keyMap[key] || key.toLowerCase();
  };

  const formatKeyForDisplay = (key: string): string => {
    // Map keys to their display format
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const keyMap: Record<string, string> = {
      'ctrl': isMac ? '⌃' : 'Ctrl',
      'cmd': '⌘',
      'meta': '⌘',
      'alt': isMac ? '⌥' : 'Alt',
      'shift': isMac ? '⇧' : 'Shift',
      'space': 'Space',
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→',
      'esc': 'Esc',
      'enter': 'Enter',
      'tab': 'Tab',
      'backspace': 'Backspace',
      'delete': 'Delete',
    };

    return keyMap[key.toLowerCase()] || key.toUpperCase();
  };

  const getHotkeyParts = (hotkeyString: string): string[] => {
    if (!hotkeyString || !isValidHotkey(hotkeyString)) {
      return [];
    }

    const parsed = parseHotkey(hotkeyString);
    const parts: string[] = [];
    
    // Add modifiers in a consistent order
    if (parsed.ctrl) parts.push('ctrl');
    if (parsed.meta) parts.push('cmd');
    if (parsed.alt) parts.push('alt');
    if (parsed.shift) parts.push('shift');
    
    // Add the main key
    if (parsed.key) parts.push(parsed.key);
    
    return parts;
  };

  const startRecording = () => {
    isRecording = true;
    recordedKeys.clear();
    inputElement?.focus();
  };

  const stopRecording = () => {
    if (recordedKeys.size > 0) {
      if (recordedKeys.has('esc')) {
        onChange('');
        isRecording = false;
        recordedKeys.clear();
        inputElement?.blur();
        return;
      }

      // Build the hotkey string
      const modifiers: string[] = [];
      let mainKey = '';

      for (const key of recordedKeys) {
        if (['ctrl', 'cmd', 'alt', 'shift'].includes(key)) {
          modifiers.push(key);
        } else {
          mainKey = key;
        }
      }

      if (mainKey) {
        const hotkeyString = [...modifiers, mainKey].join('+');
        if (isValidHotkey(hotkeyString)) {
          onChange(hotkeyString);
        }
      }
    }
    
    isRecording = false;
    recordedKeys.clear();
    inputElement?.blur();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isRecording) return;
    
    e.preventDefault();
    e.stopPropagation();

    const key = formatKeyForHotkey(e.key);
    
    // Add modifiers
    if (e.ctrlKey) recordedKeys.add('ctrl');
    if (e.metaKey) recordedKeys.add('cmd');
    if (e.altKey) recordedKeys.add('alt');
    if (e.shiftKey) recordedKeys.add('shift');
    
    // Add the main key (ignore modifier keys themselves)
    if (!['ctrl', 'cmd', 'alt', 'shift'].includes(key)) {
      recordedKeys.add(key);
    }

    // Auto-stop recording if we have a main key
    if (!['ctrl', 'cmd', 'alt', 'shift'].includes(key)) {
      setTimeout(stopRecording, 100);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBlur = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  $effect(() => {
    if (isRecording && inputElement) {
      inputElement.focus();
    }
  });

  // Get the parts to display
  const hotkeyParts = $derived(isRecording 
    ? Array.from(recordedKeys).map(formatKeyForDisplay)
    : getHotkeyParts(value).map(formatKeyForDisplay));
</script>

<div class="flex gap-2 items-center">
  <div class="relative">
    {#if isRecording}
      <!-- Recording state -->
      <div 
        class="flex items-center justify-center px-3 py-1.5 text-sm rounded-md dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30 dark:text-white border cursor-pointer text-nowrap"
        onclick={startRecording}
        onkeydown={startRecording}
        role="button"
        tabindex="0"
      >
        Press keys...
      </div>
    {:else if hotkeyParts.length > 0}
      <!-- Display current hotkey -->
      <div 
        class="flex gap-1 items-center text-sm rounded-md border-none cursor-pointer dark:text-white"
        onclick={startRecording}
        onkeydown={startRecording}
        role="button"
        tabindex="0"
      >
        {#each hotkeyParts as part}
          <div class="size-8 text-sm flex items-center justify-center rounded-md border dark:bg-[#38373D]/50 bg-[#DDDDDD]/50 border-[#DDDDDD]/30 dark:border-[#38373D]/30">
            {part}
          </div>
        {/each}
      </div>
    {:else}
      <!-- Empty state -->
      <div 
        class="flex items-center justify-center px-3 py-2 text-sm rounded-md dark:bg-[#38373D]/50 bg-[#DDDDDD] dark:text-white border-none cursor-pointer text-nowrap"
        onclick={startRecording}
        onkeydown={startRecording}
        role="button"
        tabindex="0"
      >
        <span class="text-gray-500 dark:text-gray-400">Click to set</span>
      </div>
    {/if}

    <!-- Hidden input for focus management -->
    <input
      bind:this={inputElement}
      type="text"
      readonly
      class="absolute inset-0 opacity-0 pointer-events-none"
      onkeydown={handleKeyDown}
      onkeyup={handleKeyUp}
      onblur={handleBlur}
    />
  </div>
</div>

<style>
  input:focus {
    outline: none;
  }
</style> 