
export type Role = 'finance'|'legal'|'founder'|'student'|'designer'|'doctor'|'developer'|'sales'|'hr'|'personal';

export interface Skill {
  id: string;
  role: Role[];
  name: string;
  description: string;
  promptPrefix: string;
  tools: string[];
  markets: string[]; // GLOBAL means works everywhere, others are market-specific overrides
  weight: number;
  wasmUrl?: string;
}

export const SKILL_REGISTRY: Skill[] = [
  // GLOBAL skills - work in every market
  { id:'doc-chat', role:['personal','founder','student','finance','legal','developer'], name:'Chat with Doc', description:'Ask any doc', promptPrefix:'You are helpful doc assistant', tools:['chat'], markets:['GLOBAL'], weight:1 },
  { id:'table-extract', role:['finance','founder','personal'], name:'Table Extractor', description:'PDF tables -> Excel', promptPrefix:'Extract tables accurately', tools:['table_extract'], markets:['GLOBAL'], weight:1 },
  { id:'summarize', role:['personal','founder','student'], name:'Summarizer', description:'Long doc -> summary', promptPrefix:'Summarize concisely', tools:['summarize'], markets:['GLOBAL'], weight:1 },
  // Market-specific skills - loaded only if user in that market
  { id:'invoice-parser', role:['finance','founder'], name:'Invoice Parser', description:'Extracts tax IDs, totals', promptPrefix:'You are finance expert, adapt to local tax rules from market context', tools:['table_extract'], markets:['IN','US','DE','BR','GLOBAL'], weight:1, wasmUrl:'/models/skills/invoice-global.bin' },
  { id:'contract-review', role:['legal','founder'], name:'Contract Review', description:'Flag risks per local law', promptPrefix:'You are legal assistant, consider local compliance', tools:['text_analyze'], markets:['GLOBAL'], weight:1 },
  { id:'ta-formal', role:['personal'], name:'Tamil Formal', description:'Formal Tamil for docs', promptPrefix:'Formal Tamil', tools:['translate'], markets:['IN'], weight:1 },
  { id:'jp-keigo', role:['personal','sales'], name:'Keigo Formal', description:'Japanese business formal', promptPrefix:'Use Keigo', tools:['translate'], markets:['JP'], weight:1 },
];

export class SkillEngine {
  private activeSkills = new Map<string, Skill>();
  private userRole: Role = 'personal';
  private userMarket: string = 'GLOBAL';

  async setRole(role: Role, market: string = 'GLOBAL') {
    this.userRole = role;
    this.userMarket = market;
    // GLOBAL-FIRST: load GLOBAL skills + market-specific if available
    const relevant = SKILL_REGISTRY.filter(s => 
      s.role.includes(role) && (s.markets.includes('GLOBAL') || s.markets.includes(market))
    );
    for(const skill of relevant) {
      if(skill.wasmUrl) {
        const cache = await caches.open('foundry-skills');
        try { await cache.add(`https://foundry-cdn.workers.dev${skill.wasmUrl}`); } catch {}
      }
      this.activeSkills.set(skill.id, skill);
    }
    console.log(`[Foundry] Skills for role=${role} market=${market}: ${relevant.length} (GLOBAL first)`);
  }

  getActiveSkills(): Skill[] { return [...this.activeSkills.values()].sort((a,b)=>b.weight-a.weight); }
  buildSystemPrompt(): string {
    const skillsPrompt = this.getActiveSkills().slice(0,3).map(s=>s.promptPrefix).join('\n');
    return `You are Foundry, global assistant. User role=${this.userRole} market=${this.userMarket}. Adapt to local formats, currency, compliance from market context. ${skillsPrompt}`;
  }
}
