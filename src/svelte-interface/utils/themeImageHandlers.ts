import type { CustomTheme } from '@/types/CustomThemes';

export function generateImageId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function handleImageUpload(event: Event, theme: CustomTheme): Promise<CustomTheme> | CustomTheme {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBlob = await fetch(reader.result as string).then(res => res.blob());
        const imageId = generateImageId();
        const variableName = `custom-image-${theme.CustomImages.length}`;
        resolve({
          ...theme,
          CustomImages: [...theme.CustomImages, { id: imageId, blob: imageBlob, variableName }],
        });
      };
      reader.readAsDataURL(file);
    });
  }
  return theme;
}

export function handleRemoveImage(imageId: string, theme: CustomTheme): CustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.filter((image) => image.id !== imageId),
  };
}

export function handleImageVariableChange(imageId: string, variableName: string, theme: CustomTheme): CustomTheme {
  return {
    ...theme,
    CustomImages: theme.CustomImages.map((image) =>
      image.id === imageId ? { ...image, variableName } : image
    ),
  };
}

export function handleCoverImageUpload(event: Event, theme: CustomTheme): Promise<CustomTheme> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageBlob = await fetch(reader.result as string).then(res => res.blob());
        resolve({ ...theme, coverImage: imageBlob });
      };
      reader.readAsDataURL(file);
    });
  }
  return Promise.resolve(theme);
}