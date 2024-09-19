<script lang="ts">
  import { settingsState } from '@/seqta/utils/listeners/SettingsState'

  let { onClick } = $props<{ onClick: () => void }>();
</script>

<button
  onclick={onClick}
  style="background: {$settingsState.selectedColor}"
  class="w-16 h-8 rounded-md"
></button>