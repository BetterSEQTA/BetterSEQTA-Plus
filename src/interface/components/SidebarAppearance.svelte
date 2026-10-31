<script lang="ts">
  import SettingsCard from "@/interface/pages/settings/SettingsCard.svelte";
  import SettingRow from "@/interface/pages/settings/SettingRow.svelte";
  import Select from "@/interface/components/Select.svelte";
  import Slider from "@/interface/components/Slider.svelte";
  import Switch from "@/interface/components/Switch.svelte";
  import { settingsState } from "@/seqta/utils/listeners/SettingsState";
  import { matchesSearch } from "@/interface/pages/settings/shared";
  import {
    DEFAULT_SIDEBAR_BLUR,
    DEFAULT_SIDEBAR_RADIUS,
    normalizeSidebarBlur,
    normalizeSidebarDensity,
    normalizeSidebarIndicator,
    normalizeSidebarRadius,
    normalizeSidebarStyleId,
    normalizeSidebarWidth,
    normalizeSidebarPosition,
    SIDEBAR_STYLES,
  } from "@/seqta/ui/sidebar/sidebarStyles";

  let { searchQuery = "" }: { searchQuery?: string } = $props();

  const styleOptions = SIDEBAR_STYLES.map((s) => ({ value: s.id, label: s.label }));

  const rows = $derived.by(() => {
    const density = normalizeSidebarDensity($settingsState.sidebarDensity);
    const indicator = normalizeSidebarIndicator($settingsState.sidebarActiveIndicator);
    const width = normalizeSidebarWidth($settingsState.sidebarWidth);
    const position = normalizeSidebarPosition($settingsState.sidebarPosition);
    const radius = normalizeSidebarRadius(
      $settingsState.sidebarCornerRadius ?? DEFAULT_SIDEBAR_RADIUS,
    );
    const blur = normalizeSidebarBlur($settingsState.sidebarBlur ?? DEFAULT_SIDEBAR_BLUR);
    const transparencyOn = $settingsState.transparencyEffects === true;
    const styleId = normalizeSidebarStyleId($settingsState.sidebarStyle);

    const base = [
      {
        title: "Sidebar Style",
        description: "Choose how the navigation menu looks",
        id: 1,
        Component: Select,
        props: {
          value: styleId,
          onChange: (value: string) => (settingsState.sidebarStyle = value),
          options: styleOptions,
        },
      },
      {
        title: "Item Size",
        description: "Spacing and type size for menu rows",
        id: 2,
        Component: Select,
        props: {
          value: density,
          onChange: (value: string) => (settingsState.sidebarDensity = value),
          options: [
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
            { value: "large", label: "Large" },
          ],
        },
      },
      {
        title: "Corner Radius",
        description: `Roundness of menu items (${radius}px)`,
        id: 3,
        Component: Slider,
        props: {
          state: radius,
          min: 0,
          max: 24,
          step: 1,
          onChange: (value: number) => (settingsState.sidebarCornerRadius = value),
        },
      },
      {
        title: "Active Indicator",
        description: "How the current page is highlighted",
        id: 4,
        Component: Select,
        props: {
          value: indicator,
          onChange: (value: string) => (settingsState.sidebarActiveIndicator = value),
          options: [
            { value: "fill", label: "Fill" },
            { value: "bar", label: "Left bar" },
            { value: "outline", label: "Outline" },
            { value: "underline", label: "Underline" },
          ],
        },
      },
      {
        title: "Sidebar Position",
        description: "Which edge of the screen the navigation sits on",
        id: 5,
        Component: Select,
        props: {
          value: position,
          onChange: (value: string) => (settingsState.sidebarPosition = value),
          options: [
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ],
        },
      },
      {
        title: "Sidebar Width",
        description: "Overall navigation column width",
        id: 6,
        Component: Select,
        props: {
          value: width,
          onChange: (value: string) => (settingsState.sidebarWidth = value),
          options: [
            { value: "narrow", label: "Narrow" },
            { value: "default", label: "Default" },
            { value: "wide", label: "Wide" },
          ],
        },
      },
      {
        title: "Transparency Effects",
        description: "Glass effects on supported surfaces (may impact battery life)",
        id: 7,
        Component: Switch,
        props: {
          state: transparencyOn,
          onChange: (value: boolean) => (settingsState.transparencyEffects = value),
        },
      },
    ];

    if (!transparencyOn) return base;

    return [
      ...base,
      {
        title: "Blur Strength",
        description: `Glass blur on the sidebar (${blur}px)`,
        id: 8,
        Component: Slider,
        props: {
          state: blur,
          min: 0,
          max: 80,
          step: 1,
          onChange: (value: number) => (settingsState.sidebarBlur = value),
        },
      },
    ];
  });

  const visible = $derived(
    rows.some((row) => matchesSearch(searchQuery, row.title, row.description)),
  );
</script>

{#if visible}
  <SettingsCard class="divide-y divide-zinc-200/60 dark:divide-zinc-700/40">
    {#each rows as row (row.id)}
      {#if matchesSearch(searchQuery, row.title, row.description)}
        <SettingRow {...row} {searchQuery} />
      {/if}
    {/each}
  </SettingsCard>
{/if}
