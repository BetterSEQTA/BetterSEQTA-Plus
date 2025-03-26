import { Plugin } from "vite";

export default function shadowDom(): Plugin {
  return {
    name: 'merge-css-shadow-dom',
    enforce: 'post',
    apply: 'serve',
    transform(src, id) {
      if (/\.(css).*$/.test(id)) {
        const fn =
          "import { updateStyle, removeStyle } from '@/shadowDomUtils.ts';\n";
        let updatedSrc = fn + src;
        updatedSrc = updatedSrc.replace(
          '__vite__updateStyle(',
          'updateStyle(',
        );
        updatedSrc = updatedSrc.replace(
          '__vite__removeStyle(',
          'removeStyle(',
        );
        return {
          code: updatedSrc,
        };
      }
    }
  }
}