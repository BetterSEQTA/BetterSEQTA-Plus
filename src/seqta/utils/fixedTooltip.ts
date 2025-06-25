export function setupFixedTooltips(root: Document | HTMLElement = document) {
  const elements = root.querySelectorAll<HTMLElement>(".fixed-tooltip");
  elements.forEach((tooltip) => {
    const text = tooltip.querySelector<HTMLElement>(".tooltiptext");
    if (!text) return;
    tooltip.removeChild(text);
    text.classList.add("tooltiptext-fixed");

    let hideTimeout: number | undefined;

    const show = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = undefined;
      }
      document.body.appendChild(text);
      const rect = tooltip.getBoundingClientRect();
      text.style.left = `${rect.left + rect.width / 2}px`;
      text.style.top = `${rect.bottom + 5}px`;
      requestAnimationFrame(() => text.classList.add("show"));
    };

    const scheduleHide = () => {
      hideTimeout = window.setTimeout(() => {
        text.classList.remove("show");
        setTimeout(() => {
          if (text.parentElement === document.body) {
            document.body.removeChild(text);
          }
        }, 200);
      }, 300);
    };

    tooltip.addEventListener("mouseenter", show);
    tooltip.addEventListener("mouseleave", scheduleHide);
    tooltip.addEventListener("blur", scheduleHide);
    tooltip.addEventListener("click", scheduleHide);

    text.addEventListener("mouseenter", () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = undefined;
      }
    });
    text.addEventListener("mouseleave", scheduleHide);
    text.addEventListener("click", () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = undefined;
      }
      text.classList.remove("show");
      setTimeout(() => {
        if (text.parentElement === document.body) {
          document.body.removeChild(text);
        }
      }, 200);
    });
  });
}
