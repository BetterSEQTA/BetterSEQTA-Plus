import DOMPurify from 'dompurify';

export default function stringToHTML(str: string, styles = false) {
  const parser = new DOMParser();


  str = DOMPurify.sanitize(str, {
    ADD_ATTR: ['onclick'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|chrome-extension):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });

  const doc = parser.parseFromString(str, 'text/html');

  if (styles) {
    doc.body.style.cssText =
      'height: auto; overflow: scroll; margin: 0px; background: var(--background-primary);';
  }

  return doc.body;
}