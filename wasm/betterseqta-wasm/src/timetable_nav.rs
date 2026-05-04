//! Timetable URL/hash checks.

use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = locationHashIncludesTimetablePage)]
pub fn location_hash_includes_timetable_page(location_hash: &str) -> bool {
    location_hash.contains("page=/timetable")
}
