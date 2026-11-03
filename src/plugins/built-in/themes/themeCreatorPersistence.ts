const OPEN_KEY = "themeCreatorOpen";
const EDITING_ID_KEY = "themeBuilderEditingId";

export function persistThemeCreatorSession(editingThemeId: string | null): void {
  localStorage.setItem(OPEN_KEY, "true");
  if (editingThemeId) {
    localStorage.setItem(EDITING_ID_KEY, editingThemeId);
  } else {
    localStorage.removeItem(EDITING_ID_KEY);
  }
}

export function clearThemeCreatorSession(): void {
  localStorage.removeItem(OPEN_KEY);
  localStorage.removeItem(EDITING_ID_KEY);
  localStorage.removeItem("themeBuilderIntent");
}

export function readThemeCreatorSession(): { open: boolean; editingThemeId: string } {
  return {
    open: localStorage.getItem(OPEN_KEY) === "true",
    editingThemeId: localStorage.getItem(EDITING_ID_KEY) ?? "",
  };
}
