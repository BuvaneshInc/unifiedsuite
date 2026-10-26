
import { useState, useEffect } from 'react';
import { FirstRunOnboarding } from './components/Onboarding';
import { LocalizationEngine } from '@foundry/localization';
import { SkillEngine } from '@foundry/localization/skills';
import { AdaptiveEngine } from '@foundry/localization/adaptive';

export default function App(){
  const [firstRun] = useState(localStorage.getItem('foundry_onboarded')!=='true');
  const [role, setRole] = useState(localStorage.getItem('foundry_role')||'founder');
  const [locale, setLocale] = useState(localStorage.getItem('foundry_locale')||'en-IN');
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(()=>{
    const skillEngine = new SkillEngine();
    skillEngine.setRole(role as any, 'IN').then(()=>setSkills(skillEngine.getActiveSkills()));
    const adaptive = new AdaptiveEngine();
    // Daily fine-tune at 2am
    const now = new Date(); const msTill2am = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1,2,0,0).getTime() - now.getTime();
    setTimeout(()=>adaptive.dailyFineTune(), msTill2am);
  },[role]);

  if(firstRun) return <FirstRunOnboarding/>;
  
  return (
    <div className='min-h-screen bg-black text-cyan-100 p-4'>
      <header className='flex justify-between items-center mb-4'>
        <h1 className='text-xl font-bold'>FOUNDRY • {role} • {locale}</h1>
        <select value={role} onChange={e=>{ setRole(e.target.value); localStorage.setItem('foundry_role', e.target.value); }} className='bg-zinc-800 text-xs px-2 py-1 rounded'>
          <option value='founder'>Founder</option><option value='finance'>Finance</option><option value='legal'>Legal</option><option value='student'>Student</option><option value='developer'>Developer</option><option value='personal'>Personal</option>
        </select>
      </header>
      
      <div className='grid grid-cols-3 gap-2 mb-4'>
        {skills.map(s=><div key={s.id} className='bg-zinc-900 border border-cyan-900 p-2 rounded text-xs'>
          <div className='font-bold'>{s.name}</div><div className='text-zinc-500'>{s.description}</div>
          <div className='text-[10px] text-cyan-600'>weight: {s.weight.toFixed(1)} • compound daily</div>
        </div>)}
      </div>

      <div className='border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center'>
        <input type='file' id='f' className='hidden' onChange={e=>{
          const adaptive = (window as any).AdaptiveEngine ? new (window as any).AdaptiveEngine() : {learnFromDocType:()=>{}};
          const file=e.target.files?.[0]; if(file){ adaptive.learnFromDocType?.(file.name.split('.').pop()); }
        }}/>
        <label htmlFor='f' className='cursor-pointer'><div>Drop PDF/DOCX/XLSX here - localized to {locale}</div><div className='text-xs text-zinc-500 mt-1'>Skills auto-wrap around your needs • Learns daily</div></label>
      </div>

      <div className='mt-4 text-[10px] text-zinc-600'>
        Localization: Market IN/US/JP/DE auto-detects tax/compliance. Language packs from CDN cached locally. Skills on-demand loaded per role. Adaptive engine fine-tunes LoRA on device nightly from your corrections.
      </div>
    </div>
  );
}
