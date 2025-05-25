<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'

  let { onClick } = $props<{ onClick: () => void }>();
</script>

<button
  aria-label="Color Picker Swatch"
  onclick={onClick}
  style="background: {$settingsState.selectedColor}"
  class="w-16 h-8 rounded-md shadow-2xl ring-[1px] ring-[#DDDDDD]/30 dark:ring-[#38373D]/30"
></button>