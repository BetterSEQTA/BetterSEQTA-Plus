/** Close settings (if open) and mount the theme builder on the SEQTA page body. */
export async function launchPageThemeBuilder(themeId?: string): Promise<void> {
  const { closeExtensionPopup } = await import("@/seqta/utils/Closers/closeExtensionPopup");
  const { OpenThemeCreator } = await import("@/plugins/built-in/themes/ThemeCreator");

  closeExtensionPopup();
  await OpenThemeCreator(themeId ?? "");
}
