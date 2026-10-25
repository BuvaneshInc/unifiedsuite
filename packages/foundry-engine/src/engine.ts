import { CanonicalDocument, Envelope } from '@foundry/canonical-model';
import { LocalVectorDB } from './vectordb';
import { LocalSLM } from './slm';
import { OCRWasm } from './ocr';
import { LayoutParser } from './layout';

export class FoundryAITS {
  private db = new LocalVectorDB();
  private slm = new LocalSLM();
  private ocr = new OCRWasm();
  private layout = new LayoutParser();

  async ingest(file: File): Promise<CanonicalDocument> {
    const ocrBlocks = await this.ocr.extract(file); // PaddleOCR WASM
    const structured = await this.layout.parse(ocrBlocks); // LayoutLMv3 ONNX
    const doc: CanonicalDocument = {
      envelope: {
        id: crypto.randomUUID(),
        hash: await this.sha256(file),
        metadata: { title: file.name, mime: file.type, size: file.size, deviceId: this.deviceId, createdAt: new Date().toISOString() },
        permissions: { owner: 'me', acl: [] },
        versionVector: { [this.deviceId]: 1 }
      },
      blocks: structured.map((b,i)=>({ id: String(i), ...b }))
    };
    await this.db.index(doc);
    return doc;
  }

  async chat(doc: CanonicalDocument, prompt: string) {
    const ctx = await this.db.search(prompt, doc.envelope.id, 8);
    return this.slm.generate({ prompt, context: ctx, maxTokens: 1024 });
  }

  getEnvelope(doc: CanonicalDocument): Envelope {
    return doc.envelope; // ONLY this leaves device
  }

  private deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
  private async sha256(f: File){ const buf=await f.arrayBuffer(); const h=await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
}
