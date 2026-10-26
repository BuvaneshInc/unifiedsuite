
import { useState, useEffect } from 'react';
import { FirstRunOnboarding } from './components/Onboarding';
import { LocalizationEngine } from '@foundry/localization';
import { SkillEngine } from '@foundry/localization/skills';

export default function App(){
  const [firstRun] = useState(localStorage.getItem('foundry_onboarded')!=='true');
  const [role, setRole] = useState(localStorage.getItem('foundry_role')||'personal');
  const [locale, setLocale] = useState('');
  const [market, setMarket] = useState('GLOBAL');
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(()=>{
    // GLOBAL FIRST - auto-detect, not hardcoded India
    const locEngine = new LocalizationEngine();
    const detectedLocale = locEngine.getLocale();
    const detectedMarket = locEngine.getMarket().country;
    setLocale(detectedLocale);
    setMarket(detectedMarket);
    localStorage.setItem('foundry_locale', detectedLocale);
    localStorage.setItem('foundry_market', detectedMarket);

    const skillEngine = new SkillEngine();
    skillEngine.setRole(role as any, detectedMarket).then(()=>setSkills(skillEngine.getActiveSkills()));
  },[role]);

  if(firstRun) return <FirstRunOnboarding/>;
  
  return (
    <div className='min-h-screen bg-black text-cyan-100 p-4'>
      <header className='flex justify-between items-center mb-4'>
        <div>
          <h1 className='text-xl font-bold'>FOUNDRY • {role}</h1>
          <div className='text-[10px] text-zinc-500'>GLOBAL-FIRST • Locale: {locale} • Market: {market} • Auto-detected</div>
        </div>
        <div className='flex gap-2'>
          <select value={role} onChange={e=>{ setRole(e.target.value); localStorage.setItem('foundry_role', e.target.value); }} className='bg-zinc-800 text-xs px-2 py-1 rounded'>
            <option value='personal'>Personal</option><option value='founder'>Founder</option><option value='finance'>Finance</option><option value='legal'>Legal</option><option value='student'>Student</option><option value='developer'>Developer</option>
          </select>
        </div>
      </header>
      
      <div className='grid grid-cols-3 gap-2 mb-4'>
        {skills.map(s=><div key={s.id} className='bg-zinc-900 border border-cyan-900 p-2 rounded text-xs'>
          <div className='font-bold'>{s.name} <span className='text-[9px] bg-zinc-800 px-1 rounded'>{s.markets.includes('GLOBAL')?'GLOBAL':market}</span></div>
          <div className='text-zinc-500'>{s.description}</div>
        </div>)}
      </div>

      <div className='border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center'>
        <div className='text-sm'>Drop PDF/DOCX/XLSX - Global engine, local context {market}</div>
        <div className='text-[10px] text-zinc-600 mt-2'>Auto-detects date/number/currency/compliance per market. GLOBAL skills work everywhere, market skills load on-demand.</div>
      </div>
    </div>
  );
}
