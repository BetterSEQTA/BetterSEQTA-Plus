//! 12-hour timetable formatting (mirrors TS helpers around `convertTo12HourFormat`).

use wasm_bindgen::prelude::*;

/// Mirrors JavaScript `Number(s.trim())` for a single split segment, including `"" -> 0`.
fn js_number_from_split_segment(part: Option<&str>) -> f64 {
    let s = part.unwrap_or("");
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return 0.0;
    }
    trimmed.parse::<f64>().unwrap_or(f64::NAN)
}

/// Mirrors `n.toString()` for timetable paths.
fn js_number_to_string(n: f64) -> String {
    if n.is_nan() {
        return "NaN".to_string();
    }
    if n == 0.0 && n.is_sign_negative() {
        return "0".to_string();
    }
    if (n - n.round()).abs() < f64::EPSILON {
        format!("{}", n as i64)
    } else {
        format!("{n}")
    }
}

/// 1:1 with `convertTo12HourFormat` in `src/seqta/utils/convertTo12HourFormat.ts`.
#[wasm_bindgen(js_name = convertTo12HourFormat)]
pub fn convert_to_12_hour_format(time: &str, no_minutes: bool) -> String {
    let parts: Vec<&str> = time.split(':').collect();
    let mut hours = js_number_from_split_segment(parts.first().copied());
    let minutes = js_number_from_split_segment(parts.get(1).copied());

    let mut period = "am";
    if hours >= 12.0 {
        period = "pm";
        if hours > 12.0 {
            hours -= 12.0;
        }
    } else if hours == 0.0 {
        hours = 12.0;
    }

    let mut hours_str = js_number_to_string(hours);
    if hours_str.len() == 2 && hours_str.starts_with('0') {
        hours_str = hours_str[1..].to_string();
    }

    let minute_part = if no_minutes {
        String::new()
    } else {
        let m = js_number_to_string(minutes);
        let m = if m.len() >= 2 { m } else { format!("0{m}") };
        format!(":{m}")
    };

    format!("{hours_str}{minute_part}{period}")
}

/// `convertTo12HourFormat(...).toLowerCase().replace(" ", "")` from `updateTimetableTimes.ts`.
#[wasm_bindgen(js_name = formatTimetableTimeLabel)]
pub fn format_timetable_time_label(time: &str, no_minutes: bool) -> String {
    convert_to_12_hour_format(time, no_minutes)
        .to_lowercase()
        .replace(' ', "")
}

/// Formats a `start–end` / `start-end` range label for timetable rows.
#[wasm_bindgen(js_name = formatTimetableTimeRange)]
pub fn format_timetable_time_range(original: &str) -> Option<String> {
    let mut parts = original
        .split(|c| c == '-' || c == '\u{2013}')
        .map(str::trim)
        .filter(|p| !p.is_empty());
    let start = parts.next()?;
    let end = parts.next()?;
    let start12 = format_timetable_time_label(start, false);
    let end12 = format_timetable_time_label(end, false);
    Some(format!("{start12}\u{2013}{end12}"))
}
