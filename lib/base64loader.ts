import fs from "node:fs";
import mime from "mime-types";

export const base64Loader = {
  name: "base64-loader",
  transform(_sourceCode: string, id: string) {
    void _sourceCode;
    const [filePath, query] = id.split("?");
    if (query !== "base64") return null;

    const data = fs.readFileSync(filePath, { encoding: "base64" });
    const mimeType = mime.lookup(filePath);
    const dataURL = `data:${mimeType};base64,${data}`;

    return `export default '${dataURL}';`;
  },
};
