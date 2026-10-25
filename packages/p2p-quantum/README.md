
# Foundry P2P Quantum-Resistant Sync

## Threat Model
- Adversary has quantum computer in 2030
- Cloud (CF KV) is honest-but-curious, sees only pseudoIds + ciphertexts
- No global key - each peer pair unique salt+guid

## Crypto Stack
- Key Exchange: ML-KEM-768 (NIST FIPS 203) - 1184B pub, 2400B priv, 1088B ct, 32B ss
- Data Encryption: ChaCha20Poly1305-256 (256-bit, Grover needs 2^128)
- Hash: BLAKE3 for pseudoId, HKDF-SHA256 for key derivation
- KDF Salt: Argon2id with per-device salt + device fingerprint
- Forward Secrecy: Double Ratchet - key per message

## Identity
guid = CSPRNG 32 bytes (never leaves)
salt = CSPRNG 16 bytes
pseudoId = BLAKE3(guid || salt || deviceFp || weekBucket) - rotated weekly
=> No email link, no tracking, no rainbow table due to salt+Argon2id

## Flow
1. Create identity: guid + salt -> pseudoId
2. Discover: KV_SYNC only has {docId, pseudoId} mapping, no content
3. Handshake: ML-KEM encapsulation via KV (ciphertext public)
4. P2P: WebRTC DataChannel direct, E2E ChaCha20Poly1305 encrypted blocks
5. Rotate pseudoId weekly

## Quantum Resistance
- ML-KEM-768: lattice-based, NIST says quantum resistant
- ChaCha20-256: Grover reduces 256-bit to 128-bit security - still safe
- No RSA/ECDH anywhere
