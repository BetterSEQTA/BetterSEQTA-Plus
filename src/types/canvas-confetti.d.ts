declare module "canvas-confetti" {
  const confetti: (options?: Record<string, unknown>) => Promise<void> | null;
  export default confetti;
}
