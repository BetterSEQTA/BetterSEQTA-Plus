<script lang="ts">
  // Destructure props for slider state, change handler, and optional min, max, and step values
  let { state, onChange, min = 0, max = 100, step = 1 } = $props<{ 
    state: number, 
    onChange: (value: number) => void,
    min?: number,
    max?: number,
    step?: number
  }>();

  // Compute percentage position of the slider thumb for background styling
  let percentage = $derived(((state - min) / (max - min)) * 100);
</script>

<!--
  Container for the custom-styled range input (slider).
  - Constrains width and centers content.
-->
<div class="relative mx-auto w-full max-w-lg">
  <input
    type="range" // Input type for slider
    min={min} // Minimum value
    max={max} // Maximum value
    step={step} // Step interval
    bind:value={state} // Bind slider value to state
    style={`background: linear-gradient(to right, #30d259ad 0%, #30D259 ${percentage}%, #dddddd ${percentage}%)`} // Dynamic track color based on value
    onchange={(e) => onChange(Number(e.currentTarget.value))} // Trigger onChange with new value
    class="w-full h-1 rounded-full appearance-none cursor-pointer slider" // Tailwind styling and custom class
  />
</div>

<style>
  /* Style for WebKit-based browser slider thumbs */
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.3);
    background: white;
    cursor: pointer;
    border-radius: 50%;
  }

  /* Style for Firefox slider thumbs */
  .slider::-moz-range-thumb {
    width: 24px;
    height: 24px;
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.3);
    background: white;
    color: #30d259ad;
    cursor: pointer;
    border-radius: 50%;
  }
</style>
