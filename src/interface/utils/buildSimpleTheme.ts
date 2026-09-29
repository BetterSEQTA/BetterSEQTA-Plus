import type { LoadedCustomTheme } from "@/types/CustomThemes";
import { buildThemeFromDraft, type ThemeBuilderDraft } from "./themeBuilderDraft";

export type SimpleThemeInput = ThemeBuilderDraft;

export { buildThemeBuilderCss as buildSimpleThemeCss } from "./themeBuilderDraft";

/** @deprecated Use buildThemeFromDraft */
export function buildSimpleTheme(input: SimpleThemeInput): LoadedCustomTheme {
  return buildThemeFromDraft(input);
}
