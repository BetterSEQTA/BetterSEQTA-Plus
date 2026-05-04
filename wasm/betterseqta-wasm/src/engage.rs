//! Engage hash routing (`getEngageRoutePage`).

use percent_encoding::percent_decode_str;
use std::borrow::Cow;
use wasm_bindgen::prelude::*;

/// Mirrors `getEngageRoutePage` using `window.location.hash` and `window.location.href` inputs.
#[wasm_bindgen(js_name = parseEngageRoutePage)]
pub fn parse_engage_route_page(hash: &str, full_href: &str) -> Option<String> {
    let hash = hash.strip_prefix('#').unwrap_or(hash);
    if !hash.is_empty() {
        let qs: Cow<'_, str> = if hash.starts_with('?') {
            Cow::Borrowed(hash)
        } else {
            Cow::Owned(format!("?{hash}"))
        };
        if let Some(seg) = parse_page_segment_from_query_string(qs.as_ref()) {
            return Some(seg);
        }
    }
    segment_from_href_split(full_href)
}

fn parse_page_segment_from_query_string(qs: &str) -> Option<String> {
    let body = qs.strip_prefix('?').unwrap_or(qs);
    for pair in body.split('&') {
        let mut it = pair.splitn(2, '=');
        let key = it.next()?;
        if key != "page" {
            continue;
        }
        let enc = it.next().unwrap_or("");
        let decoded = percent_decode_str(enc).decode_utf8_lossy();
        let page = decoded.as_ref();
        if let Some(rest) = page.strip_prefix('/') {
            let seg = rest.split('/').next().unwrap_or("");
            if !seg.is_empty() {
                return Some(seg.to_string());
            }
            return None;
        }
    }
    None
}

fn segment_from_href_split(full_href: &str) -> Option<String> {
    full_href.split('/').nth(4).map(std::string::ToString::to_string)
}
