
# Missing Critical Pieces - Now Implemented

## 1. Recovery - Shamir 2-of-3
- guid split into 3 shards via Shamir (gf256)
- Shard1: OS keychain (laptop)
- Shard2: Phone via quantum P2P (encrypted with phone's ML-KEM pub)
- Shard3: Paper QR backup
- Need 2 to recover guid + second brain
- Flow: Device lost -> scan QR + phone shard -> reconstruct guid

## 2. CRDT Merge
- FoundryCRDT: lamport timestamps + deviceId + tombstones
- Offline edits on laptop + phone -> both create blocks with lamport
- When online, P2P sync exchanges changed blocks + version vectors (encrypted)
- Merge: LWW + deviceId tie-breaker, concurrent edits flagged as conflicts for human validation
- Time travel: history per lamport

## 3. Skill Trust
- SkillPackage: wasmHash (blake3), signature (Sigstore cosign), publisher pseudoId, permissions, transparencyLog (Rekor)
- Verify: hash check + Sigstore signature + Rekor log + permission check (no network/fs)
- Execute: WASM sandbox via wasmtime with fuel limit, only foundry_read/write_block imports
- Revocation: revokedHashes set, checked before load
- Prevents malicious LoRA exfiltrating content

All 3 added to packages/
