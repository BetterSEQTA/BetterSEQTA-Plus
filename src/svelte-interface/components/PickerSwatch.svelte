<!-- <script lang="ts">
  import { onMount } from 'svelte';
  import iro from '@jaames/iro';

  type GradientStop = { color: string; position: number };

  let ColorPicker: iro.ColorPicker;
  let gradientStops: GradientStop[] = [
    { color: '#ff0000', position: 0 },
    { color: '#00ff00', position: 0.5 },
    { color: '#0000ff', position: 1 },
  ];
  let currentStop = 0;
  let draggingStop = -1;
  let initialDragPosition = 0;

  onMount(() => {
    ColorPicker = new (iro.ColorPicker as any)('#picker', {
      width: 320,
      color: gradientStops[0].color,
      layout: [
        {
          component: iro.ui.Box,
        },
        {
          component: iro.ui.Slider,
          options: {
            id: 'hue-slider',
            sliderType: 'hue',
          },
        },
        {
          component: iro.ui.Slider,
          options: {
            id: 'alpha-slider',
            sliderType: 'alpha',
          },
        },
      ],
    });

    ColorPicker.on('color:change', () => {
      gradientStops[currentStop].color = ColorPicker.color.rgbaString;
    });

    console.log(ColorPicker.color.rgba);
  });

  function handleDragStart(event: PointerEvent, index: number) {
    if (draggingStop !== -1) {
      // Prevent starting a new drag if one is already in progress.
      event.preventDefault(); // This stops the pointerdown event from taking any effect.
      return;
    }

    draggingStop = index; // Mark this stop as being dragged.
    initialDragPosition = event.clientX;
  }

  function handleDragMove(event: PointerEvent) {
    if (draggingStop === -1) return;

    const container = event.currentTarget as HTMLDivElement;
    const stopWidth = container.offsetWidth;
    const containerOffset = container.getBoundingClientRect().left;
    const relativePosition = (event.clientX - containerOffset) / stopWidth;

    const sortedStops = [...gradientStops];
    sortedStops.sort((a, b) => a.position - b.position);

    const prevStopIndex = sortedStops.findIndex(
      (stop, index) => index < draggingStop && stop.position < relativePosition
    );
    const nextStopIndex = sortedStops.findIndex(
      (stop, index) => index > draggingStop && stop.position > relativePosition
    );

    const prevStop = prevStopIndex >= 0 ? sortedStops[prevStopIndex] : { position: 0 };
    const nextStop = nextStopIndex >= 0 ? sortedStops[nextStopIndex] : { position: 1 };

    const clampedPosition = Math.max(prevStop.position, Math.min(nextStop.position, relativePosition));

    const newGradientStops = gradientStops.slice();
    newGradientStops.sort((a, b) => a.position - b.position);

    const draggedStop = newGradientStops[draggingStop];
    newGradientStops.splice(draggingStop, 1);

    const insertIndex = newGradientStops.findIndex(stop => stop.position >= clampedPosition);
    newGradientStops.splice(insertIndex, 0, { ...draggedStop, position: clampedPosition });

    gradientStops = newGradientStops;
  }

  function handleDragEnd() {
    draggingStop = -1;
  }
</script>

<div
  class="w-16 h-8 rounded-md swatch"
  style="background: linear-gradient(to right, {gradientStops
    .map(({ color, position }) => `${color} ${position * 100}%`)
    .join(', ')});"
></div>
<div class="fixed top-0 left-0 z-20 flex flex-col w-48 h-32 gap-8">
  <div id="picker"></div>

  <div
    class="w-[320px] h-4 relative"
    style={`background: linear-gradient(to right, ${gradientStops
      .map(({ color, position }) => `${color} ${position * 100}%`)
      .join(', ')});`}
    on:pointermove={handleDragMove}
    on:pointerup={handleDragEnd}
  >
    <span class="opacity-0">This makes the gradient show up</span>
    {#each gradientStops as { position }, index}
      <button
        class="absolute w-4 h-4 bg-white rounded-md top-1/2"
        style={`left: ${position * 100}%; transform: translate(-50%, -50%);`}
        on:click={() => (currentStop = index)}
        on:pointerdown={(event) => handleDragStart(event, index)}
      ></button>
    {/each}
  </div>
</div> -->

<script></script>