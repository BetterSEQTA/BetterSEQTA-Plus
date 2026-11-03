class ThemeBuilderPanelStore {
  editingThemeId = $state<string | null>(null);

  open(themeId?: string | null) {
    this.editingThemeId = themeId ?? null;
  }

  close() {
    this.editingThemeId = null;
  }
}

export const themeBuilderPanel = new ThemeBuilderPanelStore();
