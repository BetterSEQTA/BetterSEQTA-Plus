import type { SvelteComponent } from "svelte";
import AssessmentItem from "../components/items/AssessmentItem.svelte";
import ForumItem from "../components/items/ForumItem.svelte";
import SubjectItem from "../components/items/SubjectItem.svelte";
import GenericItem from "../components/items/GenericItem.svelte";

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
