import type { LoadedCustomTheme } from "@/types/CustomThemes";
import { blobToBase64Data } from "@/plugins/built-in/themes/themeImageUrl";
import type { CustomThemeUploadFilePart, CustomThemeUploadPayload } from "./types";

/** Build serializable upload parts from a local custom theme (loose files, not ZIP). */
export async function buildUploadPartsFromLocalTheme(
  theme: LoadedCustomTheme,
): Promise<CustomThemeUploadPayload> {
  const {
    CustomImages = [],
    coverImage,
    webURL,
    isEditable,
    selectedColor,
    allowBackgrounds,
    installedFromStore,
    storeSyncedAtSec,
    userEdited,
    installedFromCommunity,
    ...themeBasics
  } = theme;

  const finalImages = await Promise.all(
    CustomImages.map(async (image) => ({
      id: image.id,
      variableName: image.variableName,
      data: await blobToBase64Data(image.blob),
    })),
  );

  const coverImageBase64 = coverImage ? await blobToBase64Data(coverImage) : null;

  const themeJson = JSON.stringify({
    ...themeBasics,
    images: finalImages,
    coverImage: coverImageBase64,
  });

  const looseFiles: CustomThemeUploadFilePart[] = [
    {
      fieldName: "theme.json",
      filename: "theme.json",
      mimeType: "application/json",
      dataBase64: base64FromUtf8(themeJson),
    },
  ];

  if (coverImage) {
    const coverBytes = await blobToBase64Data(coverImage);
    looseFiles.push({
      fieldName: "images/banner.webp",
      filename: "banner.webp",
      mimeType: coverImage.type || "image/webp",
      dataBase64: coverBytes,
    });
    looseFiles.push({
      fieldName: "images/marquee.webp",
      filename: "marquee.webp",
      mimeType: coverImage.type || "image/webp",
      dataBase64: coverBytes,
    });
  }

  return { looseFiles };
}

/** Build upload payload from a user-selected ZIP file. */
export async function buildUploadPartsFromZipFile(file: File): Promise<CustomThemeUploadPayload> {
  const dataBase64 = await readFileAsBase64(file);
  return {
    themeZip: {
      fieldName: "theme_zip",
      filename: file.name || "theme.zip",
      mimeType: file.type || "application/zip",
      dataBase64,
    },
  };
}

function base64FromUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function mergeUploadPayload(
  base: CustomThemeUploadPayload,
  submissionNotes?: string,
): CustomThemeUploadPayload {
  const notes = submissionNotes?.trim();
  return notes ? { ...base, submissionNotes: notes } : base;
}
