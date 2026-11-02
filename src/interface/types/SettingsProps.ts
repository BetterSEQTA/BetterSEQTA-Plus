import type { Component } from "svelte";

export interface SettingsList {
  title: string;
  id: number;
  description: string;
  Component: Component<any>;
  props?: Record<string, unknown>;
}
