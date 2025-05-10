<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState' // Import reactive settings state

  // Destructure onClick function from component props
  let { onClick } = $props<{ onClick: () => void }>();
</script>

<!--
  Button element styled as a color swatch.
  - `aria-label` improves accessibility.
  - `onclick` triggers the provided click handler.
  - Background color is bound to the selected color from settingsState.
  - Tailwind classes control size and appearance.
-->
<button
  aria-label="Color Picker Swatch"
  onclick={onClick}
  style="background: {$settingsState.selectedColor}"
  class="w-16 h-8 rounded-md"
></button>
