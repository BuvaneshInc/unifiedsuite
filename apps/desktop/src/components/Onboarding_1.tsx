
import { useState, useEffect } from 'react';
export function FirstRunOnboarding(){
  const [step,setStep]=useState(0);
  const [prog,setProg]=useState(0);
  useEffect(()=>{
    async function cacheWasm(){
      const cache=await caches.open('foundry-model-cache-v1');
      const models=[
        'https://foundry-cdn.workers.dev/models/ocr/det_q4.onnx',
        'https://foundry-cdn.workers.dev/models/ocr/rec_q4.onnx',
        'https://foundry-cdn.workers.dev/models/slm/tokenizer.json'
      ];
      let done=0;
      for(const url of models){
        try{ const res=await fetch(url); await cache.put(url,res.clone()); done++; setProg(Math.round(done/models.length*100)); }catch{}
      }
      setStep(3);
    }
    if(step===1) cacheWasm();
  },[step]);
  const steps=[
    {t:"Foundry is Local-First",d:"Your docs NEVER leave device. Only encrypted envelope syncs."},
    {t:"Downloading AI Brains",d:"Fetching OCR 8MB + SLM tokenizer. Full SLM streams later."},
    {t:"Caching Offline",d:"Storing WASM in local cache. Next launch offline."},
    {t:"Ready",d:"Drop any PDF/DOCX/XLSX/PPTX"}
  ];
  return (
    <div className="min-h-screen bg-black text-cyan-100 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 border border-cyan-800">
        <h1 className="text-2xl font-bold">FOUNDRY</h1>
        <div className="text-lg font-semibold mt-4">{steps[step].t}</div>
        <div className="text-sm text-zinc-400">{steps[step].d}</div>
        {step===1 && <div className="h-2 bg-zinc-800 rounded-full mt-4"><div className="h-full bg-cyan-400" style={{width: prog+'%'}}/></div>}
        <button onClick={()=>{ if(step===3){ localStorage.setItem('foundry_onboarded','true'); location.reload(); } else setStep(s=>s+1); }} className="w-full mt-6 bg-cyan-500 text-black font-bold py-3 rounded-xl">
          {step===0?'Start Secure Setup':step===3?'Open Foundry':'Continue '+prog+'%'}
        </button>
      </div>
    </div>
  );
}
