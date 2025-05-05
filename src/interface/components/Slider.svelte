<script lang="ts">
  let { state, onChange, min = 0, max = 100, step = 1 } = $props<{ 
    state: number, 
    onChange: (value: number) => void,
    min?: number,
    max?: number,
    step?: number
  }>();
  let percentage = $derived(((state - min) / (max - min)) * 100);
</script>

<div class="relative mx-auto w-full max-w-lg">
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    bind:value={state}
    style={`background: linear-gradient(to right, #30d259ad 0%, #30D259 ${percentage}%, #dddddd ${percentage}%)`}
    onchange={(e) => onChange(Number(e.currentTarget.value))}
    class="w-full h-1 rounded-full appearance-none cursor-pointer slider"
  />
</div>

<style>
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.3);
    background: white;
    cursor: pointer;
    border-radius: 50%;
  }

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