<script lang="ts">
  import SettingsBody from "./SettingsBody.svelte";
  import type { SettingsSectionSharedProps } from "./shared";

  let props: SettingsSectionSharedProps & { activeSection?: string } = $props();
</script>

<SettingsBody {...props} />
