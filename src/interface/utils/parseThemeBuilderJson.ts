import { base64ToBlob, stripBase64Prefix } from "@/seqta/utils/base64";
import type { LoadedCustomTheme, ThemeCreatorMeta } from "@/types/customThemes";

function parseImageBlobs(data: Record<string, unknown>): LoadedCustomTheme["CustomImages"] {
  const raw = Array.isArray(data.images)
    ? data.images
    : Array.isArray(data.CustomImages)
      ? data.CustomImages
      : [];
  const images: LoadedCustomTheme["CustomImages"] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    let blob: Blob | null = null;
    if (row.blob instanceof Blob) {
      blob = row.blob;
    } else if (typeof row.data === "string" && row.data) {
      try {
        blob = base64ToBlob(stripBase64Prefix(row.data));
      } catch {
        continue;
      }
    }
    if (!blob) continue;
    images.push({
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      variableName:
        typeof row.variableName === "string" && row.variableName
          ? row.variableName
          : `custom-image-${images.length}`,
      blob,
    });
  }
  return images;
}

/** Parse pasted theme.json (export or upload format) into builder state. */
export function parseThemeBuilderJson(text: string): LoadedCustomTheme {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Paste theme JSON first");

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON");
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) throw new Error('Theme JSON must include "name"');

  const CustomImages = parseImageBlobs(data);
  let coverImage: Blob | null = null;
  if (typeof data.coverImage === "string" && data.coverImage) {
    try {
      coverImage = base64ToBlob(stripBase64Prefix(data.coverImage));
    } catch {
      coverImage = null;
    }
  }

  const creatorMeta =
    data.creatorMeta && typeof data.creatorMeta === "object"
      ? (data.creatorMeta as ThemeCreatorMeta)
      : undefined;

  return {
    id: typeof data.id === "string" && data.id.trim() ? data.id.trim() : crypto.randomUUID(),
    name,
    description: typeof data.description === "string" ? data.description : "",
    defaultColour:
      typeof data.defaultColour === "string" ? data.defaultColour : "rgba(0, 123, 255, 1)",
    CanChangeColour: data.CanChangeColour !== false,
    allowBackgrounds: data.allowBackgrounds !== false,
    CustomCSS: typeof data.CustomCSS === "string" ? data.CustomCSS : "",
    CustomImages,
    coverImage,
    isEditable: true,
    hideThemeName: data.hideThemeName === true,
    forceTheme: typeof data.forceTheme === "boolean" ? data.forceTheme : undefined,
    forceDark: typeof data.forceDark === "boolean" ? data.forceDark : undefined,
    adaptiveCssVariables: Array.isArray(data.adaptiveCssVariables)
      ? (data.adaptiveCssVariables as string[])
      : [],
    creatorMeta,
  };
}
