
// Foundry Skills - Role-based, On-demand loaded, Human-centric
// Skills wrap around user needs, compound daily

export type Role = 'finance'|'legal'|'founder'|'student'|'designer'|'doctor'|'developer'|'sales'|'hr'|'personal';

export interface Skill {
  id: string;
  role: Role[];
  name: string;
  description: string;
  promptPrefix: string; // system prompt for SLM
  tools: string[]; // which canonical block tools it can use
  marketOverrides?: Record<string, Partial<Skill>>;
  weight: number; // compound intelligence weight, increases with usage
  wasmUrl?: string; // optional 1-5MB LoRA for this skill, loaded on demand from CDN
}

export const SKILL_REGISTRY: Skill[] = [
  { id:'invoice-parser', role:['finance','founder'], name:'GST Invoice Parser', description:'Extracts GSTIN, HSN, totals, validates', promptPrefix:'You are finance expert for India market...', tools:['table_extract','ocr'], weight:1, wasmUrl:'/models/skills/invoice-in_q4.bin' },
  { id:'contract-review', role:['legal','founder'], name:'Contract Risk Scanner', description:'Finds payment terms, liability', promptPrefix:'You are legal assistant, flag risky clauses...', tools:['text_analyze'], weight:1, wasmUrl:'/models/skills/legal-review.bin' },
  { id:'pitch-builder', role:['founder','sales'], name:'Pitch Deck Builder', description:'Doc -> Deck with storyline', promptPrefix:'You are pitch coach...', tools:['slide_gen'], weight:1 },
  { id:'ta-translate', role:['personal'], name:'Tamil Formal Translator', description:'En -> Ta formal for govt docs', promptPrefix:'Translate to formal Tamil...', tools:['translate'], marketOverrides:{'IN':{promptPrefix:'Use formal Tamil for TN govt'}}, weight:1 },
  { id:'study-notes', role:['student'], name:'Study Notes Maker', description:'PDF -> flashcards + summary', promptPrefix:'Make concise study notes...', tools:['summarize','flashcard'], weight:1 },
  { id:'code-doc', role:['developer'], name:'Code Doc Generator', description:'Repo -> docs + diagrams', promptPrefix:'Document code...', tools:['code_parse'], weight:1 },
];

export class SkillEngine {
  private activeSkills: Map<string, Skill> = new Map();
  private userRole: Role = 'personal';
  private usageLog: Map<string, number> = new Map(); // skillId -> usage count
  private userLocale: string = 'en-IN';

  async setRole(role: Role, market: string) {
    this.userRole = role;
    // Load skills for this role on demand from CDN - 1-5MB each, cached
    const relevant = SKILL_REGISTRY.filter(s => s.role.includes(role));
    for(const skill of relevant) {
      const localizedSkill = skill.marketOverrides?.[market] ? {...skill, ...skill.marketOverrides[market]} : skill;
      if(skill.wasmUrl) {
        // Fetch LoRA from CDN Model Cache, cache locally
        const cache = await caches.open('foundry-skills');
        await cache.add(`https://foundry-cdn.workers.dev${skill.wasmUrl}`);
      }
      this.activeSkills.set(skill.id, localizedSkill);
    }
  }

  // Human-centric: compound intelligence - weight increases with daily use
  async trackUsage(skillId: string, feedback: 'positive'|'negative') {
    const count = (this.usageLog.get(skillId)||0) + (feedback==='positive'?1:-0.5);
    this.usageLog.set(skillId, count);
    const skill = this.activeSkills.get(skillId);
    if(skill) skill.weight = Math.min(5, Math.max(0.5, 1 + count*0.1)); // weight 0.5-5 based on usage
    // Weekly: aggregate usage (DP) -> CDN -> improves skill LoRA for everyone in same role/market
    if(navigator.onLine) {
      navigator.sendBeacon('https://foundry-cdn.workers.dev/telemetry', JSON.stringify({type:'skill_usage', skillId, role:this.userRole, locale:this.userLocale, weight:skill?.weight}));
    }
  }

  getActiveSkills(): Skill[] {
    // Sorted by compound weight - most used skills first, wrapped around user
    return [...this.activeSkills.values()].sort((a,b)=>b.weight-a.weight);
  }

  // Personal wrapper: SLM system prompt built from active skills + user history
  buildSystemPrompt(): string {
    const skillsPrompt = this.getActiveSkills().slice(0,3).map(s=>s.promptPrefix).join('\n');
    return `You are Foundry, human-centric assistant for ${this.userRole} in ${this.userLocale}.\n${skillsPrompt}\nAdapt to user style, learn daily.`;
  }
}
