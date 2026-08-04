export async function OpenStorePage(): Promise<void> {
  const [{ requestSettingsDestination }, { openSettingsPopup }] =
    await Promise.all([
      import("@/seqta/utils/settingsNavigation"),
      import("@/seqta/utils/setupSettingsButton"),
    ]);
  requestSettingsDestination({ page: "themes", view: "store" });
  await openSettingsPopup();
}
