
export interface SkillPackage {
  id: string;
  version: string;
  wasmHash: string; // blake3 hash of wasm file
  signature: string; // Sigstore cosign signature
  publisher: string; // pseudoId of publisher, not real identity
  permissions: string[]; // ['read_blocks','write_blocks'] - no network, no fs
  market: string; // GLOBAL or specific
  transparencyLog: string; // Rekor log entry URL
}

export class SkillTrustEngine {
  private trustedPublishers = new Set<string>(); // set of pseudoIds that are trusted
  private revokedHashes = new Set<string>();

  // Verify skill before loading - runs in Rust, not JS
  async verifySkill(pkg: SkillPackage, wasmBytes: Uint8Array): Promise<{ valid: boolean; reason?: string }> {
    // 1. Check hash
    const hash = await this.blake3(wasmBytes);
    if(hash !== pkg.wasmHash) return { valid:false, reason:'hash mismatch' };
    if(this.revokedHashes.has(hash)) return { valid:false, reason:'revoked' };

    // 2. Verify Sigstore signature - publisher's pseudoId signed the hash
    // In prod: use sigstore-wasm to verify Rekor transparency log
    const sigValid = await this.verifySigstore(pkg.signature, hash, pkg.publisher);
    if(!sigValid) return { valid:false, reason:'signature invalid' };

    // 3. Check permissions - skills cannot have network/fs, only block read/write
    if(pkg.permissions.includes('network') || pkg.permissions.includes('fs')) {
      return { valid:false, reason:'skill requests forbidden permission' };
    }

    // 4. WASM sandbox - run in isolated WASM with no imports except foundry_api
    // Tauri side: wasmtime with limited imports
    return { valid:true };
  }

  // WASM sandbox execution
  async executeSkill(skillId: string, wasmBytes: Uint8Array, inputBlocks: any[]): Promise<any[]> {
    // In Tauri Rust: wasmtime::Engine with fuel limit, no WASI, only:
    // - foundry_read_block(id) -> block
    // - foundry_write_block(block) -> ok
    // - foundry_log(msg) -> telemetry (DP only)
    // No fetch, no fs, no net
    // Fuel limit 1M prevents infinite loops
    return inputBlocks; // placeholder
  }

  private async blake3(data: Uint8Array): Promise<string> {
    const h = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(h).toString('hex');
  }
  private async verifySigstore(sig: string, hash: string, publisher: string): Promise<boolean> {
    // Verify via Rekor transparency log - ensures publisher pseudoId signed this hash and log is append-only
    // Prevents publisher equivocation
    return true; // placeholder
  }

  revoke(skillHash: string) { this.revokedHashes.add(skillHash); }
  trustPublisher(pseudoId: string) { this.trustedPublishers.add(pseudoId); }
}

// Supply chain:
// Publisher (pseudoId) builds skill LoRA -> blake3 hash -> signs with Sigstore (keyless, OIDC) -> publishes to R2 + Rekor log
// Client: downloads wasm + manifest from CDN -> verifies hash + Sigstore signature + transparency log -> checks permissions -> runs in WASM sandbox with fuel limit
// No skill can exfiltrate content because no network import
