
use wasm_bindgen::prelude::*;
#[wasm_bindgen] pub struct FoundrySLM { ctx: usize }
#[wasm_bindgen] impl FoundrySLM {
  #[wasm_bindgen(constructor)] pub fn new() -> Self { Self { ctx: 4096 } }
  #[wasm_bindgen] pub async fn load(&mut self, _manifest: String) -> Result<(), JsValue> { Ok(()) }
  #[wasm_bindgen] pub async fn generate(&self, prompt: String, _ctx: JsValue) -> Result<String, JsValue> {
    Ok(format!("Local SLM answer for: {}", prompt))
  }
}
