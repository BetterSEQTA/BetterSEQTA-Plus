import type { LoadedCustomTheme } from "@/types/CustomThemes";

export function handleImageUpload(event: Event, theme: LoadedCustomTheme): LoadedCustomTheme {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return theme;
  return {
    ...theme,
    CustomImages: [
      ...theme.CustomImages,
      {
        id: crypto.randomUUID(),
        blob: file,
        variableName: `custom-image-${theme.CustomImages.length}`,
        url: null,
      },
    ],
  };
}

export function handleRemoveImage(imageId: string, theme: LoadedCustomTheme): LoadedCustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.filter((image) => image.id !== imageId),
  };
}

export function handleImageVariableChange(
  imageId: string,
  variableName: string,
  theme: LoadedCustomTheme,
): LoadedCustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.map((image) =>
      image.id === imageId ? { ...image, variableName } : image,
    ),
  };
}
