export interface ParsedHotkey {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

export function parseHotkey(hotkeyString: string): ParsedHotkey {
  const parts = hotkeyString.toLowerCase().split('+').map(part => part.trim()).filter(part => part.length > 0);
  
  const parsed: ParsedHotkey = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: ''
  };

  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        parsed.ctrl = true;
        break;
      case 'cmd':
      case 'meta':
      case 'command':
        parsed.meta = true;
        break;
      case 'alt':
      case 'option':
        parsed.alt = true;
        break;
      case 'shift':
        parsed.shift = true;
        break;
      default:
        // This should be the key - take the last non-modifier as the key
        if (part.length > 0) {
          parsed.key = part;
        }
        break;
    }
  }

  return parsed;
}

export function formatHotkeyForDisplay(hotkeyString: string): string {
  try {
    const parsed = parseHotkey(hotkeyString);
    const parts: string[] = [];
    
    // Detect platform
    const isMac = (navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    
    if (parsed.ctrl) {
      parts.push('Ctrl');
    }
    if (parsed.meta) {
      parts.push('⌘');
    }
    if (parsed.alt) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (parsed.shift) {
      parts.push(isMac ? '⇧' : 'Shift');
    }
    
    if (parsed.key) {
      parts.push(parsed.key.toUpperCase());
    }
    
    return parts.join(isMac ? ' ' : '+');
  } catch (error) {
    console.warn('Invalid hotkey string:', hotkeyString);
    return hotkeyString; // Fallback to original string
  }
}

export function matchesHotkey(event: KeyboardEvent, hotkeyString: string): boolean {
  try {
    const parsed = parseHotkey(hotkeyString);
    
    // If no key is specified, don't match anything
    if (!parsed.key) {
      return false;
    }
    
    // Check modifiers
    if (parsed.ctrl && !event.ctrlKey) return false;
    if (parsed.meta && !event.metaKey) return false;
    if (parsed.alt && !event.altKey) return false;
    if (parsed.shift && !event.shiftKey) return false;
    
    // Check if we have extra modifiers that shouldn't be there
    if (!parsed.ctrl && event.ctrlKey) return false;
    if (!parsed.meta && event.metaKey) return false;
    if (!parsed.alt && event.altKey) return false;
    if (!parsed.shift && event.shiftKey) return false;
    
    // Check the key
    return event.key.toLowerCase() === parsed.key.toLowerCase();
  } catch (error) {
    console.warn('Error matching hotkey:', hotkeyString, error);
    return false;
  }
}

export function isValidHotkey(hotkeyString: string): boolean {
  try {
    const parsed = parseHotkey(hotkeyString);
    return parsed.key.length > 0;
  } catch (error) {
    return false;
  }
} 