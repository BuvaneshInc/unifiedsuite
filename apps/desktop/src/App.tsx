
import { useState, useEffect } from 'react';
import { FirstRunOnboarding } from './components/Onboarding';
import { FoundryAITS } from '@foundry/engine';

export default function App(){
  const [firstRun, setFirstRun] = useState(localStorage.getItem('foundry_onboarded') !== 'true');
  const [doc, setDoc] = useState<any>(null);

  if(firstRun) {
    return <FirstRunOnboarding />;
  }

  return (
    <div className='min-h-screen bg-black text-cyan-200 p-6'>
      <header className='flex justify-between items-center mb-8'>
        <h1 className='text-2xl font-bold'>FOUNDRY</h1>
        <span className='text-xs bg-green-900 text-green-300 px-2 py-1 rounded'>LOCAL • ENVELOPE-ONLY SYNC</span>
      </header>
      <div className='border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center'>
        <input type='file' id='f' className='hidden' onChange={async e=>{
          const file=e.target.files?.[0]; if(!file) return;
          const engine=new FoundryAITS();
          const d=await engine.ingest(file);
          const env=engine.getEnvelope(d);
          await fetch('https://foundry-cdn.workers.dev/sync/'+env.id, {method:'PUT', body: JSON.stringify(env)});
          setDoc(d);
        }}/>
        <label htmlFor='f' className='cursor-pointer'>
          <div className='text-lg'>Drop PDF / DOCX / XLSX / PPTX here</div>
          <div className='text-xs text-zinc-500 mt-2'>Converts to canonical model locally. Only envelope syncs.</div>
        </label>
        {doc && <div className='mt-6 text-left bg-zinc-900 p-4 rounded-xl text-xs'>Ingested {doc.blocks.length} blocks. Envelope synced.</div>}
      </div>
    </div>
  );
}
