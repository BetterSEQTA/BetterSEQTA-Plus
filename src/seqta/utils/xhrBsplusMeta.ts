/** Patched onto XHR instances by global-search passive indexing. */
export type XhrWithBsplusMeta = XMLHttpRequest & {
  __bsplusUrl?: string;
  __bsplusMethod?: string;
};

export function asXhrWithBsplusMeta(xhr: XMLHttpRequest): XhrWithBsplusMeta {
  return xhr as XhrWithBsplusMeta;
}
