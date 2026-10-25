export type BlockType = 'text'|'table'|'chart'|'image'|'form'|'sheet'|'slide';
export interface CanonicalBlock {
  id: string;
  type: BlockType;
  content: { text?: string; rows?: any[][]; src?: string; };
  style: { bbox: [number,number,number,number]; font?: string; };
  provenance: { file: string; page: number; confidence: number };
  embedding?: Float32Array;
}
export interface Envelope {
  id: string;
  hash: string;
  metadata: { title: string; mime: string; size: number; deviceId: string; createdAt: string };
  permissions: { owner: string; acl: string[] };
  versionVector: Record<string, number>;
}
export interface CanonicalDocument {
  envelope: Envelope;
  blocks: CanonicalBlock[];
}
export const toEnvelope = (doc: CanonicalDocument): Envelope => doc.envelope;
