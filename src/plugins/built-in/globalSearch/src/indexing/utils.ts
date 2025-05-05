export function htmlToPlainText(rawHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const { body } = doc;

  body
    .querySelectorAll("script,style,template,noscript,meta,link")
    .forEach((el) => el.remove());

  body.querySelectorAll(".forward").forEach((el) => {
    let n: ChildNode | null = el;
    while (n) {
      const next = n.nextSibling as ChildNode | null;
      n.remove();
      n = next;
    }
  });

  let text = body.innerText || "";

  text = text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[.\w#][^{]{0,100}\{[^}]*\}$/gm, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0 || line === "")
    .join("\n")
    .trim();

  return text;
}
