import type { SvelteComponent } from "svelte";
import AssessmentItem from "../components/items/AssessmentItem.svelte";
import ForumItem from "../components/items/ForumItem.svelte";
import SubjectItem from "../components/items/SubjectItem.svelte";
import GenericItem from "../components/items/GenericItem.svelte";
import type { IndexItem } from "./types";
import { jobs } from "./jobs";
import { loadDynamicItems } from "../utils/dynamicItems";

export const renderComponentMap: Record<string, typeof SvelteComponent> = {
  assessment: AssessmentItem as unknown as typeof SvelteComponent,
  message: AssessmentItem as unknown as typeof SvelteComponent,
  forum: ForumItem as unknown as typeof SvelteComponent,
  subject: SubjectItem as unknown as typeof SvelteComponent,
  // New categories share a generic, category-aware row component to keep
  // the palette consistent without bespoke layouts for every job. The
  // component reads `item.metadata.icon` and the `category` to pick a
  // sensible default visual treatment.
  course: GenericItem as unknown as typeof SvelteComponent,
  notice: GenericItem as unknown as typeof SvelteComponent,
  document: GenericItem as unknown as typeof SvelteComponent,
  folio: GenericItem as unknown as typeof SvelteComponent,
  portal: GenericItem as unknown as typeof SvelteComponent,
  report: GenericItem as unknown as typeof SvelteComponent,
  goal: GenericItem as unknown as typeof SvelteComponent,
  passive: GenericItem as unknown as typeof SvelteComponent,
};

function resolveRenderComponent(item: IndexItem): typeof SvelteComponent | undefined {
  const jobDef =
    jobs[item.category] ||
    Object.values(jobs).find((j) => j.id === item.category) ||
    jobs[item.renderComponentId];
  if (jobDef) {
    return renderComponentMap[jobDef.renderComponentId] || item.renderComponent;
  }
  if (renderComponentMap[item.renderComponentId]) {
    return renderComponentMap[item.renderComponentId];
  }
  return item.renderComponent;
}

/**
 * Attach render components and deep-clone items for search UI (Firefox XrayWrapper).
 */
export function decorateIndexItems(items: IndexItem[]): IndexItem[] {
  return items.map((item) => {
    try {
      const renderComponent = resolveRenderComponent(item);
      try {
        const cloned = JSON.parse(JSON.stringify(item)) as IndexItem;
        cloned.renderComponent = renderComponent;
        return cloned;
      } catch {
        return { ...item, renderComponent };
      }
    } catch {
      return item;
    }
  });
}

export function publishDynamicItemsUpdate(
  items: IndexItem[],
  jobId: string,
  newItemCount: number,
): void {
  loadDynamicItems(decorateIndexItems(items));
  window.dispatchEvent(
    new CustomEvent("dynamic-items-updated", {
      detail: {
        incremental: true,
        jobId,
        newItemCount,
        streaming: true,
      },
    }),
  );
}
