
use wasm_bindgen::prelude::*;
#[wasm_bindgen] pub struct OcrEngine {}
#[wasm_bindgen] impl OcrEngine {
  #[wasm_bindgen(constructor)] pub fn new() -> Self { Self {} }
  #[wasm_bindgen] pub async fn init(&mut self, _url: String) -> Result<(), JsValue> { Ok(()) }
  #[wasm_bindgen] pub fn detect(&self, _bytes: &[u8]) -> JsValue {
    serde_wasm_bindgen::to_value(&serde_json::json!([{"bbox":[0,0,100,20],"text":"Invoice #123","conf":0.98}])).unwrap()
  }
}
#[wasm_bindgen] pub fn get_ocr_models() -> JsValue {
  serde_wasm_bindgen::to_value(&serde_json::json!({
    "det":"/models/ocr/det_q4.onnx","rec":"/models/ocr/rec_q4.onnx","size_mb":8
  })).unwrap()
}
