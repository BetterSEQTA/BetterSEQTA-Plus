//! Subject timetable colour hex validation (`getAdaptiveColour` in `adaptiveThemeColour.ts`).

use regex::Regex;
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

fn re_hash_shorthand_or_full() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)^#([0-9a-f]{3}|[0-9a-f]{6})$").expect("hex # regex"))
}

fn re_plain_six() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)^[0-9a-f]{6}$").expect("hex6 regex"))
}

/// Returns `#rgb` / `#rrggbb` unchanged, or adds `#` to a bare 6-digit hex; otherwise `undefined`.
#[wasm_bindgen(js_name = normalizeSeqtaSubjectHexColour)]
pub fn normalize_seqta_subject_hex_colour(colour: &str) -> Option<String> {
    let c = colour.trim();
    if re_hash_shorthand_or_full().is_match(c) {
        return Some(c.to_string());
    }
    if re_plain_six().is_match(c) {
        return Some(format!("#{c}"));
    }
    None
}
