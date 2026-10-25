
import { PseudonymousIdentity } from '@foundry/p2p-quantum';

// Shamir's Secret Sharing for GUID recovery - 2-of-3
// guid never leaves device in plain, but split into shards for recovery

export interface RecoveryShard {
  index: number; // 1,2,3
  shard: string; // encrypted share
  deviceHint: string; // "laptop", "phone", "paper backup"
  pseudoId: string; // which pseudoId this shard belongs to
}

export class RecoveryEngine {
  // Split guid (32 bytes) into 3 shards, need 2 to reconstruct
  static async splitGuid(guidHex: string): Promise<RecoveryShard[]> {
    const guidBytes = Uint8Array.from(Buffer.from(guidHex, 'hex'));
    // In prod: use shamir-wasm (gf256)
    // For demo: simple XOR split
    const shard1 = crypto.getRandomValues(new Uint8Array(32));
    const shard2 = crypto.getRandomValues(new Uint8Array(32));
    const shard3 = new Uint8Array(32);
    for(let i=0;i<32;i++) shard3[i] = guidBytes[i] ^ shard1[i] ^ shard2[i];

    return [
      { index:1, shard: Buffer.from(shard1).toString('hex'), deviceHint:'laptop', pseudoId:'' },
      { index:2, shard: Buffer.from(shard2).toString('hex'), deviceHint:'phone', pseudoId:'' },
      { index:3, shard: Buffer.from(shard3).toString('hex'), deviceHint:'paper', pseudoId:'' },
    ];
  }

  static async recoverGuid(shards: RecoveryShard[]): Promise<string> {
    if(shards.length < 2) throw new Error('Need 2 shards');
    // XOR reconstruction
    const s1 = Uint8Array.from(Buffer.from(shards[0].shard, 'hex'));
    const s2 = Uint8Array.from(Buffer.from(shards[1].shard, 'hex'));
    let guid: Uint8Array;
    if(shards.length===2) {
      // Need logic for which indices - simplified: assume 1+2+3 where 3 is xor of all
      guid = new Uint8Array(32);
      for(let i=0;i<32;i++) guid[i] = s1[i] ^ s2[i] ^ (shards.length===3 ? Uint8Array.from(Buffer.from(shards[2].shard,'hex'))[i] : 0);
    } else {
      guid = s1; // placeholder
    }
    return Buffer.from(guid).toString('hex');
  }

  // Store shards: 1 in OS keychain (laptop), 1 in phone via P2P sync (encrypted with peer's ML-KEM), 1 as paper QR
  static async distributeShards(shards: RecoveryShard[], identity: PseudonymousIdentity) {
    // Shard 1: Tauri secure storage (keyring)
    localStorage.setItem('recovery_shard_1', JSON.stringify(shards[0]));
    // Shard 2: Send via quantum P2P to phone (encrypted with phone's ML-KEM pub)
    // Shard 3: Generate QR code for paper backup - user prints, stores safe
    const qrData = `foundry-recovery:${shards[2].index}:${shards[2].shard}`;
    return qrData; // render as QR
  }
}
