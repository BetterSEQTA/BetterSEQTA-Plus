//! User-agent sniffing (`isFirefox` in assessments average).

use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = isFirefoxUserAgent)]
pub fn is_firefox_user_agent(user_agent: &str) -> bool {
    let u = user_agent.to_ascii_lowercase();
    u.contains("firefox") && !u.contains("seamonkey") && !u.contains("waterfox")
}
