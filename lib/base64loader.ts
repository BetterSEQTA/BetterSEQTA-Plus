import fs from "fs";
import mime from "mime-types";

/**
 * A Vite plugin designed to load files as base64 encoded data URLs.
 * This plugin intercepts module imports that have a `?base64` query parameter
 * appended to the file path. It then reads the targeted file, converts its content
 * to a base64 string, and constructs a data URL which is then exported as the
 * default export of a new JavaScript module.
 *
 * @example
 * // To use this loader, import a file with ?base64 query:
 * // import myImageBase64 from './path/to/myimage.png?base64';
 * // myImageBase64 will then be a string like "data:image/png;base64,..."
 */
export const base64Loader = {
  /**
   * The name of the Vite plugin.
   * @type {string}
   */
  name: "base64-loader",
  /**
   * The core transformation function of the Vite plugin.
   * It is called by Vite for modules that might need transformation. This function
   * checks if the module ID includes the `?base64` query. If so, it reads the
   * specified file, converts it to a base64 data URL, and returns a new
   * JavaScript module that default exports this data URL.
   *
   * @param {any} _ The original code of the file. This parameter is unused by this loader.
   * @param {string} id The ID of the module being transformed. This string typically
   *                    contains the absolute file path and any query parameters
   *                    (e.g., "/path/to/file.png?base64").
   * @returns {string | null} If the module ID does not contain `?base64` query,
   *                          it returns `null` to indicate no transformation.
   *                          Otherwise, it returns a string of JavaScript code
   *                          that default exports the base64 data URL of the file.
   *                          For example: `export default 'data:image/png;base64,xxxx';`
   */
  transform(_: any, id: string) {
    const [filePath, query] = id.split("?");
    if (query !== "base64") return null;

    const data = fs.readFileSync(filePath, { encoding: "base64" });
    const mimeType = mime.lookup(filePath);
    const dataURL = `data:${mimeType};base64,${data}`;

    return `export default '${dataURL}';`;
  },
};
