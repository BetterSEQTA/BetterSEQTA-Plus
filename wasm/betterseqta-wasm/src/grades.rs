//! Grade parsing (`parseGrade` in `assessmentsAverage/utils.ts`).

use wasm_bindgen::prelude::*;

fn letter_grade_percent(s: &str) -> Option<f64> {
    Some(match s {
        "A+" => 100.0,
        "A" => 95.0,
        "A-" => 90.0,
        "B+" => 85.0,
        "B" => 80.0,
        "B-" => 75.0,
        "C+" => 70.0,
        "C" => 65.0,
        "C-" => 60.0,
        "D+" => 55.0,
        "D" => 50.0,
        "D-" => 45.0,
        "E+" => 40.0,
        "E" => 35.0,
        "E-" => 30.0,
        "F" => 0.0,
        _ => return None,
    })
}

/// Mirrors `parseGrade` (numeric percent 0–100).
#[wasm_bindgen(js_name = parseGradeToPercent)]
pub fn parse_grade_to_percent(text: &str) -> f64 {
    let str = text.trim().to_ascii_uppercase();
    if str.contains('/') {
        let mut parts = str.split('/');
        let raw = parts.next().and_then(|p| p.parse::<f64>().ok());
        let max = parts.next().and_then(|p| p.parse::<f64>().ok());
        if let (Some(r), Some(m)) = (raw, max) {
            if m != 0.0 {
                return (r / m) * 100.0;
            }
        }
        return 0.0;
    }
    if str.contains('%') {
        return str.replace('%', "").parse::<f64>().unwrap_or(0.0);
    }
    letter_grade_percent(&str).unwrap_or(0.0)
}
