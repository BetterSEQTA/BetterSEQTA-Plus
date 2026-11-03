import type { MountableSvelteComponent } from "@/types/mountableComponent";
import { toMountableComponent } from "@/types/mountableComponent";
import AssessmentItem from "../components/items/AssessmentItem.svelte";
import ForumItem from "../components/items/ForumItem.svelte";
import SubjectItem from "../components/items/SubjectItem.svelte";
import GenericItem from "../components/items/GenericItem.svelte";
import type { IndexItem } from "./types";
import { jobs } from "./jobs";
import { loadDynamicItems } from "../utils/dynamicItems";

export const renderComponentMap: Record<string, MountableSvelteComponent> = {
  assessment: toMountableComponent(AssessmentItem),
  message: toMountableComponent(AssessmentItem),
  forum: toMountableComponent(ForumItem),
  subject: toMountableComponent(SubjectItem),
  course: toMountableComponent(GenericItem),
  notice: toMountableComponent(GenericItem),
  document: toMountableComponent(GenericItem),
  folio: toMountableComponent(GenericItem),
  portal: toMountableComponent(GenericItem),
  report: toMountableComponent(GenericItem),
  goal: toMountableComponent(GenericItem),
  passive: toMountableComponent(GenericItem),
};

function resolveRenderComponent(item: IndexItem): MountableSvelteComponent | undefined {
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
