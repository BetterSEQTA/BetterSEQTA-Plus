<script lang="ts">
  let { state, onChange } = $props<{ state: number, onChange: (value: number) => void }>();
  let percentage = $derived((state / 100) * 100);
</script>

<div class="relative w-full max-w-lg mx-auto">
  <input
    type="range"
    min="0"
    max="100"
    bind:value={state}
    style={`background: linear-gradient(to right, #30D259 ${percentage}%, #dddddd ${percentage}%)`}
    onchange={(e) => onChange(Number(e.currentTarget.value))}
    class="w-full h-1 rounded-full appearance-none cursor-pointer dark:bg-[#38373D] bg-[#DDDDDD] slider"
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
    cursor: pointer;
    border-radius: 50%;
  }
</style>