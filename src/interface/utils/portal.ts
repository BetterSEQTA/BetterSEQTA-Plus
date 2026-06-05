import type { Action } from "svelte/action";

/**
 * Svelte action that moves the element to a different DOM target.
 * Defaults to the nearest ShadowRoot so styles remain intact when the app
 * is rendered inside a shadow DOM. Falls back to document.body otherwise.
 * Pass `document.body` to escape transformed/contained settings popups entirely.
 */
export const portal: Action<HTMLElement, HTMLElement | ShadowRoot | undefined> = (
  node,
  target,
) => {
  const root = node.getRootNode();
  const dest = target ?? (root instanceof ShadowRoot ? root : document.body);
  dest.appendChild(node);

  return {
    update(newTarget) {
      const nextDest =
        newTarget ?? (root instanceof ShadowRoot ? root : document.body);
      nextDest.appendChild(node);
    },
    destroy() {
      node.remove();
    },
  };
};
