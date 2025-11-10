import { settingsState } from "../listeners/SettingsState";
import { animate as motionAnimate, stagger } from "motion";

type AnimationTarget = string | Element | Element[] | NodeList | null;

let isClosing = false;

export async function closePopup() {
  if (isClosing) return;
  isClosing = true;

  const background = document.getElementById("whatsnewbk");
  const popup = document.getElementsByClassName("whatsnewContainer")[0] as
    | HTMLElement
    | undefined;

  if (!background || !popup) {
    isClosing = false;
    return;
  }

  if (!settingsState.animations) {
    background.remove();
    isClosing = false;
    return;
  }

  await (motionAnimate as any)(
    [popup, background],
    { opacity: [1, 0], scale: [1, 0.95] },
    { duration: 0.25, easing: [0.22, 0.03, 0.26, 1] },
  );

  background.remove();
  isClosing = false;
}

interface OpenPopupOptions {
  header?: Node | null;
  content?: (Node | null | undefined)[];
  animateSelector?: AnimationTarget;
}

export function openPopup({
  header,
  content = [],
  animateSelector = ".whatsnewTextContainer *",
}: OpenPopupOptions = {}) {
  const background = document.createElement("div");
  background.id = "whatsnewbk";
  background.classList.add("whatsnewBackground");

  const container = document.createElement("div");
  container.classList.add("whatsnewContainer");

  if (header) container.append(header);
  for (const node of content) if (node) container.append(node);

  const closeButton = document.createElement("div");
  closeButton.id = "whatsnewclosebutton";
  container.append(closeButton);

  background.append(container);
  document.getElementById("container")!.append(background);

  if (settingsState.animations) {
    (motionAnimate as any)(
      [container, background],
      { scale: [0, 1] },
      { type: "spring", stiffness: 220, damping: 18 },
    );

    if (animateSelector) {
      const targets =
        typeof animateSelector === "string"
          ? document.querySelectorAll(animateSelector)
          : animateSelector;

      (motionAnimate as any)(
        targets!,
        { opacity: [0, 1], y: [10, 0] },
        {
          delay: stagger(0.05, { startDelay: 0.1 }),
          duration: 0.5,
          easing: [0.22, 0.03, 0.26, 1],
        },
      );
    }
  }

  delete settingsState.justupdated;

  background.addEventListener("click", (event) => {
    if (event.target === background) void closePopup();
  });

  closeButton.addEventListener("click", () => void closePopup());
}
