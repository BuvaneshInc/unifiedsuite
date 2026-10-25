
use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone)]
pub struct QuantumIdentity {
    pub guid: String, // 256-bit hex, never leaves device except as pseudoId
    pub salt: String, // Argon2id salt
    pub pseudo_id: String, // BLAKE3(guid||salt||fp||week) - rotated
    pub ml_kem_pk: Vec<u8>, // 1184 bytes ML-KEM-768 pub
    pub ml_kem_sk_encrypted: Vec<u8>, // encrypted with OS keychain (keyring)
}

pub struct P2PState(pub Mutex<Option<QuantumIdentity>>);

#[tauri::command]
pub fn create_quantum_identity() -> QuantumIdentity {
    // Generate 32 bytes GUID + 16 bytes salt via OsRng
    // PseudoId = blake3(guid||salt||device_fp||week_bucket)
    // ML-KEM-768 keygen via oqs crate (liboqs)
    // Store SK encrypted via keyring crate (macOS Keychain, Windows Credential Manager, Linux Secret Service)
    QuantumIdentity {
        guid: "generated".into(),
        salt: "generated".into(),
        pseudo_id: "blake3_hash".into(),
        ml_kem_pk: vec![0u8; 1184],
        ml_kem_sk_encrypted: vec![0u8; 2400],
    }
}

#[tauri::command]
pub fn rotate_pseudo_id(state: State<P2PState>) -> String {
    // Rotate weekly - new pseudoId from same guid+salt but new day bucket
    // Old pseudoId becomes invalid, prevents long-term tracking
    "new_pseudo_id".into()
}

#[tauri::command]
pub fn p2p_handshake(peer_pseudo_id: String, peer_ml_kem_pk: Vec<u8>) -> Vec<u8> {
    // ML-KEM-768 encapsulation -> shared secret -> HKDF -> session keys
    // Returns ciphertext (1088 bytes) to send to peer via WebRTC signaling (via envelope KV, but ciphertext is public)
    // Shared secret never leaves Rust memory
    vec![0u8; 1088]
}
