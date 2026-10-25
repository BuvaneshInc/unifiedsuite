
import { useState, useEffect } from 'react';

export function FirstRunOnboarding() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState({ocr:0, slm:0, overall:0});
  const steps = [
    { title: "Foundry is Local-First", desc: "Your documents NEVER leave this device. Only encrypted envelope (metadata) syncs via CDN." },
    { title: "Downloading AI Brains", desc: "Fetching OCR (8MB) + SLM tokenizer (2MB). Full SLM 600MB streams later." },
    { title: "Caching for Offline", desc: "Storing WASM modules in local cache. Next launch works fully offline." },
    { title: "Ready", desc: "Drop any PDF/DOCX/XLSX/PPTX - it becomes canonical and searchable locally." }
  ];

  useEffect(() => {
    async function cacheWasm() {
      const cache = await caches.open('foundry-model-cache-v1');
      const models = [
        'https://foundry-cdn.workers.dev/models/ocr/det_q4.onnx',
        'https://foundry-cdn.workers.dev/models/ocr/rec_q4.onnx',
        'https://foundry-cdn.workers.dev/models/slm/tokenizer.json',
        'https://foundry-cdn.workers.dev/wasm/ocr/foundry_ocr_wasm_bg.wasm',
        'https://foundry-cdn.workers.dev/wasm/slm/foundry_slm_wasm_bg.wasm'
      ];
      let done = 0;
      for(const url of models) {
        try {
          const res = await fetch(url);
          await cache.put(url, res.clone());
          done++;
          setProgress(p => ({...p, ocr: Math.round((done/models.length)*100), overall: Math.round((done/models.length)*100)}));
        } catch(e) { console.log('cache miss, will fetch on demand', url); }
      }
      setStep(3);
    }
    if(step===1) cacheWasm();
  }, [step]);

  return (
    <div className="min-h-screen bg-black text-cyan-100 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 border border-cyan-800">
        <h1 className="text-2xl font-bold mb-2">FOUNDRY</h1>
        <p className="text-xs text-cyan-600 mb-6">ENDPOINT-HEAVY • CDN-FIRST • ENVELOPE-ONLY</p>
        
        <div className="space-y-4">
          <div className="text-lg font-semibold">{steps[step].title}</div>
          <div className="text-sm text-zinc-400">{steps[step].desc}</div>
          
          {step===1 && (
            <div className="space-y-2">
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all" style={{width: `${progress.overall}%`}} />
              </div>
              <div className="text-xs text-zinc-500">{progress.overall}% cached • {progress.overall===100?'Offline ready':''}</div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            {steps.map((_,i)=>(
              <div key={i} className={`h-1 flex-1 rounded-full ${i<=step?'bg-cyan-400':'bg-zinc-800'}`} />
            ))}
          </div>

          <button 
            onClick={()=>setStep(s=>Math.min(s+1, steps.length-1))}
            className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-xl"
          >
            {step===0?'Start Secure Setup': step===1?'Caching...': step===3?'Open Foundry':'Continue'}
          </button>

          <p className="text-[10px] text-zinc-600 text-center mt-4">
            Privacy: No document content is sent to cloud. Only envelope: hash, metadata, version vector. E2E encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
