import { ensureThemeCoverImage } from "@/interface/utils/themePlaceholderCover";
import { ThemeManager } from "@/plugins/built-in/themes/theme-manager";
import {
  buildUploadPartsFromLocalTheme,
  mergeUploadPayload,
} from "@/seqta/utils/customThemes/buildThemeUploadFormData";
import { submitCustomTheme } from "@/seqta/utils/customThemes/client";
import type { LoadedCustomTheme } from "@/types/CustomThemes";

export async function submitLocalThemeToCommunity(
  theme: LoadedCustomTheme,
  submissionNotes?: string,
) {
  const payload = mergeUploadPayload(await buildUploadPartsFromLocalTheme(theme), submissionNotes);
  return await submitCustomTheme(payload);
}

export async function submitThemeById(themeId: string, submissionNotes?: string) {
  const theme = await ThemeManager.getInstance().getTheme(themeId);
  if (!theme) throw new Error("Theme not found");
  return submitLocalThemeToCommunity(
    await ensureThemeCoverImage(theme as LoadedCustomTheme),
    submissionNotes,
  );
}
