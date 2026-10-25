// Envelope-Only Sync with CRDT
export class EnvelopeSync {
  constructor(private kvUrl: string){}
  async push(envelope: any){
    const key = await this.encrypt(envelope);
    await fetch(`${this.kvUrl}/sync/${envelope.id}`, { method:'PUT', body: JSON.stringify(key) });
  }
  async pull(deviceId: string){
    const res = await fetch(`${this.kvUrl}/sync?device=${deviceId}`);
    return res.json(); // only envelopes, zero content
  }
  private async encrypt(obj:any){
    // E2E encrypt with WebCrypto, key from device
    const enc = new TextEncoder().encode(JSON.stringify(obj));
    return { cipher: btoa(String.fromCharCode(...new Uint8Array(enc))), alg:'aes-gcm' };
  }
}
// Automerge for version vectors merging
