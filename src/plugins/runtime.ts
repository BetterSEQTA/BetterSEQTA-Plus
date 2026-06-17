export { init as Monofile } from "./monofile";

export async function initializePlugins(): Promise<void> {
  const { pluginManager } = await import("./index");
  await pluginManager.startAllPlugins();
}
