// Rust backend - true endpoint heavy
use tauri::Manager;

#[tauri::command]
fn ingest_file(path: String) -> String {
    // Rust does: PaddleOCR via ONNX, Layout parsing, SHA256, SQLite insert
    // Zero network, content stays here
    format!("ingested {}", path)
}

#[tauri::command]
fn chat_local(doc_id: String, prompt: String) -> String {
    // ONNX SLM inference in Rust - fastest path
    format!("local answer for {} : {}", doc_id, prompt)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ingest_file, chat_local])
        .run(tauri::generate_context!())
        .expect("failed to run tauri");
}
