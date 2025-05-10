// Declare module types for importing media and style assets
declare module "*.mp4"; // Allows importing .mp4 files
declare module "*.woff"; // Allows importing .woff font files
declare module "*.scss"; // Allows importing .scss stylesheets
declare module "*.png"; // Allows importing .png image files
declare module "*.html"; // Allows importing .html files
declare module "*.svelte"; // Allows importing .svelte components

// Declare module type for inline Web Workers
declare module "*?inlineWorker" {
  const value: () => Worker; // Exports a function that returns a Web Worker
  export default value;
}

// Declare module types for base64 encoded image imports
declare module "*.png?base64" {
  const value: string; // Base64 encoded PNG string
  export default value;
}

declare module "*.jpg?base64" {
  const value: string; // Base64 encoded JPG string
  export default value;
}

declare module "*.jpeg?base64" {
  const value: string; // Base64 encoded JPEG string
  export default value;
}

declare module "*.gif?base64" {
  const value: string; // Base64 encoded GIF string
  export default value;
}

declare module "*.svg?base64" {
  const value: string; // Base64 encoded SVG string
  export default value;
}
