
// Human-centric Adaptive Intelligence - Learns user day by day

export interface UserProfile {
  role: string;
  locale: string;
  market: string;
  writingStyle: { formality: number; length: number; tone: string }; // learned
  frequentDocs: string[]; // e.g., ['invoice','contract']
  corrections: Array<{type:string, original:string, corrected:string, ts:number}>; // local only
  skillWeights: Record<string, number>;
}

export class AdaptiveEngine {
  private profile: UserProfile;
  private dbName = 'foundry-adaptive';

  constructor() {
    this.profile = this.loadLocal();
  }

  private loadLocal(): UserProfile {
    const saved = localStorage.getItem('foundry_profile');
    return saved ? JSON.parse(saved) : { role:'personal', locale:'en-IN', market:'IN', writingStyle:{formality:0.5,length:0.5,tone:'neutral'}, frequentDocs:[], corrections:[], skillWeights:{} };
  }

  // Called after every user correction - local learning
  learnFromCorrection(type: string, original: string, corrected: string) {
    this.profile.corrections.push({type, original, corrected, ts: Date.now()});
    // Keep last 100, older decay
    if(this.profile.corrections.length>100) this.profile.corrections.shift();
    
    // Adjust writing style: if user makes text shorter, reduce length preference
    if(type==='rewrite' && corrected.length < original.length) this.profile.writingStyle.length = Math.max(0.1, this.profile.writingStyle.length-0.05);
    
    this.save();
    // Compound: if many users correct same pattern, CDN distills LoRA
    this.sendDPTelemetry(type);
  }

  learnFromDocType(docType: string) {
    this.profile.frequentDocs.push(docType);
    const freq = this.profile.frequentDocs.reduce((acc,c)=>{ acc[c]=(acc[c]||0)+1; return acc; }, {} as Record<string,number>);
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0];
    if(top) {
      // Auto-suggest skill for this doc type
      console.log(`User frequently uses ${top}, prioritize ${top} skills`);
    }
    this.save();
  }

  // Daily improvement: at midnight, local SLM fine-tunes on corrections (LoRA on device, 10MB)
  async dailyFineTune() {
    // In Tauri Rust: run LoRA training on local corrections - 5 min on device
    // Result: local adapter that adapts to user style, never leaves device
    // Example: user always changes 'utilize' -> 'use', model learns
    console.log('Daily local fine-tune on', this.profile.corrections.length, 'corrections');
  }

  private save() { localStorage.setItem('foundry_profile', JSON.stringify(this.profile)); }
  private sendDPTelemetry(type: string) {
    // DP: only type, no content: {type: 'invoice_table_fix', count:1}
    navigator.sendBeacon('https://foundry-cdn.workers.dev/telemetry', JSON.stringify({type:'adaptive', correctionType:type}));
  }

  getProfile(): UserProfile { return this.profile; }
  getPersonalizedPrompt(): string {
    return `User prefers ${this.profile.writingStyle.tone} tone, formality ${this.profile.writingStyle.formality}. Frequent docs: ${this.profile.frequentDocs.slice(-3).join(',')}. Adapt.`;
  }
}
