
// Signaling via envelope KV - quantum-safe, no content
// Flow: Device A wants doc from Device B
// 1. A writes to KV_SYNC: {type: 'p2p_offer', fromPseudo: A_pseudo, toPseudo: B_pseudo, mlkem_ciphertext, webrtc_offer}
// 2. B polls KV_SYNC for messages to its pseudoId, reads offer
// 3. B does ML-KEM decapsulation, derives shared secret, replies with answer via KV
// 4. Both establish direct WebRTC DataChannel, then content syncs P2P encrypted
// 5. KV messages auto-expire in 5 mins, contain only ciphertexts, no content

export async function signalOffer(kvUrl: string, fromIdentity: any, toPseudo: string, offer: RTCSessionDescription) {
  const payload = {
    type: 'p2p_offer',
    from: fromIdentity.pseudoId,
    to: toPseudo,
    fromMlKemPk: [...fromIdentity.mlKemPublicKey],
    sdp: offer.sdp,
    ts: Date.now(),
    // No doc content, no guid, only pseudoIds
  };
  await fetch(`${kvUrl}/p2p/${toPseudo}`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function pollOffers(kvUrl: string, myPseudoId: string) {
  const res = await fetch(`${kvUrl}/p2p/${myPseudoId}`);
  return res.json(); // array of offers with mlkem ciphertexts
}
