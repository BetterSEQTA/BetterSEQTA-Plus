//! Base64 and data-URL helpers.

use base64::Engine;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = encodeBase64)]
pub fn encode_base64(bytes: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

#[wasm_bindgen(js_name = decodeBase64)]
pub fn decode_base64(b64: &str) -> Vec<u8> {
    base64::engine::general_purpose::STANDARD
        .decode(b64.trim())
        .unwrap_or_default()
}

/// `data:{mime};base64,{payload}` (mirrors `readAsDataURL` output shape).
#[wasm_bindgen(js_name = encodeDataUrl)]
pub fn encode_data_url(mime: &str, bytes: &[u8]) -> String {
    let mime = mime.trim();
    let mime = if mime.is_empty() {
        "application/octet-stream"
    } else {
        mime
    };
    format!(
        "data:{};base64,{}",
        mime,
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )
}

/// Strips a leading `data:*;base64,` prefix; returns the original string when no prefix matches.
#[wasm_bindgen(js_name = stripDataUrlBase64Payload)]
pub fn strip_data_url_base64_payload(s: &str) -> String {
    let Some(rest) = s.strip_prefix("data:") else {
        return s.to_string();
    };
    let Some(i) = rest.find(";base64,") else {
        return s.to_string();
    };
    let after = &rest[i + ";base64,".len()..];
    after.to_string()
}
