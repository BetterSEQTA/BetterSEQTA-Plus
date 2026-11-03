const GAP_PX = 2;

export function attachTooltip(anchor: HTMLElement) {
  const bubble = anchor.querySelector<HTMLElement>(":scope > .bsplus-tooltip-bubble");
  if (!bubble || bubble.popover) return;
  bubble.popover = "manual";

  const isOpen = () => bubble.matches(":popover-open");

  const show = () => {
    if (isOpen()) return;
    bubble.showPopover();
    const rect = anchor.getBoundingClientRect();
    bubble.style.left = `${Math.round(rect.left + (rect.width - bubble.offsetWidth) / 2)}px`;
    bubble.style.top = `${Math.round(rect.bottom + GAP_PX)}px`;
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
