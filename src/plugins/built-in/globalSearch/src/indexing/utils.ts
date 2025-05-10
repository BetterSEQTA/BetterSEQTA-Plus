export function htmlToPlainText(rawHtml: string): string {
  const parser = new DOMParser(); // Create a new DOMParser instance to parse HTML strings
  const doc = parser.parseFromString(rawHtml, "text/html"); // Parse the raw HTML string into a document
  const { body } = doc; // Destructure the body element from the parsed document

  // Remove unwanted elements such as scripts, styles, templates, and metadata
  body
    .querySelectorAll("script,style,template,noscript,meta,link")
    .forEach((el) => el.remove());

  // Remove elements with class 'forward' and all their siblings
  body.querySelectorAll(".forward").forEach((el) => {
    let n: ChildNode | null = el;
    while (n) {
      const next = n.nextSibling as ChildNode | null; // Store reference to the next sibling
      n.remove(); // Remove current node
      n = next; // Move to the next sibling
    }
  });

  let text = body.innerText || ""; // Extract visible text content from the body

  // Normalize and clean up the extracted text
  text = text
    .replace(/\u00A0/g, " ") // Replace non-breaking spaces with regular spaces
    .replace(/[ \t]{2,}/g, " ") // Replace multiple spaces/tabs with a single space
    .replace(/\r\n|\r/g, "\n") // Normalize line breaks to '\n'
    .replace(/\n{3,}/g, "\n\n") // Collapse multiple consecutive newlines to two
    .replace(/^[.\w#][^{]{0,100}\{[^}]*\}$/gm, "") // Remove CSS rule-like lines
    .split("\n") // Split text into lines
    .map((line) => line.trimEnd()) // Trim trailing whitespace from each line
    .filter((line) => line.trim().length > 0 || line === "") // Remove lines that are only whitespace
    .join("\n") // Join lines back into a single string
    .trim(); // Trim leading/trailing whitespace from the entire text

  return text; // Return the cleaned plain text
}
