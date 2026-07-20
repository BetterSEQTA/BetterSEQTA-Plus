declare module "*.mp4";
declare module "*.woff";
declare module "*.scss";
declare module "*.png";
declare module "*.html";
declare module "*.svelte";

declare module "*?inlineWorker" {
  const value: () => Worker;
  export default value;
}

/** CRXJS dynamic content / main-world script path (relative to extension root). */
declare module "*?script" {
  const path: string;
  export default path;
}

declare module "*?script&iife" {
  const path: string;
  export default path;
}

declare module "*?script&module" {
  const path: string;
  export default path;
}

declare module "*.png?base64" {
  const value: string;
  export default value;
}

declare module "*.jpg?base64" {
  const value: string;
  export default value;
}

declare module "*.jpeg?base64" {
  const value: string;
  export default value;
}

declare module "*.gif?base64" {
  const value: string;
  export default value;
}

declare module "*.svg?base64" {
  const value: string;
  export default value;
}
