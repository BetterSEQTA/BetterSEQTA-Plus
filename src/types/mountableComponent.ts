import type { Component } from "svelte";

/**
 * Svelte components mounted with runtime props (settings UI, search bar, etc.).
 * Use {@link toMountableComponent} at registration sites — prop shapes vary.
 */
export type MountableSvelteComponent = Component<
  Record<string, unknown>,
  Record<string, unknown>,
  string
>;

export function toMountableComponent(
  component: Component<any, any, any>,
): MountableSvelteComponent {
  return component as MountableSvelteComponent;
}
