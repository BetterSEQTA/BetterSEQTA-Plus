import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

type SlashItems = SlashItem[];

type SlashItem = {
  title: string;
  subtitle: string;
  command: ({ editor, range }: EditorProps) => void;
};

type Component = {
  name: string;
  description: string;
  code: string;
};

type Components = Component[];

type EditorProps = {
  editor: any;
  range: number | null;
};

type Location = {
  x: number;
  y: number;
  height: number;
};

// For now we'll keep using stores until we can fully convert to runes in all components
export const slashItems: Writable<SlashItems> = writable([]);
export const slashVisible: Writable<boolean> = writable(false);
export const slashLocation: Writable<Location> = writable({
  x: 0,
  y: 0,
  height: 0,
});
export const slashProps: Writable<EditorProps> = writable({
  editor: null,
  range: null,
});
export const desktopMenu: Writable<boolean> = writable(true);
export const components: Writable<Components> = writable([]);
export const editorWidth: Writable<number> = writable(0);
export const selectedIndex: Writable<number> = writable(0);
