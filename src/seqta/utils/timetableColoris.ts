/**
 * SEQTA timetable uses Coloris for subject colours. Extension CSS previously
 * unset Coloris ::after animations, which left the picker unable to reopen.
 * This module clears stuck `clr-open` / hidden picker state after each use.
 */

let attached = false;

export function resetStuckColorisPicker(): void {
  document.body.classList.remove("clr-open");
  document.documentElement.classList.remove("clr-open");

  for (const picker of document.querySelectorAll(".clr-picker")) {
    picker.classList.remove("clr-open");
    if (picker instanceof HTMLElement) {
      picker.style.removeProperty("display");
      picker.style.removeProperty("pointer-events");
      picker.style.removeProperty("visibility");
    }
  }

  for (const field of document.querySelectorAll(".clr-field")) {
    field.classList.remove("clr-open");
  }
}

export function attachTimetableColorisRecovery(): void {
  if (attached) return;
  attached = true;

  const afterColorisEvent = () => {
    requestAnimationFrame(() => resetStuckColorisPicker());
  };

  document.addEventListener("coloris:pick", afterColorisEvent);
  document.addEventListener("coloris:close", afterColorisEvent);

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".timetablepage [title='Choose a colour']")) return;
      resetStuckColorisPicker();
    },
    true,
  );
}
