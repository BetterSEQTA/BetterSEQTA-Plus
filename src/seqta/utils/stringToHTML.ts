import DOMPurify from 'dompurify';

export default function stringToHTML(str: string, styles = false) {
  var parser = new DOMParser();
  str = DOMPurify.sanitize(str, { ADD_ATTR: ['onclick'] });
  var doc = parser.parseFromString(str, 'text/html');
  if (styles) {
    doc.body.style.cssText =
      'height: auto; overflow: scroll; margin: 0px; background: var(--background-primary);';
  }
  return doc.body;
}