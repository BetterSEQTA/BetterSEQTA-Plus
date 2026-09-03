<script lang="ts">
  import LazySection from "./LazySection.svelte";
  import {
    ALL_SETTINGS_SECTIONS,
    type SettingsSectionId,
    type SettingsSectionSharedProps,
  } from "./shared";
  import { isPerformanceMode } from "@/seqta/utils/performanceMode";

  let {
    activeSection = "general",
    ...rest
  }: SettingsSectionSharedProps & { activeSection?: string } = $props();

  let mountedSectionCount = $state(ALL_SETTINGS_SECTIONS.length);

  $effect(() => {
    if (activeSection !== "all") {
      mountedSectionCount = 1;
      return;
    }

    mountedSectionCount = 1;
    let idx = 1;
    const step = () => {
      if (idx >= ALL_SETTINGS_SECTIONS.length) return;
      mountedSectionCount = ++idx;
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(step, { timeout: isPerformanceMode() ? 800 : 500 });
      } else {
        setTimeout(step, isPerformanceMode() ? 64 : 32);
      }
    };

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(step, { timeout: isPerformanceMode() ? 800 : 500 });
    } else {
      setTimeout(step, isPerformanceMode() ? 64 : 32);
    }
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
    <LazySection {section} {...rest} />
  {/each}
</div>
