export function getCkeditorGlobal(): unknown {
  return (window as Window & { CKEDITOR?: unknown }).CKEDITOR;
}
