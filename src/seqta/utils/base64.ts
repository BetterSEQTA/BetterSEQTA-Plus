export function base64ToBlob(base64: string, type = ""): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FileReader did not return a string"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export async function blobToBase64Data(blob: Blob): Promise<string> {
  return stripBase64Prefix(await blobToDataUrl(blob));
}

export function stripBase64Prefix(base64String: string): string {
  if (!base64String) return "";
  return base64String.replace(/^data:[^;]*;base64,/, "");
}
