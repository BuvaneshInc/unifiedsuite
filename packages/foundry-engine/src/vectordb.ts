// SQLite + sqlite-vec on Tauri, IndexedDB + WASM vec on web
export class LocalVectorDB {
  async index(doc: any){ /* lancedb insert */ }
  async search(q: string, docId: string, k: number){ return []; }
}
