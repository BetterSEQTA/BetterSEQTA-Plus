//! BetterSEQTA+ WebAssembly module (wasm-bindgen).
//! Pure helpers mirrored from the TypeScript extension.

mod base64_api;
mod engage;
mod escape;
mod grades;
mod hex_colour;
mod page_context;
mod pdf_weight;
mod seqta;
mod threshold;
mod time_format;
mod timetable_nav;
mod user_agent;

pub use base64_api::{
    decode_base64, encode_base64, encode_data_url, strip_data_url_base64_payload,
};
pub use engage::parse_engage_route_page;
pub use escape::{escape_js_for_inline_script, escape_js_single_quoted_string};
pub use grades::parse_grade_to_percent;
pub use hex_colour::normalize_seqta_subject_hex_colour;
pub use page_context::parse_seqta_courses_assessments_page_json;
pub use pdf_weight::extract_weight_from_pdf_text;
pub use seqta::{
    child_text_has_seqta_copyright, title_is_seqta_engage_only, title_is_seqta_learn_or_engage,
};
pub use threshold::color_css_threshold_distance;
pub use time_format::{
    convert_to_12_hour_format, format_timetable_time_label, format_timetable_time_range,
};
pub use timetable_nav::location_hash_includes_timetable_page;
pub use user_agent::is_firefox_user_agent;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = extensionWasmVersion)]
pub fn extension_wasm_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn twelve_hour_matches_ts_examples() {
        assert_eq!(convert_to_12_hour_format("13:05", false), "1:05pm");
        assert_eq!(convert_to_12_hour_format("0:30", false), "12:30am");
        assert_eq!(convert_to_12_hour_format("12:00", false), "12:00pm");
        assert_eq!(convert_to_12_hour_format("12:00", true), "12pm");
    }

    #[test]
    fn seqta_strings() {
        assert!(child_text_has_seqta_copyright(
            "foo Copyright (c) SEQTA Software bar"
        ));
        assert!(!child_text_has_seqta_copyright("other"));
        assert!(title_is_seqta_learn_or_engage("SEQTA Learn — Home"));
        assert!(title_is_seqta_engage_only("SEQTA Engage"));
        assert!(!title_is_seqta_engage_only("SEQTA Learn"));
    }

    #[test]
    fn engage_routes() {
        assert_eq!(
            parse_engage_route_page("#?page=/home/extra", "https://x.example/a/b/c/d/e"),
            Some("home".into())
        );
        assert_eq!(
            parse_engage_route_page("#?page=%2Fhome%2Fextra", "https://x.example/a/b/c/d/e"),
            Some("home".into())
        );
        assert_eq!(
            parse_engage_route_page("", "a/b/c/d/home/extra"),
            Some("home".into())
        );
    }

    #[test]
    fn grades_and_weight() {
        assert_eq!(parse_grade_to_percent("  12/20 "), 60.0);
        assert_eq!(parse_grade_to_percent("85%"), 85.0);
        assert_eq!(parse_grade_to_percent("A-"), 90.0);
        assert_eq!(
            extract_weight_from_pdf_text("foo Weight: 12.5 bar").as_deref(),
            Some("12.5")
        );
    }

    #[test]
    fn firefox_ua() {
        assert!(is_firefox_user_agent(
            "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0"
        ));
        assert!(!is_firefox_user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0"
        ));
    }

    #[test]
    fn timetable_hash() {
        assert!(location_hash_includes_timetable_page("#?page=/timetable"));
        assert!(!location_hash_includes_timetable_page("#?page=/home"));
    }

    #[test]
    fn page_context_json() {
        let j = parse_seqta_courses_assessments_page_json(
            "#?page=/courses/2023S/4804:11066",
        )
        .expect("json");
        assert!(j.contains("\"programme\":4804"));
        assert!(j.contains("\"metaclass\":11066"));
        let j2 = parse_seqta_courses_assessments_page_json("#?page=/courses/4804:11066")
            .expect("json2");
        assert!(j2.contains("4804"));
    }

    #[test]
    fn hex_subject_colour() {
        assert_eq!(
            normalize_seqta_subject_hex_colour("#aBc").as_deref(),
            Some("#aBc")
        );
        assert_eq!(
            normalize_seqta_subject_hex_colour("aabbcc").as_deref(),
            Some("#aabbcc")
        );
        assert!(normalize_seqta_subject_hex_colour("gggggg").is_none());
    }

    #[test]
    fn threshold_basic() {
        let t = color_css_threshold_distance("rgb(3,4,5)");
        assert!((t - (3f64 * 3.0 + 4.0 * 4.0 + 5.0 * 5.0).sqrt()).abs() < 1e-6);
    }
}
