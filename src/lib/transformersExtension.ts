import browser from "webextension-polyfill";

const ORT_RESOURCE_DIR = "resources/ort/";

let configured = false;

function extensionAssetUrl(relativePath: string): string {
  return browser.runtime.getURL(relativePath.replace(/^\/+/, ""));
}

/**
 * Point HuggingFace transformers / onnxruntime at extension-local WASM files
 * instead of CDN (required on SEQTA pages where page CSP blocks jsdelivr).
 * Safe to call multiple times; must run before embeddia `initializeModel()`.
 */
export async function ensureTransformersEnv(
  ortWasmBase?: string,
): Promise<void> {
  if (configured) return;

  const { env } = await import("@huggingface/transformers");
  const base = ortWasmBase ?? extensionAssetUrl(ORT_RESOURCE_DIR);

  env.backends.onnx.wasm = env.backends.onnx.wasm ?? {};
  env.backends.onnx.wasm.wasmPaths = base.endsWith("/") ? base : `${base}/`;

  configured = true;
}

export function getOrtWasmBaseUrl(): string {
  const base = extensionAssetUrl(ORT_RESOURCE_DIR);
  return base.endsWith("/") ? base : `${base}/`;
}

/** For page-origin blob workers that cannot call `browser.runtime.getURL`. */
export async function configureTransformersEnvForBase(
  ortWasmBase: string,
): Promise<void> {
  configured = false;
  await ensureTransformersEnv(ortWasmBase);
}

export { ORT_RESOURCE_DIR };
