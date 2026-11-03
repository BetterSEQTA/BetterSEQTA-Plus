type IconOptions = {
  class?: string;
  id?: string;
  size?: number | string;
  style?: string;
};

export function icon(svg: string, options: IconOptions = {}): string {
  const size = options.size ?? 24;
  let markup = svg
    .trim()
    .replace(/\swidth="24"/, ` width="${size}"`)
    .replace(/\sheight="24"/, ` height="${size}"`)
    .replace("<svg", '<svg aria-hidden="true"');
  if (options.class) markup = markup.replace('class="lucide', `class="${options.class} lucide`);
  if (options.id) markup = markup.replace("<svg", `<svg id="${options.id}"`);
  if (options.style) markup = markup.replace("<svg", `<svg style="${options.style}"`);
  return markup;
}
