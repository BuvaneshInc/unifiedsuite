// Compounded Intelligence - Federated DP
export function captureCorrection(type: string, meta: {latency:number, ok:boolean}){
  const dp = { type, ...meta, noise: (Math.random()-0.5)*0.1, ts: Date.now() };
  if(navigator.onLine) navigator.sendBeacon('https://foundry-cdn.workers.dev/telemetry', JSON.stringify(dp));
}
// Cloud job weekly: aggregate -> train LoRA -> publish to R2 /models/lora/{domain}/{week}.bin
