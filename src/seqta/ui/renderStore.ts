async function openThemesDestination(view: "store" | "community"): Promise<void> {
  const [{ requestSettingsDestination }, { openSettingsPopup }] = await Promise.all([
    import("@/seqta/utils/settingsNavigation"),
    import("@/seqta/utils/setupSettingsButton"),
  ]);
  requestSettingsDestination({ page: "themes", view });
  await openSettingsPopup();
}

export async function openStorePage(): Promise<void> {
  await openThemesDestination("store");
}

export async function openCommunityThemesPage(): Promise<void> {
  await openThemesDestination("community");
}
