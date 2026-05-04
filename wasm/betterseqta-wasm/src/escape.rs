//! String escaping for injected scripts (PDF / Firefox workarounds).

use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = escapeJsSingleQuotedString)]
pub fn escape_js_single_quoted_string(s: &str) -> String {
    s.replace('\\', "\\\\").replace('\'', "\\'")
}

/// `escJsSingleQuoted` plus double-quote escapes (used for some injected literals).
#[wasm_bindgen(js_name = escapeJsForInlineScript)]
pub fn escape_js_for_inline_script(s: &str) -> String {
    escape_js_single_quoted_string(s)
        .replace('"', "\\\"")
}
