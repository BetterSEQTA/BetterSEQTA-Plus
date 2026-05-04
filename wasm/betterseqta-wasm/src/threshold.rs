//! `GetThresholdOfColor` luminance distance (`sqrt(r²+g²+b²)`), including gradients.

use regex::Regex;
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

fn rgba_capture_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)rgba?\(([^)]+)\)").expect("regex"))
}

fn parse_js_int_channel(s: &str) -> f64 {
    s.trim().parse::<f64>().ok().map(|n| n.trunc()).unwrap_or(0.0)
}

fn threshold_from_rgb_triplet(r: f64, g: f64, b: f64) -> f64 {
    (r * r + g * g + b * b).sqrt()
}

fn gradient_average_threshold(color: &str) -> Option<f64> {
    let re = rgba_capture_regex();
    let mut sums = Vec::new();
    for cap in re.captures_iter(color) {
        let inner = cap.get(1)?.as_str();
        let parts: Vec<&str> = inner.split(',').collect();
        if parts.len() < 3 {
            continue;
        }
        let r = parse_js_int_channel(parts[0]);
        let g = parse_js_int_channel(parts[1]);
        let b = parse_js_int_channel(parts[2]);
        sums.push(threshold_from_rgb_triplet(r, g, b));
    }
    if sums.is_empty() {
        None
    } else {
        Some(sums.iter().sum::<f64>() / sums.len() as f64)
    }
}

/// Returns `sqrt(r²+g²+b²)` for a CSS color string, or **`-1`** when the Rust path
/// cannot match the JS `color` package (caller should fall back to TypeScript).
#[wasm_bindgen(js_name = colorCssThresholdDistance)]
pub fn color_css_threshold_distance(color: &str) -> f64 {
    let color = color.trim();
    if color.is_empty() {
        return 0.0;
    }
    if color.contains("gradient") {
        return gradient_average_threshold(color).unwrap_or(-1.0);
    }
    match csscolorparser::parse(color) {
        Ok(c) => {
            let rgba = c.to_rgba8();
            let r = f64::from(rgba[0]);
            let g = f64::from(rgba[1]);
            let b = f64::from(rgba[2]);
            threshold_from_rgb_triplet(r, g, b)
        }
        Err(_) => -1.0,
    }
}
