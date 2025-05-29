import DOMPurify from "dompurify";

/**
 * Converts an HTML string into a DOM element, with sanitization and optional styling.
 *
 * This function first sanitizes the input HTML string using DOMPurify to prevent XSS attacks.
 * The sanitization process allows 'onclick' attributes and specific URI schemes.
 * Then, it parses the sanitized string into an HTML document and returns its body.
 * Optionally, it can apply predefined CSS styles to the body element.
 *
 * @param {string} str The HTML string to convert.
 * @param {boolean} [styles=false] Whether to apply predefined styles to the document body.
 * @returns {HTMLElement} The body element of the parsed and sanitized HTML document.
 */
export default function stringToHTML(str: string, styles = false) {
  const parser = new DOMParser();

  str = DOMPurify.sanitize(str, {
    ADD_ATTR: ["onclick"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|chrome-extension):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });

  const doc = parser.parseFromString(str, "text/html");

  if (styles) {
    doc.body.style.cssText =
      "height: auto; overflow: scroll; margin: 0px; background: var(--background-primary);";
  }

  return doc.body;
}
