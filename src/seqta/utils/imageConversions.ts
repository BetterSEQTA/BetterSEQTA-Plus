export function base64toblobURL(base64: string) {
  // Extract base64 data from the data URI
  const base64Index = base64.indexOf(',') + 1;
  const imageBase64 = base64.substring(base64Index);

  // Convert base64 to blob
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Convert blob to blob URL
  const imageUrl = URL.createObjectURL(blob);

  return imageUrl;
}