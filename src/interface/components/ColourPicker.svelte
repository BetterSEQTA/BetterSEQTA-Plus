<script lang="ts">
  import { onMount } from 'svelte'
  import { animate } from 'motion';
  import { delay } from '@/seqta/utils/delay.ts'
  import { settingsState } from '@/seqta/utils/listeners/SettingsState.ts'
  import iro from '@jaames/iro'

  interface GradientStop {
    color: string;
    offset: number;
    alpha: number;
  }

  const { hidePicker, standalone = false, customOnChange = null, customState = null } = $props<{
    hidePicker?: () => void,
    standalone?: boolean,
    customOnChange?: (color: string) => void,
    customState?: string
  }>();

  let background = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);
  let pickerContainer = $state<HTMLDivElement | null>(null);
  let gradientBarElement = $state<HTMLDivElement | null>(null);
  let colorPicker: iro.ColorPicker | null = null;

  let currentMode = $state('solid');
  let currentColor = $state(getInitialColor());
  let gradientAngle = $state(90);
  let gradientStops = $state<GradientStop[]>(getInitialGradientStops());
  let selectedStopIndex = $state(0);
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartOffset = $state(0);

  function getInitialColor() {
    const color = customState || settingsState.selectedColor || '#007bff';
    if (color.includes('gradient')) {
      const match = color.match(/#[0-9a-fA-F]{6}|rgb\([^)]+\)/);
      return match ? match[0] : '#007bff';
    }
    return color;
  }

  function getInitialGradientStops(): GradientStop[] {
    const color = customState || settingsState.selectedColor || '#007bff';
    if (color.includes('gradient')) {
      const matches = color.match(/(#[0-9a-fA-F]{6}|rgba?\([^)]+\))\s+(\d+)%/g);
      if (matches) {
        return matches.map((match: string) => {
          const [_, color, offset] = match.match(/(#[0-9a-fA-F]{6}|rgba?\([^)]+\))\s+(\d+)/)!;
          const alpha = color.startsWith('rgba') ? 
            parseFloat(color.match(/rgba?\([^)]+,\s*([^)]+)\)/)?.[1] || '1') :
            1;
          return { 
            color: color.startsWith('#') ? color : rgbaToHex(color),
            offset: parseInt(offset),
            alpha
          };
        });
      }
      const angleMatch = color.match(/gradient\((\d+)deg/);
      if (angleMatch) {
        gradientAngle = parseInt(angleMatch[1]);
      }
    }
    return [
      { color: '#007bff', offset: 0, alpha: 1 },
      { color: '#00ff88', offset: 100, alpha: 1 }
    ];
  }

  const updateColor = () => {
    if (!colorPicker) return;
    
    const newColor = currentMode === 'solid' 
      ? colorPicker.color.hexString
      : `linear-gradient(${gradientAngle}deg, ${gradientStops.map(stop => {
          const color = stop.alpha < 1 
            ? hexToRgba(stop.color, stop.alpha)
            : stop.color;
          return `${color} ${stop.offset}%`;
        }).join(', ')})`;
    
    if (customOnChange) {
      customOnChange(newColor);
    } else {
      settingsState.selectedColor = newColor;
    }
  };

  const closePicker = async () => {
    if (standalone) return;
    if (!background || !content) return;

    animate(
      content,
      { scale: [1, 0.4], opacity: [1, 0] },
      {
        type: 'spring',
        stiffness: 400,
        damping: 30
      }
    );

    animate(
      background,
      { opacity: [1, 0] },
      { ease: [0.4, 0, 0.2, 1] }
    );

    await delay(400);
    hidePicker?.();
  }

  onMount(() => {
    if (!pickerContainer) return;

    const picker = new (iro as any).ColorPicker(pickerContainer, {
      width: 250,
      color: currentColor,
      layout: [
        { 
          component: iro.ui.Box,
          options: {}
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'hue'
          }
        },
        {
          component: iro.ui.Slider,
          options: {
            sliderType: 'alpha'
          }
        }
      ]
    });

    colorPicker = picker;
    picker.on('color:change', (color: any) => {
      if (currentMode === 'solid') {
        currentColor = color.hexString;
        updateColor();
      } else {
        gradientStops[selectedStopIndex].color = color.hexString;
        gradientStops[selectedStopIndex].alpha = color.alpha;
        gradientStops = [...gradientStops];
        updateColor();
      }
    });

    if (!standalone) {
      if (!background || !content) return;

      animate(
        background,
        { opacity: [0, 1] },
        { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      );

      animate(
        content,
        { scale: [0.4, 1], opacity: [0, 1] },
        {
          type: 'spring',
          stiffness: 400,
          damping: 30
        }
      );

      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closePicker();
        }
      };

      document.addEventListener('keydown', handleEscapeKey);

      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  });

  function handleBackgroundClick(event: MouseEvent) {
    if (event.target === background) {
      closePicker();
    }
  }

  function switchMode(mode: 'solid' | 'gradient') {
    if (!colorPicker) return;
    
    currentMode = mode;
    if (mode === 'solid') {
      colorPicker.color.hexString = gradientStops[0].color;
    } else {
      selectedStopIndex = 0;
      colorPicker.color.hexString = gradientStops[0].color;
    }
    updateColor();
  }

  function selectGradientStop(index: number) {
    if (!colorPicker) return;
    selectedStopIndex = index;
    colorPicker.color.hexString = gradientStops[index].color;
  }

  function updateGradientAngle(event: Event) {
    gradientAngle = parseInt((event.target as HTMLInputElement).value);
    updateColor();
  }

  function handleMouseDown(event: MouseEvent, index: number) {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartOffset = gradientStops[index].offset;
    selectGradientStop(index);
    
    // Store the gradient bar element reference
    const gradientBar = gradientBarElement;
    if (!gradientBar) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !gradientBar) return;
      
      const previewRect = gradientBar.getBoundingClientRect();
      const delta = e.clientX - dragStartX;
      const percentDelta = (delta / previewRect.width) * 100;
      const newOffset = Math.max(0, Math.min(100, dragStartOffset + percentDelta));

      // Update the current stop's position
      gradientStops[selectedStopIndex].offset = Math.round(newOffset);

      // Check if we need to reorder stops
      const stops = [...gradientStops];
      stops.sort((a, b) => a.offset - b.offset);

      // Find the new index of our stop
      const newIndex = stops.findIndex(stop => stop === gradientStops[selectedStopIndex]);
      
      if (newIndex !== selectedStopIndex) {
        // Update the selected index to match the new position
        selectedStopIndex = newIndex;
      }

      gradientStops = stops;
      updateColor();
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handlePreviewClick(event: MouseEvent) {
    if (isDragging) return;
    
    const previewRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickOffset = ((event.clientX - previewRect.left) / previewRect.width) * 100;
    
    // Find insertion point
    let insertIndex = gradientStops.findIndex(stop => stop.offset > clickOffset);
    if (insertIndex === -1) insertIndex = gradientStops.length;
    
    // Get color at click position
    const prevStop = gradientStops.reduce((prev, curr) => 
      curr.offset <= clickOffset ? curr : prev
    , gradientStops[0]);
    const nextStop = gradientStops.find(stop => stop.offset > clickOffset) || gradientStops[gradientStops.length - 1];
    
    // Interpolate color and alpha
    const t = (clickOffset - prevStop.offset) / (nextStop.offset - prevStop.offset);
    const color = interpolateColor(prevStop.color, nextStop.color, t);
    const alpha = prevStop.alpha + (nextStop.alpha - prevStop.alpha) * t;

    const newStop = {
      color,
      offset: Math.round(clickOffset),
      alpha
    };

    if (gradientStops.length < 5) {
      gradientStops = [
        ...gradientStops.slice(0, insertIndex),
        newStop,
        ...gradientStops.slice(insertIndex)
      ];
      selectGradientStop(insertIndex);
      updateColor();
    }
  }

  function removeGradientStop(index: number) {
    if (gradientStops.length > 2) {
      gradientStops.splice(index, 1);
      selectedStopIndex = index === 0 ? 0 : index - 1;
      updateColor();
    }
  }

  function interpolateColor(color1: string, color2: string, t: number): string {
    // Convert hex to rgb
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    // Interpolate
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    
    // Convert back to hex
    return rgbToHex(r, g, b);
  }

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  function rgbToHex(r: number, g: number, b: number) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function rgbaToHex(rgba: string): string {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    const [_, r, g, b] = match;
    return rgbToHex(parseInt(r), parseInt(g), parseInt(b));
  }

  const gradientPreviewStyle = $derived(`
    background: linear-gradient(${gradientAngle}deg, ${gradientStops.map(stop => 
      `${stop.alpha < 1 ? hexToRgba(stop.color, stop.alpha) : stop.color} ${stop.offset}%`
    ).join(', ')})
  `);
</script>

{#if standalone}
  <div class="h-auto rounded-xl overflow-clip bg-white dark:bg-zinc-800 p-4">
    <div class="flex gap-2 mb-4">
      <button
        class="px-3 py-1 rounded-md text-sm {currentMode === 'solid' ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700'}"
        onclick={() => switchMode('solid')}
      >
        Solid
      </button>
      <button
        class="px-3 py-1 rounded-md text-sm {currentMode === 'gradient' ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700'}"
        onclick={() => switchMode('gradient')}
      >
        Gradient
      </button>
    </div>

    <div bind:this={pickerContainer} class="mb-4"></div>

    {#if currentMode === 'gradient'}
      <div class="space-y-4">
        <!-- Gradient Preview Bar -->
        <div
          bind:this={gradientBarElement}
          class="h-8 rounded-full relative cursor-pointer overflow-hidden shadow-lg mx-4" 
          style="background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
                   background-size: 16px 16px;
                   background-position: 0 0, 0 8px, 8px -8px, -8px 0px;"
          onmousedown={handlePreviewClick}
          role="button"
          aria-label="Gradient preview bar"
          tabindex="0"
        >
          <!-- Gradient Overlay -->
          <div 
            class="absolute inset-0 w-full h-full"
            style={gradientPreviewStyle}
          ></div>
          
          <!-- Gradient Stops -->
          {#each gradientStops as stop, i}
            <button
              class="absolute w-6 h-6 -ml-3 rounded-full"
              style="left: {stop.offset}%; top: 50%; transform: translate(0, -50%); background: transparent; box-shadow: 0 0 0 2px white, 0 0 0 4px rgba(0,0,0,0.1);"
              onmousedown={(e) => handleMouseDown(e, i)}
              onclick={(e) => e.stopPropagation()}
            >
              {#if selectedStopIndex === i}
                <div class="absolute inset-0 m-auto w-1 h-1 rounded-full bg-white"></div>
              {/if}
            </button>
          {/each}
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 flex-1">
            <label for="gradient-angle" class="text-sm font-medium">Angle:</label>
            <input
              id="gradient-angle"
              type="range"
              min="0"
              max="360"
              value={gradientAngle}
              onchange={updateGradientAngle}
              class="flex-1"
            />
            <span class="text-sm font-medium w-12 text-right">{gradientAngle}°</span>
          </div>

          {#if gradientStops.length > 2}
            <button
              onclick={() => removeGradientStop(selectedStopIndex)}
              class="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              title="Remove selected stop"
              aria-label="Remove selected stop"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{:else}
  <!-- Modal version -->
  <div
    bind:this={background}
    class="absolute top-0 left-0 z-50 flex items-center justify-center w-full h-full cursor-pointer bg-black/20"
    onclick={handleBackgroundClick}
    onkeydown={(e) => { e.key === 'Enter' && handleBackgroundClick }}
    role="button"
    aria-label="Close color picker"
    tabindex="0"
  >
    <div
      bind:this={content}
      class="h-auto p-4 bg-white border shadow-lg cursor-auto rounded-xl dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700"
    >
      <!-- Same content as standalone version -->
      <div class="flex gap-2 mb-4">
        <button
          class="px-3 py-1 rounded-md text-sm {currentMode === 'solid' ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700'}"
          onclick={() => switchMode('solid')}
        >
          Solid
        </button>
        <button
          class="px-3 py-1 rounded-md text-sm {currentMode === 'gradient' ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700'}"
          onclick={() => switchMode('gradient')}
        >
          Gradient
        </button>
      </div>

      <div bind:this={pickerContainer} class="mb-4"></div>

      {#if currentMode === 'gradient'}
        <div class="space-y-4">
          <!-- Gradient Preview Bar -->
          <div 
            bind:this={gradientBarElement}
            class="h-8 rounded-full relative cursor-pointer overflow-hidden shadow-lg mx-4" 
            style="background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
                   background-size: 16px 16px;
                   background-position: 0 0, 0 8px, 8px -8px, -8px 0px;"
            onclick={handlePreviewClick}
            role="button"
            aria-label="Gradient preview bar"
            tabindex="0"
          >
            <!-- Gradient Overlay -->
            <div 
              class="absolute inset-0 w-full h-full"
              style={gradientPreviewStyle}
            ></div>
            
            <!-- Gradient Stops -->
            {#each gradientStops as stop, i}
              <button
                class="absolute w-6 h-6 -ml-3 rounded-full transition-all"
                style="left: {stop.offset}%; top: 50%; transform: translate(0, -50%); background: transparent; box-shadow: 0 0 0 2px white, 0 0 0 4px rgba(0,0,0,0.1);"
                onmousedown={(e) => handleMouseDown(e, i)}
                onclick={(e) => e.stopPropagation()}
              >
                {#if selectedStopIndex === i}
                  <div class="absolute inset-0 m-auto w-1 h-1 rounded-full bg-white"></div>
                {/if}
              </button>
            {/each}
          </div>

          <!-- Controls -->
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 flex-1">
              <label class="text-sm font-medium">Angle:</label>
              <input
                type="range"
                min="0"
                max="360"
                value={gradientAngle}
                onchange={updateGradientAngle}
                class="flex-1"
              />
              <span class="text-sm font-medium w-12 text-right">{gradientAngle}°</span>
            </div>

            {#if gradientStops.length > 2}
              <button
                onclick={() => removeGradientStop(selectedStopIndex)}
                class="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                title="Remove selected stop"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                </svg>
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
