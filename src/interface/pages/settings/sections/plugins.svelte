<script lang="ts">
  import PluginSettingsBlocks from "../PluginSettingsBlocks.svelte";
  import type { SettingsSectionId, SettingsSectionSharedProps } from "../shared";

  let {
    section,
    showDisclaimer,
    searchQuery = "",
  }: SettingsSectionSharedProps & { section: SettingsSectionId } = $props();
</script>

<PluginSettingsBlocks {section} {showDisclaimer} {searchQuery} />
