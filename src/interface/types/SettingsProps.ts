import type { MountableSvelteComponent } from "@/types/mountableComponent";

export interface SettingsList {
  title: string;
  id: number;
  description: string;
  Component: MountableSvelteComponent;
  props?: Record<string, unknown>;
}
