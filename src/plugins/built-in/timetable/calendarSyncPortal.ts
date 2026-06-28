/** Layer order: toolbar boost < menu < modal (all portaled UI uses the upper layers). */
export const CALENDAR_SYNC_Z_MENU = 2_147_483_646;
export const CALENDAR_SYNC_Z_MODAL = 2_147_483_647;

export function portalToBody(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}

export function isCalendarSyncModalTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".bsplus-cal-modal-backdrop"));
}
