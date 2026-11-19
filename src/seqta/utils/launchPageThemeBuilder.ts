/** Close settings (if open) and mount the theme builder on the SEQTA page body. */
export async function launchPageThemeBuilder(themeId?: string): Promise<void> {
  const { closeExtensionPopup } = await import("@/seqta/utils/closers/closeExtensionPopup");
  const { openThemeCreator } = await import("@/plugins/built-in/themes/themeCreator");

  closeExtensionPopup();
  await openThemeCreator(themeId ?? "");
}
