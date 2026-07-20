/**
 * Tiny flag module with no imports — breaks the OpenMenuOptions ↔ sidebarMenuIcons
 * cycle that caused Vite HMR: "does not provide an export named 'MenuOptionsOpen'".
 */
export let MenuOptionsOpen = false;

export function setMenuOptionsOpen(open: boolean) {
  MenuOptionsOpen = open;
}

export function isMenuOptionsOpen(): boolean {
  return MenuOptionsOpen;
}
