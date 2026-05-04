//! PDF text weight extraction (`/weight:\s*(\d+\.?\d*)/i` in assessments average).

use wasm_bindgen::prelude::*;

/// Returns the first `weight:` numeric capture, or `undefined` when absent.
#[wasm_bindgen(js_name = extractWeightFromPdfText)]
pub fn extract_weight_from_pdf_text(text: &str) -> Option<String> {
    let lower: Vec<u8> = text.bytes().map(|b| b.to_ascii_lowercase()).collect();
    let needle = b"weight:";
    let bytes = text.as_bytes();
    let mut i = 0usize;
    while i + needle.len() <= lower.len() {
        if lower[i..i + needle.len()] == needle[..] {
            let mut j = i + needle.len();
            while j < bytes.len() && bytes[j].is_ascii_whitespace() {
                j += 1;
            }
            let start = j;
            while j < bytes.len() && (bytes[j].is_ascii_digit() || bytes[j] == b'.') {
                j += 1;
            }
            if j > start {
                return Some(text[start..j].to_string());
            }
        }
        i += 1;
    }
    None
}
