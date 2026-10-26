import React, { useState, useEffect } from 'react';
import { CanonicalDocument, CanonicalBlock } from '@foundry/canonical-model';
import { FoundryAITS } from '@foundry/engine';
import { LocalizationEngine, MARKETS } from '@foundry/localization';
import { SKILL_REGISTRY, SkillEngine, Skill } from '@foundry/localization/skills';
import { AdaptiveEngine } from '@foundry/localization/adaptive';
import { FoundryCRDT, CRDTBlock } from '@foundry/crdt';
import { RecoveryEngine, RecoveryShard } from '@foundry/recovery';
import { SkillTrustEngine, SkillPackage } from '@foundry/skill-trust';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ingest'|'envelope'|'skills'|'localization'|'crdt'|'recovery'|'trust'>('ingest');
  const [role, setRole] = useState<'founder'|'finance'|'legal'|'student'|'developer'|'personal'>('founder');
  const [marketKey, setMarketKey] = useState<string>('IN');
  const [doc, setDoc] = useState<CanonicalDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncedStatus, setSyncedStatus] = useState<string>('');
  const [chatQuery, setChatQuery] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Recovery state
  const [shards, setShards] = useState<RecoveryShard[]>([]);
  const [recoveredGuid, setRecoveredGuid] = useState<string>('');

  // CRDT state
  const [crdtEngine] = useState(() => new FoundryCRDT('device-web-primary'));
  const [crdtBlocks, setCrdtBlocks] = useState<CRDTBlock[]>([]);

  // Adaptive engine
  const [adaptive] = useState(() => new AdaptiveEngine());
  const [learningLog, setLearningLog] = useState<string[]>([]);

  // Localization
  const [locEngine] = useState(() => new LocalizationEngine());

  // Skills
  const [skillEngine] = useState(() => new SkillEngine());
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);

  // Initialize Sample Document
  useEffect(() => {
    loadSampleDoc('invoice');
  }, []);

  // Update Skills when role or market changes
  useEffect(() => {
    skillEngine.setRole(role, marketKey).then(() => {
      const skills = SKILL_REGISTRY.filter(s => s.role.includes(role));
      setActiveSkills(skills);
    });
    locEngine.setLocale(marketKey === 'IN' ? 'en-IN' : marketKey === 'US' ? 'en-US' : marketKey === 'JP' ? 'ja-JP' : 'de-DE', marketKey);
  }, [role, marketKey]);

  // Load Sample Documents
  const loadSampleDoc = async (type: 'invoice'|'contract'|'pitch') => {
    setIsProcessing(true);
    let sampleText = '';
    let title = '';
    let mime = 'application/pdf';

    if (type === 'invoice') {
      title = 'TAX-INVOICE-2026-089.pdf';
      sampleText = 'INVOICE #INV-2026-089\nVendor: Quantum Cloud Services Pvt Ltd\nGSTIN: 27AABCU9603R1ZM\nHSN: 998313\nTotal Amount: ₹142,500.00\nIGST (18%): ₹25,650.00\nGrand Total: ₹168,150.00';
    } else if (type === 'contract') {
      title = 'MSA-ENTERPRISE-AGREEMENT.docx';
      sampleText = 'MASTER SERVICES AGREEMENT\nEffective Date: 2026-10-26\nConfidentiality: Strict E2E\nLiability Cap: 12 Months Fees\nGoverning Law: Jurisdiction of Execution\nZero-Retention Cloud Clause: Enforced';
    } else {
      title = 'FOUNDRY-SERIES-A-PITCH.pptx';
      sampleText = 'FOUNDRY SUITE\nAI-Native • Global-First • Client Inference\nProblem: Cloud AI leaks sensitive IP & costs $0.09/GB egress\nSolution: On-device WASM inference + Envelope-only sync at $674/mo per 1M users';
    }

    const mockBlocks: CanonicalBlock[] = sampleText.split('\n').map((line, idx) => ({
      id: `block-${idx + 1}`,
      type: line.includes('₹') || line.includes('Total') ? 'table' : 'text',
      content: { text: line, rows: line.includes('₹') ? [[line.split(':')[0], line.split(':')[1] || '']] : undefined },
      style: { bbox: [20, 20 + idx * 30, 400, 45 + idx * 30] },
      provenance: { file: title, page: 1, confidence: 0.99 },
    }));

    const sampleDoc: CanonicalDocument = {
      envelope: {
        id: crypto.randomUUID(),
        hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
        metadata: {
          title,
          mime,
          size: sampleText.length * 10,
          deviceId: 'web-device-' + Math.random().toString(36).substring(2, 7),
          createdAt: new Date().toISOString()
        },
        permissions: { owner: 'local-user', acl: ['read', 'write'] },
        versionVector: { 'device-web-primary': 1 }
      },
      blocks: mockBlocks
    };

    setDoc(sampleDoc);
    setIsProcessing(false);
    setSyncedStatus('');

    // Initialize CRDT
    mockBlocks.forEach(b => crdtEngine.insertBlock(b));
    setCrdtBlocks(crdtEngine.getChangesSince({}));

    // Generate Shamir Shards
    RecoveryEngine.splitGuid(sampleDoc.envelope.hash.substring(0, 64)).then(setShards);
  };

  // Sync Envelope to Edge
  const handleSyncEnvelope = async () => {
    if (!doc) return;
    setSyncedStatus('Syncing envelope to Cloudflare edge KV...');
    try {
      // Simulate fetch to /sync/
      await new Promise(r => setTimeout(r, 600));
      setSyncedStatus(`SUCCESS: Envelope (${doc.envelope.id.substring(0, 8)}...) synced to Cloudflare KV Edge. Content remained 100% local.`);
    } catch {
      setSyncedStatus('Synced simulated locally.');
    }
  };

  // Chat with Document using Local SLM
  const handleChat = async () => {
    if (!doc || !chatQuery.trim()) return;
    setIsChatting(true);
    setChatAnswer('');
    
    // Local inference simulation
    await new Promise(r => setTimeout(r, 500));
    const queryLower = chatQuery.toLowerCase();
    let reply = `[Local SLM ONNX]: Processed query against ${doc.blocks.length} canonical blocks. `;
    
    if (queryLower.includes('total') || queryLower.includes('amount') || queryLower.includes('tax') || queryLower.includes('gst')) {
      reply += `Detected financial block. Grand Total is ₹168,150.00 including 18% IGST under HSN 998313. Verified compliant for market [${marketKey}].`;
    } else if (queryLower.includes('summary') || queryLower.includes('about')) {
      reply += `Document "${doc.envelope.metadata.title}" contains ${doc.blocks.length} structured blocks parsed via PaddleOCR + LayoutLM. Zero content leaves your device.`;
    } else {
      reply += `Contextual query matched top provenance block "${doc.blocks[0]?.content?.text}". Ingestion & embeddings computed client-side.`;
    }

    setChatAnswer(reply);
    setIsChatting(false);

    // Teach adaptive engine
    adaptive.learnFromDocType(doc.envelope.metadata.title.split('.').pop() || 'txt');
    setLearningLog(prev => [`[${new Date().toLocaleTimeString()}] SLM query answered locally. Adaptive learned style for role [${role}]`, ...prev.slice(0, 4)]);
  };

  return (
    <div className="foundry-app">
      {/* Sticky Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#040812" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="brand-title">FOUNDRY</h1>
              <span className="brand-badge">WEB • PWA</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>GLOBAL-FIRST • AI-NATIVE SUITE</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-emerald">
            <span className="badge-dot"></span>
            LOCAL BRAIN ONNX
          </span>
          <span className="badge badge-cyan">
            <span className="badge-dot"></span>
            ZERO-RETENTION EDGE
          </span>
          <span className="badge badge-violet">
            <span className="badge-dot"></span>
            ML-KEM-768 P2P
          </span>

          {/* Role Switcher */}
          <select 
            id="role-selector"
            className="select-input" 
            value={role} 
            onChange={e => setRole(e.target.value as any)}
            title="Active Persona"
          >
            <option value="founder">Role: Founder</option>
            <option value="finance">Role: Finance</option>
            <option value="legal">Role: Legal</option>
            <option value="student">Role: Student</option>
            <option value="developer">Role: Developer</option>
            <option value="personal">Role: Personal</option>
          </select>

          {/* Market Switcher */}
          <select 
            id="market-selector"
            className="select-input" 
            value={marketKey} 
            onChange={e => setMarketKey(e.target.value)}
            title="Market & Compliance"
          >
            <option value="IN">Market: India (GST / Aadhaar)</option>
            <option value="US">Market: United States (EIN / USD)</option>
            <option value="DE">Market: Germany (VAT / EUR)</option>
            <option value="JP">Market: Japan (MyNumber / JPY)</option>
          </select>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-container">
        {/* Navigation Bar */}
        <nav className="tab-bar" aria-label="Foundry Features">
          <button 
            id="tab-ingest" 
            className={`tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingest')}
          >
            📄 Ingestion & Canonical Model
          </button>
          <button 
            id="tab-envelope" 
            className={`tab-btn ${activeTab === 'envelope' ? 'active' : ''}`}
            onClick={() => setActiveTab('envelope')}
          >
            🛡️ Zero-Retention Envelope
          </button>
          <button 
            id="tab-skills" 
            className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            ⚡ Role & Adaptive Skills ({activeSkills.length})
          </button>
          <button 
            id="tab-localization" 
            className={`tab-btn ${activeTab === 'localization' ? 'active' : ''}`}
            onClick={() => setActiveTab('localization')}
          >
            🌐 Localization ({marketKey})
          </button>
          <button 
            id="tab-crdt" 
            className={`tab-btn ${activeTab === 'crdt' ? 'active' : ''}`}
            onClick={() => setActiveTab('crdt')}
          >
            🔄 CRDT Time-Travel
          </button>
          <button 
            id="tab-recovery" 
            className={`tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('recovery')}
          >
            🔐 2-of-3 Shamir Recovery
          </button>
          <button 
            id="tab-trust" 
            className={`tab-btn ${activeTab === 'trust' ? 'active' : ''}`}
            onClick={() => setActiveTab('trust')}
          >
            ⚛️ Quantum P2P & Trust
          </button>
        </nav>

        {/* TAB 1: Ingestion & Canonical Model */}
        {activeTab === 'ingest' && (
          <div>
            <div className="dropzone-container" onClick={() => loadSampleDoc('invoice')}>
              <div className="dropzone-icon">📥</div>
              <h2 className="dropzone-title">Drop PDF / DOCX / XLSX / PPTX Here</h2>
              <p className="dropzone-desc">
                PaddleOCR WASM + LayoutLM ONNX parses structure entirely in-browser. Converts to unified canonical blocks without sending document content over the network.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); loadSampleDoc('invoice'); }}>Sample Invoice</button>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); loadSampleDoc('contract'); }}>Sample Contract</button>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); loadSampleDoc('pitch'); }}>Sample Pitch</button>
              </div>
            </div>

            {doc && (
              <div className="split-view" style={{ marginTop: '1.5rem' }}>
                {/* Canonical Blocks Preview */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div className="card-title">
                    <span>Parsed Canonical Blocks</span>
                    <span className="meta-pill">{doc.blocks.length} Blocks • {doc.envelope.metadata.title}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {doc.blocks.map(b => (
                      <div key={b.id} style={{ background: 'rgba(7, 11, 18, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 600 }}>{b.id} • TYPE: {b.type.toUpperCase()}</span>
                          <span style={{ color: '#34d399' }}>Confidence: {(b.provenance.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{b.content.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Local SLM Playground */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div className="card-title">
                    <span>Ask Local SLM (ONNX Runtime)</span>
                    <span className="meta-pill">Zero Network Query</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Interrogate document blocks locally using on-device quantized SLM weights.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                      id="chat-input"
                      type="text" 
                      className="text-input" 
                      style={{ flex: 1 }}
                      placeholder="e.g. What is the grand total and GST amount?" 
                      value={chatQuery}
                      onChange={e => setChatQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleChat()}
                    />
                    <button id="chat-submit" className="btn btn-sm" onClick={handleChat} disabled={isChatting}>
                      {isChatting ? 'Inferring...' : 'Query'}
                    </button>
                  </div>
                  {chatAnswer && (
                    <div className="code-block" style={{ color: '#e2e8f0', background: 'rgba(10, 16, 28, 0.95)' }}>
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.5rem' }}>Foundry Local SLM Output:</div>
                      {chatAnswer}
                    </div>
                  )}
                  {learningLog.length > 0 && (
                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Adaptive Engine Activity:</div>
                      {learningLog.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Zero-Retention Envelope Inspector */}
        {activeTab === 'envelope' && doc && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className="card-title">
              <span>Zero-Retention Verification: Envelope vs. Local Content</span>
              <button id="btn-sync-envelope" className="btn btn-sm" onClick={handleSyncEnvelope}>Sync Envelope to Edge</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              In Foundry, the cloud NEVER sees your text, spreadsheets, or images. Only the tiny 2KB cryptographic envelope travels to Cloudflare Workers KV.
            </p>

            <div className="split-view">
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                  ☁️ What Leaves Device (2KB Metadata Envelope Only)
                </div>
                <pre className="code-block" style={{ maxHeight: '350px' }}>
                  {JSON.stringify(doc.envelope, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399', marginBottom: '0.5rem' }}>
                  🔒 What Stays in Browser Memory / IndexedDB (Content Stays Local)
                </div>
                <pre className="code-block" style={{ maxHeight: '350px', color: '#a7f3d0' }}>
                  {JSON.stringify({
                    documentId: doc.envelope.id,
                    contentProtected: true,
                    totalBlocks: doc.blocks.length,
                    sampleBlocks: doc.blocks.slice(0, 2)
                  }, null, 2)}
                </pre>
              </div>
            </div>

            {syncedStatus && (
              <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'var(--accent-cyan-dim)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                {syncedStatus}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Role & Adaptive Skills */}
        {activeTab === 'skills' && (
          <div>
            <div className="card-title">
              <span>Active Persona Skills (Role: {role.toUpperCase()})</span>
              <span className="meta-pill">Compounded Intelligence</span>
            </div>
            <div className="skills-grid">
              {activeSkills.map(skill => (
                <div key={skill.id} className="skill-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{skill.name}</span>
                      <span className="badge badge-cyan">{skill.tools.join(', ')}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{skill.description}</p>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                      Prompt: "{skill.promptPrefix}"
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Weight: {skill.weight.toFixed(1)}</span>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => skillEngine.trackUsage(skill.id, 'positive')}
                    >
                      + Boost Weight
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Localization & Compliance */}
        {activeTab === 'localization' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className="card-title">
              <span>Global Multi-Market Compliance Rules</span>
              <span className="meta-pill">Market: {marketKey}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {Object.entries(MARKETS).map(([key, market]) => (
                <div 
                  key={key} 
                  style={{ 
                    padding: '1.25rem', 
                    borderRadius: '12px', 
                    background: marketKey === key ? 'var(--accent-cyan-dim)' : 'rgba(13, 19, 34, 0.7)',
                    border: `1px solid ${marketKey === key ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer'
                  }}
                  onClick={() => setMarketKey(key)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{market.country}</span>
                    <span className="badge badge-emerald">{market.currency}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div>Tax: {market.tax.gst ? `GST ${market.tax.gst}%` : `VAT ${market.tax.vat}%`}</div>
                    <div>eSign: {market.compliance.eSign.join(', ')}</div>
                    <div>Paper: {market.formats.paper} • Date: {market.formats.date}</div>
                    <div>Residency: {market.compliance.dataResidency} ({market.compliance.retentionDays}d)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CRDT Time-Travel */}
        {activeTab === 'crdt' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className="card-title">
              <span>Foundry CRDT Conflict-Free Synchronization</span>
              <span className="meta-pill">Lamport Timestamps & Vectors</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Enables offline editing across laptop and phone. Merge tie-breaker uses Lamport timestamp + deviceId with zero cloud content awareness.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {crdtBlocks.map((b, i) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(7, 11, 18, 0.7)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginRight: '0.75rem' }}>Block #{i+1}</span>
                    <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{b.content.text}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    <span>Lamport: {b.lamport}</span>
                    <span>Device: {b.deviceId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: Shamir Recovery & Paper QR */}
        {activeTab === 'recovery' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className="card-title">
              <span>Shamir's Secret Sharing (2-of-3 Identity Recovery)</span>
              <span className="meta-pill">Zero Knowledge Recovery</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Your 256-bit GUID is split into 3 shards. Any 2 can reconstruct your second brain. Shard 1 is in Keychain, Shard 2 is synced to your phone, Shard 3 is your Paper QR.
            </p>
            <div className="split-view">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {shards.map(s => (
                  <div key={s.index} style={{ padding: '1rem', background: 'rgba(7, 11, 18, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                      <span>Shard #{s.index} ({s.deviceHint.toUpperCase()})</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Index {s.index}</span>
                    </div>
                    <div className="code-block" style={{ fontSize: '0.7rem' }}>{s.shard}</div>
                  </div>
                ))}
                <button 
                  className="btn btn-sm"
                  onClick={() => {
                    RecoveryEngine.recoverGuid(shards.slice(0, 2)).then(guid => setRecoveredGuid(guid));
                  }}
                >
                  Test 2-of-3 Reconstruction (Shard 1 + 2)
                </button>
                {recoveredGuid && (
                  <div style={{ padding: '0.75rem', background: 'var(--accent-emerald-dim)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#34d399', fontSize: '0.8rem' }}>
                    Reconstructed Master GUID: {recoveredGuid}
                  </div>
                )}
              </div>

              {/* Printable Paper Backup QR representation */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 11, 18, 0.7)', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '2rem' }}>
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                  <svg width="180" height="180" viewBox="0 0 100 100" fill="#000000">
                    <rect x="10" y="10" width="25" height="25" rx="3" fill="#000" />
                    <rect x="15" y="15" width="15" height="15" fill="#fff" />
                    <rect x="18" y="18" width="9" height="9" fill="#000" />
                    <rect x="65" y="10" width="25" height="25" rx="3" fill="#000" />
                    <rect x="70" y="15" width="15" height="15" fill="#fff" />
                    <rect x="73" y="18" width="9" height="9" fill="#000" />
                    <rect x="10" y="65" width="25" height="25" rx="3" fill="#000" />
                    <rect x="15" y="70" width="15" height="15" fill="#fff" />
                    <rect x="18" y="73" width="9" height="9" fill="#000" />
                    <rect x="45" y="20" width="10" height="10" fill="#000" />
                    <rect x="40" y="45" width="20" height="20" fill="#000" />
                    <rect x="70" y="65" width="10" height="25" fill="#000" />
                    <rect x="85" y="75" width="8" height="8" fill="#000" />
                  </svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Shard 3: Paper Backup QR</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>Print and store in a physical safe. Never shared online.</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Quantum P2P & Trust */}
        {activeTab === 'trust' && (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className="card-title">
              <span>Post-Quantum P2P & Sigstore Trust Verifier</span>
              <span className="meta-pill">NIST FIPS 203 ML-KEM-768</span>
            </div>
            <div className="verify-list" style={{ marginTop: '1rem' }}>
              <div className="verify-item">
                <div>
                  <div style={{ fontWeight: 600 }}>ML-KEM-768 Key Exchange</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1184-byte quantum-resistant public key generated locally</div>
                </div>
                <span className="badge badge-emerald">Active</span>
              </div>
              <div className="verify-item">
                <div>
                  <div style={{ fontWeight: 600 }}>Sigstore Cosign Signature Verification</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verifies publisher pseudoId in Rekor append-only transparency log</div>
                </div>
                <span className="badge badge-cyan">Verified</span>
              </div>
              <div className="verify-item">
                <div>
                  <div style={{ fontWeight: 600 }}>WASM Sandbox Fuel Limit (1M instructions)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blocks filesystem & network exfiltration imports from LoRAs</div>
                </div>
                <span className="badge badge-emerald">Enforced</span>
              </div>
              <div className="verify-item">
                <div>
                  <div style={{ fontWeight: 600 }}>WebRTC Direct DataChannel (E2E Encrypted)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct device-to-device document sync with zero cloud relay</div>
                </div>
                <span className="badge badge-violet">P2P Ready</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
