/** Apply mod styles with priority over BetterSEQTA page CSS. */
export function stripStyleImportantSuffix(value: string): string {
  return value.replace(/\s*!important\s*$/i, "").trim();
}

export interface ModStyleSnapshot {
  previous: string;
  priority: string;
}

export function applyModStyleProperty(
  element: HTMLElement,
  property: string,
  value: string,
  important = true,
): ModStyleSnapshot {
  const previous = element.style.getPropertyValue(property);
  const priority = element.style.getPropertyPriority(property);
  element.style.setProperty(
    property,
    stripStyleImportantSuffix(value),
    important ? "important" : "",
  );
  return { previous, priority };
}

export function restoreModStyleProperty(
  element: HTMLElement,
  property: string,
  snapshot: ModStyleSnapshot,
): void {
  if (snapshot.previous) {
    element.style.setProperty(property, snapshot.previous, snapshot.priority);
  } else {
    element.style.removeProperty(property);
  }
}
