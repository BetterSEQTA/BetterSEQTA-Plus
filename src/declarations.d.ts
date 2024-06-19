declare module '*.mp4';
declare module '*.woff';
declare module '*.scss';
declare module '*.png';
declare module '*.html';

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