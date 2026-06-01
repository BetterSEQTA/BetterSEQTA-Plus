<script lang="ts">
  import { THEMES, type ChartConfig } from "./chart-utils";

  let { id, config }: { id: string; config: ChartConfig } = $props();

  const colorConfig = $derived(
    config
      ? Object.entries(config).filter(([, c]) => c.theme || c.color)
      : null,
  );

  const themeContents = $derived.by(() => {
    if (!colorConfig?.length) return;

    const themeContents: string[] = [];
    for (const [_theme, prefix] of Object.entries(THEMES)) {
      let content = `${prefix} [data-chart=${id}] {\n`;
      const color = colorConfig.map(([key, itemConfig]) => {
        const theme = _theme as keyof typeof itemConfig.theme;
        const c = itemConfig.theme?.[theme] || itemConfig.color;
        return c ? `\t--color-${key}: ${c};` : null;
      });
      content += color.filter(Boolean).join("\n") + "\n}";
      themeContents.push(content);
    }
    return themeContents.join("\n");
  });
</script>

{#if themeContents}
  {#key id}
    <svelte:element this={"style"}>
      {themeContents}
    </svelte:element>
  {/key}
{/if}
