const GAP_PX = 8;

export function attachTooltip(anchor: HTMLElement) {
  const bubble = anchor.querySelector<HTMLElement>(":scope > .bsplus-tooltip-bubble");
  if (!bubble || bubble.popover) return;
  bubble.popover = "manual";

  const isOpen = () => bubble.matches(":popover-open");

  const show = () => {
    if (isOpen()) return;
    const rect = anchor.getBoundingClientRect();
    bubble.style.left = `${rect.left + rect.width / 2}px`;
    bubble.style.top = `${rect.bottom + GAP_PX}px`;
    bubble.showPopover();
  };
  const hide = () => {
    if (isOpen()) bubble.hidePopover();
  };

  anchor.addEventListener("pointerenter", show);
  anchor.addEventListener("pointerleave", hide);
  anchor.addEventListener("focusin", show);
  anchor.addEventListener("focusout", (event) => {
    if (!anchor.contains(event.relatedTarget as Node | null)) hide();
  });
  anchor.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
  bubble.addEventListener("click", hide);
}

export function setupTooltips(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".bsplus-tooltip").forEach(attachTooltip);
}
