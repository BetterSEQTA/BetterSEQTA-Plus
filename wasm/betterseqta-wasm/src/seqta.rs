//! SEQTA page / title detection strings.

use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = childTextHasSeqtaCopyright)]
pub fn child_text_has_seqta_copyright(text: &str) -> bool {
    text.contains("Copyright (c) SEQTA Software")
}

#[wasm_bindgen(js_name = titleIsSeqtaLearnOrEngage)]
pub fn title_is_seqta_learn_or_engage(title: &str) -> bool {
    title.contains("SEQTA Learn") || title.contains("SEQTA Engage")
}

#[wasm_bindgen(js_name = titleIsSeqtaEngage)]
pub fn title_is_seqta_engage_only(title: &str) -> bool {
    title.contains("SEQTA Engage")
}
