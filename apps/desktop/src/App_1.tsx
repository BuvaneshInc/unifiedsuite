
import { useState } from 'react';
import { FirstRunOnboarding } from './components/Onboarding';
export default function App(){
  const [firstRun]=useState(localStorage.getItem('foundry_onboarded')!=='true');
  if(firstRun) return <FirstRunOnboarding/>;
  return <div className='p-6 bg-black text-cyan-200'><h1 className='text-2xl'>FOUNDRY - Ready (Envelope-Only Sync Active)</h1><input type='file' onChange={async e=>{ const f=e.target.files?.[0]; if(f) console.log('ingest',f.name); }}/></div>;
}
