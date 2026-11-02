import type { Component } from "svelte";

export interface SettingsList {
  title: string;
  id: number;
  description: string;
  Component: Component<Record<string, unknown>>;
  props?: Record<string, unknown>;
}
