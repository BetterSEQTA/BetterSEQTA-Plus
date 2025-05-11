import DOMPurify from "dompurify"; // Import DOMPurify for sanitizing HTML input

// Function to convert a string to HTML and optionally apply styles
export default function stringToHTML(str: string, styles = false) {
  const parser = new DOMParser(); // Create a new DOMParser instance

  // Sanitize the input string using DOMPurify to remove potentially harmful content
  str = DOMPurify.sanitize(str, {
    ADD_ATTR: ["onclick"], // Allow "onclick" attribute (usually for event handlers)
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|chrome-extension):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i, // Define allowed URI patterns
  });

  const doc = parser.parseFromString(str, "text/html"); // Parse the sanitized string into HTML

  // If styles are enabled, apply custom CSS styles to the body of the document
  if (styles) {
    doc.body.style.cssText =
      "height: auto; overflow: scroll; margin: 0px; background: var(--background-primary);"; // Set custom styles
  }

  return doc.body; // Return the body of the parsed HTML document
}
