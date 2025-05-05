import type { SvelteComponent } from "svelte";
import AssessmentItem from "../components/items/AssessmentItem.svelte";
import ForumItem from "../components/items/ForumItem.svelte";
// import other components as needed

export const renderComponentMap: Record<string, typeof SvelteComponent> = {
  assessment: AssessmentItem as unknown as typeof SvelteComponent,
  message: AssessmentItem as unknown as typeof SvelteComponent,
  forum: ForumItem as unknown as typeof SvelteComponent,
  // subject: SubjectComponent,
  // etc...
};