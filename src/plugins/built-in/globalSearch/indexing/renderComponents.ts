import type { SvelteComponent } from 'svelte';
import AssessmentComponent from '../components/AssessmentItem.svelte';
// import other components as needed

export const renderComponentMap: Record<string, typeof SvelteComponent> = {
  assessment: AssessmentComponent as unknown as typeof SvelteComponent,
  // messages: MessageComponent,
  // subject: SubjectComponent,
  // etc...
};
