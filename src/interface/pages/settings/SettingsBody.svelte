<script lang="ts">
  import LazyPanel from "../../components/LazyPanel.svelte";
  import {
    ALL_SETTINGS_SECTIONS,
    type SettingsSectionId,
    type SettingsSectionSharedProps,
  } from "./shared";
  import { SECTION_LOADERS } from "./sectionLoaders";
  import { isPerformanceMode } from "@/seqta/utils/performanceMode";

  let {
    activeSection = "general",
    ...rest
  }: SettingsSectionSharedProps & { activeSection?: string } = $props();

  let mountedSectionCount = $state(1);

  function scheduleIdle(step: () => void) {
    const delay = isPerformanceMode() ? 64 : 32;
    const timeout = isPerformanceMode() ? 800 : 500;
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(step, { timeout });
    } else {
      setTimeout(step, delay);
    }
  }

  $effect(() => {
    mountedSectionCount = 1;
    if (activeSection !== "all") return;

    let idx = 1;
    const step = () => {
      if (idx >= ALL_SETTINGS_SECTIONS.length) return;
      mountedSectionCount = ++idx;
      scheduleIdle(step);
    };
    scheduleIdle(step);
  });

  const sectionsToShow = $derived.by((): SettingsSectionId[] => {
    if (activeSection === "all") {
      return ALL_SETTINGS_SECTIONS.slice(0, mountedSectionCount);
    }
    if (ALL_SETTINGS_SECTIONS.includes(activeSection as SettingsSectionId)) {
      return [activeSection as SettingsSectionId];
    }
    return ["general"];
  });
</script>

<div class="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-700">
  {#each sectionsToShow as section (section)}
    <LazyPanel
      loader={SECTION_LOADERS[section]}
      remountKey={section}
      props={{ section, ...rest }}
    />
  {/each}
</div>
