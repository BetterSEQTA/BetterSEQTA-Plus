//! `#?page=/courses/...` and `#?page=/assessments/...` programme:metaclass parsing
//! (mirrors `parsePageContext` in `adaptiveThemeColour.ts`).

use regex::Regex;
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

fn page_ctx_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"[?&]page=/(courses|assessments)/(?:[^/]+/)?(\d+):(\d+)")
            .expect("page context regex")
    })
}

/// JSON `{"programme":n,"metaclass":m}` or `undefined` when the hash does not match.
#[wasm_bindgen(js_name = parseSeqtaCoursesAssessmentsPageJson)]
pub fn parse_seqta_courses_assessments_page_json(hash: &str) -> Option<String> {
    let cap = page_ctx_regex().captures(hash)?;
    let programme: i32 = cap.get(2)?.as_str().parse().ok()?;
    let metaclass: i32 = cap.get(3)?.as_str().parse().ok()?;
    if programme < 0 || metaclass < 0 {
        return None;
    }
    Some(format!(
        r#"{{"programme":{programme},"metaclass":{metaclass}}}"#
    ))
}
