import { useState } from 'react'

const TABS = ['ingest', 'asis', 'analysis', 'opportunities', 'tobe', 'gate']
const TAB_LABELS = {
  ingest: 'Ingest',
  asis: 'As-is lanes',
  analysis: 'Analysis',
  opportunities: 'Opportunities',
  tobe: 'To-be lanes',
  gate: 'Human gate'
}

const LEAN_STYLE = {
  VA:            { bg: '#dcfce7', color: '#166534', border: '#639922' },
  BVA:           { bg: '#dbeafe', color: '#1e40af', border: '#378ADD' },
  NVA:           { bg: '#fee2e2', color: '#991b1b', border: '#E24B4A' },
  'NVA-R':       { bg: '#fef9c3', color: '#854d0e', border: '#EF9F27' },
  control:       { bg: '#ede9fe', color: '#5b21b6', border: '#7F77DD' },
  unclassified:  { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' }
}

function getNodeStyle(node) {
  if (node.type === 'control') return LEAN_STYLE.control
  return LEAN_STYLE[node.lean?.classification] || LEAN_STYLE.unclassified
}

export default function ProcessIQ() {
  const [activeTab, setActiveTab] = useState('ingest')
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [tier, setTier] = useState('impact')
  const [owningEntity, setOwningEntity] = useState('')

  const handleExtract = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3001/processiq/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tier, owningEntity })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const classifyRes = await fetch('http://localhost:3001/processiq/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph: data.graph })
      })
      const classifyData = await classifyRes.json()
      if (classifyData.error) throw new Error(classifyData.error)

      setGraph(classifyData.graph)
      setActiveTab('asis')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px' }}>ProcessIQ</div>
        <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
          {graph ? `${graph.meta?.name || 'Process'} · ${graph.nodes?.length || 0} nodes` : 'No process loaded'}
        </div>
        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontWeight: 500 }}>
          {tier} tier
        </span>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', padding: '0 24px' }}>
        {TABS.map(tab => (
          <div
            key={tab}
            onClick={() => (tab === 'ingest' || graph) ? setActiveTab(tab) : null}
            style={{
              padding: '10px 16px', fontSize: 13, cursor: (tab === 'ingest' || graph) ? 'pointer' : 'not-allowed',
              color: activeTab === tab ? '#111' : (!graph && tab !== 'ingest') ? '#d1d5db' : '#6b7280',
              fontWeight: activeTab === tab ? 500 : 400,
              borderBottom: activeTab === tab ? '2px solid #111' : '2px solid transparent',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
          >
            {TAB_LABELS[tab]}
            {tab === 'gate' && graph && (
              <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 10, marginLeft: 6, fontWeight: 500 }}>
                {graph.nodes?.filter(n => n.type === 'control').length || 0}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        {activeTab === 'ingest' && (
          <IngestScreen
            text={text} setText={setText}
            tier={tier} setTier={setTier}
            owningEntity={owningEntity} setOwningEntity={setOwningEntity}
            loading={loading} error={error}
            onExtract={handleExtract}
          />
        )}
        {activeTab === 'asis' && <AsIsScreen graph={graph} />}
        {activeTab === 'analysis' && <AnalysisScreen graph={graph} />}
        {activeTab === 'opportunities' && <OpportunitiesScreen graph={graph} />}
        {activeTab === 'tobe' && <ToBeScreen graph={graph} />}
        {activeTab === 'gate' && <HumanGateScreen graph={graph} setGraph={setGraph} />}
      </div>

    </div>
  )
}

function IngestScreen({ text, setText, tier, setTier, owningEntity, setOwningEntity, loading, error, onExtract }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Load a process</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Paste your SOP, process description, or step list below</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Owning entity</label>
        <input
          type="text"
          value={owningEntity}
          onChange={e => setOwningEntity(e.target.value)}
          placeholder="e.g. Deutsche Bank Frankfurt, Trade Operations"
          style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>The organisation whose process we are improving. All others are treated as external participants.</div>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste your process document here..."
        style={{ width: '100%', height: 280, padding: 14, fontSize: 13, lineHeight: 1.6, border: '1px solid #d1d5db', borderRadius: 8, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }}
      />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Analysis tier</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['clarity', 'impact', 'transformation'].map(t => (
            <div key={t} onClick={() => setTier(t)} style={{ flex: 1, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', border: tier === t ? '2px solid #111' : '1px solid #e5e7eb', background: tier === t ? '#f9fafb' : '#fff' }}>
              <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
                {t === 'clarity' && 'NVA identification only. No financial inputs.'}
                {t === 'impact' && 'Roadmap with hard and soft savings estimate.'}
                {t === 'transformation' && 'Full CBA, NPV and app sunset analysis.'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
          {error}
        </div>
      )}

      <button
        onClick={onExtract}
        disabled={text.trim().length < 20 || loading}
        style={{ padding: '10px 24px', fontSize: 14, fontWeight: 500, background: text.trim().length < 20 || loading ? '#e5e7eb' : '#111', color: text.trim().length < 20 || loading ? '#9ca3af' : '#fff', border: 'none', borderRadius: 8, cursor: text.trim().length < 20 || loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Extracting and classifying...' : 'Extract process →'}
      </button>
    </div>
  )
}

function AsIsScreen({ graph }) {
  if (!graph) return null

  const nodesByActor = {}
  graph.actors.forEach(actor => { nodesByActor[actor.actor_id] = [] })
  graph.nodes.forEach(node => {
    if (nodesByActor[node.actor_id] !== undefined) {
      nodesByActor[node.actor_id].push(node)
    }
  })

  const isReworkNode = (nodeId) =>
    graph.edges.some(e => e.to === nodeId && e.is_rework_loop)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        {[
          { label: 'Value add', color: '#639922', bg: '#dcfce7' },
          { label: 'Business value add', color: '#378ADD', bg: '#dbeafe' },
          { label: 'Non value add', color: '#E24B4A', bg: '#fee2e2' },
          { label: 'NVA-R (regulatory)', color: '#EF9F27', bg: '#fef9c3' },
          { label: 'Control', color: '#7F77DD', bg: '#ede9fe' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: item.bg, border: `1px solid ${item.color}` }}></div>
            {item.label}
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {graph.actors.map((actor, actorIdx) => {
          const actorNodes = (nodesByActor[actor.actor_id] || []).sort((a, b) => a.sequence - b.sequence)
          return (
            <div key={actor.actor_id} style={{ display: 'flex', minHeight: 80, borderBottom: actorIdx < graph.actors.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <div style={{ width: 130, minWidth: 130, padding: '12px 14px', fontSize: 12, fontWeight: 500, color: '#6b7280', borderRight: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', background: '#f9fafb', lineHeight: 1.3 }}>
                {actor.name}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 4, overflowX: 'auto' }}>
                {actorNodes.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>external participant</div>
                ) : (
                  actorNodes.map((node, idx) => {
                    const style = getNodeStyle(node)
                    const rework = isReworkNode(node.node_id)
                    return (
                      <div key={node.node_id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div
                          title={node.description}
                          style={{ width: 100, minWidth: 100, padding: '7px 8px', borderRadius: 6, border: rework ? '2px dashed #E24B4A' : `1px solid ${style.border}`, borderLeft: `3px solid ${style.border}`, background: style.bg, fontSize: 10, color: style.color, textAlign: 'center', lineHeight: 1.3, cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, fontFamily: 'monospace' }}>
                            {node.node_id}{rework ? ' ↺' : ''}
                          </div>
                          {node.name}
                          {node.lean?.waste_tags?.length > 0 && (
                            <div style={{ fontSize: 9, marginTop: 3, opacity: 0.8 }}>{node.lean.waste_tags.join(' ')}</div>
                          )}
                        </div>
                        {idx < actorNodes.length - 1 && (
                          <div style={{ width: 20, height: 1, background: '#9ca3af', margin: '0 2px', position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', right: -4, top: -3, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '4px solid #9ca3af' }}></div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {graph.edges.filter(e => e.is_rework_loop).length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#991b1b', marginBottom: 6 }}>Rework loops detected</div>
          {graph.edges.filter(e => e.is_rework_loop).map(edge => (
            <div key={edge.edge_id} style={{ fontSize: 12, color: '#b91c1c', marginBottom: 2 }}>
              ↺ {edge.from} → {edge.to} {edge.condition ? `(${edge.condition})` : ''}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
        {[
          { label: 'Total nodes', value: graph.nodes.length },
          { label: 'Control nodes', value: graph.nodes.filter(n => n.type === 'control').length },
          { label: 'Rework loops', value: graph.edges.filter(e => e.is_rework_loop).length },
          { label: 'Actors', value: graph.actors.length },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, fontFamily: 'monospace' }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
function AnalysisScreen({ graph }) {
  if (!graph) return null

  const nodes = graph.nodes || []
  const edges = graph.edges || []

  const va = nodes.filter(n => n.lean?.classification === 'VA')
  const bva = nodes.filter(n => n.lean?.classification === 'BVA')
  const nva = nodes.filter(n => n.lean?.classification === 'NVA')
  const nvar = nodes.filter(n => n.lean?.classification === 'NVA-R')
  const controls = nodes.filter(n => n.type === 'control')
  const reworkLoops = edges.filter(e => e.is_rework_loop)
  const automationCandidates = nodes.filter(n => n.control?.agent_assessment?.automation_potential === 'full' || n.flags?.includes('automation_candidate'))

  const totalSUT = nodes.reduce((sum, n) => {
    const d = n.time?.estimated_duration
    return sum + (typeof d === 'number' ? d : 0)
  }, 0)

  const totalWait = nodes.reduce((sum, n) => {
    const w = n.time?.estimated_wait_before
    return sum + (typeof w === 'number' ? w : 0)
  }, 0)

  const allWasteTags = nodes.flatMap(n => n.lean?.waste_tags || [])
  const wasteCount = {}
  allWasteTags.forEach(tag => { wasteCount[tag] = (wasteCount[tag] || 0) + 1 })
  const wasteLabels = { D: 'Defects', O: 'Overproduction', W: 'Waiting', N: 'Non-utilised talent', T: 'Transportation', I: 'Inventory', M: 'Motion', E: 'Extra processing' }

  const card = (title, children) => (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )

  const row = (label, value, highlight) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 500, color: highlight || '#111', fontFamily: 'monospace', fontSize: 12 }}>{value}</span>
    </div>
  )

  return (
    <div>
      {/* Metric summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total steps', value: nodes.length },
          { label: 'Total SUT', value: totalSUT > 0 ? `${totalSUT} min` : 'n/a' },
          { label: 'Rework loops', value: reworkLoops.length, color: reworkLoops.length > 0 ? '#E24B4A' : '#111' },
          { label: 'Control nodes', value: controls.length },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, fontFamily: 'monospace', color: stat.color || '#111' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Box 1 — Process steps */}
      {card('Process steps', (
        <div>
          {row('Value add (VA)', `${va.length} steps · ${Math.round(va.length / nodes.length * 100)}%`, '#166534')}
          {row('Business value add (BVA)', `${bva.length} steps · ${Math.round(bva.length / nodes.length * 100)}%`, '#1e40af')}
          {row('Non value add (NVA)', `${nva.length} steps · ${Math.round(nva.length / nodes.length * 100)}%`, '#991b1b')}
          {row('NVA-R (regulatory)', `${nvar.length} steps · ${Math.round(nvar.length / nodes.length * 100)}%`, '#854d0e')}
          {totalSUT > 0 && row('Total estimated SUT', `${totalSUT} minutes`)}
          {totalWait > 0 && row('Total estimated wait time', `${totalWait} minutes`, '#991b1b')}
          <div style={{ marginTop: 10 }}>
            {nodes.filter(n => n.lean?.classification && n.lean.classification !== 'unclassified').map(n => {
              const s = LEAN_STYLE[n.lean.classification] || LEAN_STYLE.unclassified
              return (
                <span key={n.node_id} title={`${n.name} — ${n.lean.classification}`} style={{ display: 'inline-block', margin: '2px', padding: '2px 6px', borderRadius: 4, fontSize: 10, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  {n.node_id}
                </span>
              )
            })}
          </div>
        </div>
      ))}

      {/* Box 2 — Players and handoffs */}
      {card('Players and handoffs', (
        <div>
          {row('Total actors', graph.actors.length)}
          {row('Internal actors', graph.actors.filter(a => a.type === 'internal_team' || a.type === 'individual' || !a.type).length)}
          {row('External participants', graph.actors.filter(a => a.type === 'external').length)}
          {row('Cross-actor handoffs', edges.filter(e => {
            const fromNode = nodes.find(n => n.node_id === e.from)
            const toNode = nodes.find(n => n.node_id === e.to)
            return fromNode && toNode && fromNode.actor_id !== toNode.actor_id
          }).length, null, '#6b7280')}
          <div style={{ marginTop: 10 }}>
            {graph.actors.map(a => (
              <div key={a.actor_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f9fafb', fontSize: 12 }}>
                <span style={{ color: '#374151' }}>{a.name}</span>
                <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}>
                  {nodes.filter(n => n.actor_id === a.actor_id).length} steps
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Box 3 — Decisions and branches */}
      {card('Decisions and branches', (
        <div>
          {row('Decision nodes', nodes.filter(n => n.type === 'decision').length)}
          {row('Conditional edges', edges.filter(e => e.condition && e.condition !== 'always').length)}
          {row('Rework loops', reworkLoops.length, reworkLoops.length > 0 ? '#991b1b' : '#111')}
          {reworkLoops.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {reworkLoops.map(e => (
                <div key={e.edge_id} style={{ fontSize: 12, color: '#b91c1c', padding: '3px 0', borderBottom: '1px solid #fef2f2' }}>
                  ↺ {e.from} → {e.to} {e.condition ? `· ${e.condition}` : ''}
                </div>
              ))}
            </div>
          )}
          {graph.meta?.ambiguities?.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#92400e', marginBottom: 4 }}>Ambiguities flagged</div>
              {graph.meta.ambiguities.map((a, i) => (
                <div key={i} style={{ fontSize: 11, color: '#b45309', marginBottom: 2 }}>· {a}</div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Box 4 — Controls */}
      {card('Controls', (
        <div>
          {row('Total control nodes', controls.length)}
          {row('Pending Human Gate validation', controls.filter(n => !n.control?.validated).length, '#92400e')}
          {row('Automation candidates', automationCandidates.length, '#166534')}
          <div style={{ marginTop: 10 }}>
            {controls.map(n => (
              <div key={n.node_id} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{n.name}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#ede9fe', color: '#5b21b6', fontFamily: 'monospace' }}>
                    {n.control?.agent_assessment?.probable_type || 'unassessed'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {n.control?.agent_assessment?.risk_mitigated || 'Risk not yet assessed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Box 5 — Waste signals */}
      {card('Waste signals and sigma', (
        <div>
          {Object.entries(wasteCount).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
            <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: 12, marginRight: 8 }}>{tag}</span>
                <span style={{ color: '#6b7280' }}>{wasteLabels[tag] || tag}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 60, height: 4, background: '#f3f4f6', borderRadius: 2 }}>
                  <div style={{ width: `${Math.min(100, count / nodes.length * 100 * 3)}%`, height: '100%', background: '#E24B4A', borderRadius: 2 }}></div>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>{count} nodes</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#f9fafb', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Sigma baseline</div>
            <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>
              {reworkLoops.length === 0 ? 'No rework loops — insufficient data' : `Est. ${Math.max(2.5, 4.5 - reworkLoops.length * 0.4).toFixed(1)}σ – ${Math.max(3.0, 5.0 - reworkLoops.length * 0.4).toFixed(1)}σ range`}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Based on {reworkLoops.length} rework loop{reworkLoops.length !== 1 ? 's' : ''} detected. Actual sigma requires error frequency and volume data.</div>
          </div>
        </div>
      ))}
    </div>
  )
}
function OpportunitiesScreen({ graph }) {
  if (!graph) return null

  const nodes = graph.nodes || []
  const edges = graph.edges || []

  const nvaNodes = nodes.filter(n => n.lean?.classification === 'NVA')
  const reworkLoops = edges.filter(e => e.is_rework_loop)
  const controlNodes = nodes.filter(n => n.type === 'control')
  const automationNodes = nodes.filter(n =>
    n.control?.agent_assessment?.automation_potential === 'full' ||
    n.flags?.includes('automation_candidate')
  )

  const opportunities = []

  // Rework loops — highest priority
  reworkLoops.forEach((edge, idx) => {
    const fromNode = nodes.find(n => n.node_id === edge.from)
    const toNode = nodes.find(n => n.node_id === edge.to)
    opportunities.push({
      id: `RW-${idx + 1}`,
      priority: 1,
      type: 'Rework elimination',
      title: `Eliminate rework loop — ${edge.from} → ${edge.to}`,
      description: fromNode && toNode
        ? `${fromNode.name} loops back to ${toNode.name} when ${edge.condition || 'condition met'}. Every loop is a defect and a wait state combined.`
        : `Rework loop detected on edge ${edge.edge_id}.`,
      nodes: [edge.from, edge.to],
      wasteType: 'D, W',
      savingType: 'Hard',
      effort: 'Medium',
      rootCause: 'Defect in upstream step — fix the source, not the rework'
    })
  })

  // NVA steps — elimination candidates
  nvaNodes.forEach((node, idx) => {
    opportunities.push({
      id: `NVA-${idx + 1}`,
      priority: 2,
      type: 'NVA elimination',
      title: `Remove NVA step — ${node.name}`,
      description: node.lean?.classification_rationale || `This step adds no value to the customer or the process. Waste tags: ${node.lean?.waste_tags?.join(', ') || 'none identified'}.`,
      nodes: [node.node_id],
      wasteType: node.lean?.waste_tags?.join(', ') || '—',
      savingType: 'Hard',
      effort: 'Low',
      sut: node.time?.estimated_duration,
      volume: null
    })
  })

  // Automation candidates
  automationNodes.forEach((node, idx) => {
    opportunities.push({
      id: `AUTO-${idx + 1}`,
      priority: 3,
      type: 'Automation',
      title: `Automate — ${node.name}`,
      description: node.control?.agent_assessment?.automation_rationale || `This step is a candidate for full or partial automation based on its rule-based nature.`,
      nodes: [node.node_id],
      wasteType: 'E, M',
      savingType: 'Hard',
      effort: 'Medium',
      sut: node.time?.estimated_duration
    })
  })

  // System disconnection waste
  const systemNodes = nodes.filter(n => n.lean?.waste_tags?.includes('M') && n.system_ids?.length > 0)
  if (systemNodes.length > 0) {
    opportunities.push({
      id: 'SYS-1',
      priority: 4,
      type: 'System integration',
      title: 'Eliminate manual re-entry across disconnected systems',
      description: `${systemNodes.length} steps require manual data re-entry between systems. Each is a defect opportunity and a waste of analyst time. System integration or API connectors would eliminate this entirely.`,
      nodes: systemNodes.map(n => n.node_id),
      wasteType: 'M, E, D',
      savingType: 'Hard',
      effort: 'High'
    })
  }

  // Threshold calibration
  const thresholdNodes = controlNodes.filter(n =>
    n.description?.toLowerCase().includes('threshold') ||
    n.description?.toLowerCase().includes('000') ||
    n.name?.toLowerCase().includes('approval')
  )
  if (thresholdNodes.length > 0) {
    opportunities.push({
      id: 'THR-1',
      priority: 4,
      type: 'Threshold calibration',
      title: 'Review approval thresholds — may be miscalibrated',
      description: `${thresholdNodes.length} approval controls have numeric thresholds that appear not to have been reviewed recently. Raising thresholds to reflect current risk appetite and portfolio growth could significantly reduce manual approval volume.`,
      nodes: thresholdNodes.map(n => n.node_id),
      wasteType: 'W, N',
      savingType: 'Soft',
      effort: 'Low'
    })
  }

  // Savings estimate
  const totalSUT = nvaNodes.reduce((sum, n) => sum + (n.time?.estimated_duration || 0), 0)
  const reworkSUT = reworkLoops.reduce((sum, edge) => {
    const node = nodes.find(n => n.node_id === edge.from)
    return sum + (node?.time?.estimated_duration || 0)
  }, 0)
  const totalSavingMinutes = totalSUT + reworkSUT
  const annualFTESaving = totalSavingMinutes > 0
    ? Math.round((totalSavingMinutes * 220 * 12) / (60 * 8 * 220))
    : null

  const typeColors = {
    'Rework elimination': { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    'NVA elimination':    { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    'Automation':         { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
    'System integration': { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    'Threshold calibration': { bg: '#fefce8', color: '#854d0e', border: '#fde68a' }
  }

  return (
    <div>
      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Opportunities identified', value: opportunities.length },
          { label: 'NVA steps to remove', value: nvaNodes.length },
          { label: 'Rework loops to close', value: reworkLoops.length },
          { label: 'Est. FTE saving', value: annualFTESaving ? `~${annualFTESaving} FTE` : 'Enter costs' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, fontFamily: 'monospace' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Savings estimate banner */}
      {totalSavingMinutes > 0 && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#166534' }}>Estimated SUT saving if all NVA and rework eliminated</div>
            <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>{totalSavingMinutes} minutes per transaction · {(totalSavingMinutes * 220).toLocaleString()} minutes per month across 220 transactions</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 500, fontFamily: 'monospace', color: '#166534' }}>{(totalSavingMinutes * 220 / 60).toFixed(0)} hrs/month</div>
            <div style={{ fontSize: 11, color: '#15803d' }}>capacity freed</div>
          </div>
        </div>
      )}

      {/* Opportunity cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opportunities.map((opp, idx) => {
          const colors = typeColors[opp.type] || { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' }
          return (
            <div key={opp.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af', minWidth: 50 }}>{String(idx + 1).padStart(2, '0')}</div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>
                  {opp.type}
                </span>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{opp.title}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: opp.savingType === 'Hard' ? '#dcfce7' : '#fef9c3', color: opp.savingType === 'Hard' ? '#166534' : '#854d0e' }}>
                    {opp.savingType} saving
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: opp.effort === 'Low' ? '#dcfce7' : opp.effort === 'Medium' ? '#fef9c3' : '#fee2e2', color: opp.effort === 'Low' ? '#166534' : opp.effort === 'Medium' ? '#854d0e' : '#991b1b' }}>
                    {opp.effort} effort
                  </span>
                </div>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 10 }}>{opp.description}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                  <div>Nodes: {opp.nodes.map(n => (
                    <span key={n} style={{ fontFamily: 'monospace', fontSize: 11, background: '#f3f4f6', padding: '1px 5px', borderRadius: 3, marginLeft: 3 }}>{n}</span>
                  ))}</div>
                  <div>Waste: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{opp.wasteType}</span></div>
                  {opp.sut && <div>SUT: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{opp.sut} min</span></div>}
                  {opp.rootCause && <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>{opp.rootCause}</div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sigma projection */}
      <div style={{ marginTop: 16, padding: '14px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 10 }}>Sigma projection</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>As-is baseline</div>
            <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 500, color: '#E24B4A' }}>
              {(Math.max(2.5, 4.5 - reworkLoops.length * 0.4)).toFixed(1)}σ – {(Math.max(3.0, 5.0 - reworkLoops.length * 0.4)).toFixed(1)}σ
            </div>
          </div>
          <div style={{ fontSize: 20, color: '#d1d5db' }}>→</div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>To-be projection</div>
            <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 500, color: '#166534' }}>
              {(Math.max(3.5, 4.5 - Math.max(0, reworkLoops.length - nvaNodes.length) * 0.4)).toFixed(1)}σ – {(Math.max(4.0, 5.5 - Math.max(0, reworkLoops.length - nvaNodes.length) * 0.4)).toFixed(1)}σ
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', maxWidth: 300 }}>
            Assumes all NVA steps eliminated and rework loops closed. Actual sigma requires error frequency and volume data to confirm.
          </div>
        </div>
      </div>
    </div>
  )
}
function ToBeScreen({ graph }) {
  if (!graph) return null

  const nodes = graph.nodes || []
  const edges = graph.edges || []

  const nvaNodes = nodes.filter(n => n.lean?.classification === 'NVA')
  const reworkEdges = edges.filter(e => e.is_rework_loop)
  const automationNodes = nodes.filter(n =>
    n.control?.agent_assessment?.automation_potential === 'full'
  )

  const nvaIds = new Set(nvaNodes.map(n => n.node_id))
  const reworkNodeIds = new Set(reworkEdges.flatMap(e => [e.from, e.to]))
  const autoIds = new Set(automationNodes.map(n => n.node_id))

  const getToBeStatus = (node) => {
    if (nvaIds.has(node.node_id)) return 'eliminated'
    if (autoIds.has(node.node_id)) return 'automated'
    return 'retained'
  }

  const nodesByActor = {}
  graph.actors.forEach(actor => { nodesByActor[actor.actor_id] = [] })
  nodes.forEach(node => {
    if (nodesByActor[node.actor_id] !== undefined) {
      nodesByActor[node.actor_id].push(node)
    }
  })

  const survivingNodes = nodes.filter(n => !nvaIds.has(n.node_id))
  const survivingEdges = edges.filter(e => !e.is_rework_loop)

  const totalSUTBefore = nodes.reduce((sum, n) => sum + (n.time?.estimated_duration || 0), 0)
  const totalSUTAfter = survivingNodes.reduce((sum, n) => sum + (n.time?.estimated_duration || 0), 0)
  const sutSaving = totalSUTBefore - totalSUTAfter

  const getToBeStyle = (node) => {
    const status = getToBeStatus(node)
    if (status === 'eliminated') return { bg: '#f9fafb', color: '#d1d5db', border: '#e5e7eb', dashed: true }
    if (status === 'automated') return { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7', dashed: true }
    return LEAN_STYLE[node.lean?.classification] || LEAN_STYLE.unclassified
  }

  return (
    <div>
      {/* Delta summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Steps eliminated', value: nvaNodes.length, color: '#E24B4A' },
          { label: 'Steps automated', value: automationNodes.length, color: '#1D9E75' },
          { label: 'Steps retained', value: survivingNodes.length - automationNodes.length },
          { label: 'SUT saving', value: sutSaving > 0 ? `${sutSaving} min` : 'n/a', color: '#166534' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, fontFamily: 'monospace', color: stat.color || '#111' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {[
          { label: 'Retained', bg: '#dbeafe', border: '#378ADD', dashed: false },
          { label: 'Automated', bg: '#ecfdf5', border: '#6ee7b7', dashed: true },
          { label: 'Eliminated', bg: '#f9fafb', border: '#e5e7eb', dashed: true },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: item.bg, border: `${item.dashed ? '1px dashed' : '1px solid'} ${item.border}` }}></div>
            {item.label}
          </div>
        ))}
        <div style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
          Strikethrough = eliminated · Dashed border = changed from as-is
        </div>
      </div>

      {/* To-be swim lanes */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {graph.actors.map((actor, actorIdx) => {
          const actorNodes = (nodesByActor[actor.actor_id] || []).sort((a, b) => a.sequence - b.sequence)
          return (
            <div key={actor.actor_id} style={{ display: 'flex', minHeight: 80, borderBottom: actorIdx < graph.actors.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <div style={{ width: 130, minWidth: 130, padding: '12px 14px', fontSize: 12, fontWeight: 500, color: '#6b7280', borderRight: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', background: '#f9fafb', lineHeight: 1.3 }}>
                {actor.name}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 4, overflowX: 'auto' }}>
                {actorNodes.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>external participant</div>
                ) : (
                  actorNodes.map((node, idx) => {
                    const status = getToBeStatus(node)
                    const style = getToBeStyle(node)
                    return (
                      <div key={node.node_id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div
                          title={status === 'eliminated' ? `ELIMINATED — ${node.lean?.classification_rationale || 'NVA'}` : status === 'automated' ? `AUTOMATED — ${node.control?.agent_assessment?.automation_rationale || ''}` : node.description}
                          style={{
                            width: 100, minWidth: 100,
                            padding: '7px 8px',
                            borderRadius: 6,
                            border: `${style.dashed ? '2px dashed' : '1px solid'} ${style.border}`,
                            borderLeft: status === 'eliminated' ? `3px solid #e5e7eb` : `3px solid ${style.border}`,
                            background: style.bg,
                            fontSize: 10,
                            color: style.color,
                            textAlign: 'center',
                            lineHeight: 1.3,
                            cursor: 'pointer',
                            textDecoration: status === 'eliminated' ? 'line-through' : 'none',
                            opacity: status === 'eliminated' ? 0.45 : 1
                          }}
                        >
                          <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, fontFamily: 'monospace' }}>
                            {node.node_id}
                            {status === 'eliminated' && ' ✕'}
                            {status === 'automated' && ' ⚡'}
                          </div>
                          {node.name}
                          <div style={{ fontSize: 9, marginTop: 2, fontWeight: 500 }}>
                            {status === 'automated' && 'auto'}
                          </div>
                        </div>
                        {idx < actorNodes.length - 1 && (
                          <div style={{ width: 20, height: 1, background: status === 'eliminated' ? '#f3f4f6' : '#9ca3af', margin: '0 2px', position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', right: -4, top: -3, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `4px solid ${status === 'eliminated' ? '#f3f4f6' : '#9ca3af'}` }}></div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Changes log */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Changes log
        </div>
        {nvaNodes.map(node => (
          <div key={node.node_id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f9fafb', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 500, whiteSpace: 'nowrap', marginTop: 1 }}>Eliminated</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{node.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{node.lean?.classification_rationale || 'NVA — no value added to customer or process'}</div>
              {node.time?.estimated_duration && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{node.time.estimated_duration} min SUT recovered per transaction</div>
              )}
            </div>
          </div>
        ))}
        {automationNodes.map(node => (
          <div key={node.node_id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f9fafb', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#ecfdf5', color: '#065f46', fontWeight: 500, whiteSpace: 'nowrap', marginTop: 1 }}>Automated</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{node.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{node.control?.agent_assessment?.automation_rationale || 'Full automation candidate — rule-based step'}</div>
              {node.time?.estimated_duration && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{node.time.estimated_duration} min SUT automated per transaction</div>
              )}
            </div>
          </div>
        ))}
        {reworkEdges.map(edge => (
          <div key={edge.edge_id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f9fafb', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fef9c3', color: '#854d0e', fontWeight: 500, whiteSpace: 'nowrap', marginTop: 1 }}>Loop closed</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Rework loop {edge.from} → {edge.to}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Condition: {edge.condition || 'not specified'} — eliminated by fixing upstream defect</div>
            </div>
          </div>
        ))}
      </div>

      {/* Delta table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>As-is vs to-be</div>
        {[
          { label: 'Total steps', before: nodes.length, after: survivingNodes.length },
          { label: 'NVA steps', before: nvaNodes.length, after: 0 },
          { label: 'Rework loops', before: reworkEdges.length, after: 0 },
          { label: 'Manual control steps', before: nodes.filter(n => n.type === 'control').length, after: nodes.filter(n => n.type === 'control' && !autoIds.has(n.node_id)).length },
          { label: 'Total SUT per transaction', before: `${totalSUTBefore} min`, after: `${totalSUTAfter} min` },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f9fafb', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>{item.label}</span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontFamily: 'monospace', fontSize: 12 }}>
              <span style={{ color: '#9ca3af', textDecoration: 'line-through' }}>{item.before}</span>
              <span style={{ color: '#6b7280' }}>→</span>
              <span style={{ color: '#166534', fontWeight: 500 }}>{item.after}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
function HumanGateScreen({ graph, setGraph }) {
  if (!graph) return null

  const controlNodes = graph.nodes.filter(n => n.type === 'control')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selections, setSelections] = useState({})
  const [notes, setNotes] = useState({})
  const [validator, setValidator] = useState('')
  const [role, setRole] = useState('')
  const [completed, setCompleted] = useState({})

  const current = controlNodes[currentIdx]
  const totalControls = controlNodes.length
  const completedCount = Object.keys(completed).length

  const CLASSES = ['REG-HARD', 'REG-SOFT', 'RISK-CORE', 'RISK-EXCESS', 'GTH', 'LEGACY']

  const classColors = {
    'REG-HARD':   { bg: '#fee2e2', color: '#991b1b' },
    'REG-SOFT':   { bg: '#fef9c3', color: '#854d0e' },
    'RISK-CORE':  { bg: '#dbeafe', color: '#1e40af' },
    'RISK-EXCESS':{ bg: '#ede9fe', color: '#5b21b6' },
    'GTH':        { bg: '#f0fdf4', color: '#166534' },
    'LEGACY':     { bg: '#f3f4f6', color: '#6b7280' },
  }

  const handleConfirm = () => {
    if (!selections[current.node_id]) return
    const updatedNodes = graph.nodes.map(n => {
      if (n.node_id !== current.node_id) return n
      return {
        ...n,
        control: {
          ...n.control,
          validated: true,
          validated_type: selections[current.node_id],
          validated_by: validator || 'Anonymous',
          validated_at: new Date().toISOString(),
          human_notes: notes[current.node_id] || null
        }
      }
    })
    setGraph({ ...graph, nodes: updatedNodes })
    setCompleted({ ...completed, [current.node_id]: true })
    if (currentIdx < totalControls - 1) setCurrentIdx(currentIdx + 1)
  }

  const handleFlag = () => {
    const updatedNodes = graph.nodes.map(n => {
      if (n.node_id !== current.node_id) return n
      return {
        ...n,
        flags: [...(n.flags || []), 'flagged_for_group_discussion'],
        control: {
          ...n.control,
          human_notes: `Flagged for group discussion. ${notes[current.node_id] || ''}`
        }
      }
    })
    setGraph({ ...graph, nodes: updatedNodes })
    setCompleted({ ...completed, [current.node_id]: 'flagged' })
    if (currentIdx < totalControls - 1) setCurrentIdx(currentIdx + 1)
  }

  const allDone = completedCount === totalControls

  return (
    <div>
      {/* Session header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Control validation session</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {completedCount} of {totalControls} controls validated
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#f5f3ff', color: '#5b21b6', fontWeight: 500 }}>
          CoPrompt session
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, alignItems: 'center' }}>
        {controlNodes.map((n, idx) => (
          <div
            key={n.node_id}
            onClick={() => setCurrentIdx(idx)}
            title={n.name}
            style={{
              flex: 1, height: 4, borderRadius: 2, cursor: 'pointer',
              background: completed[n.node_id] === 'flagged' ? '#fde68a' :
                          completed[n.node_id] ? '#639922' :
                          idx === currentIdx ? '#111' : '#e5e7eb'
            }}
          />
        ))}
        <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', whiteSpace: 'nowrap', marginLeft: 8 }}>
          {currentIdx + 1} / {totalControls}
        </div>
      </div>

      {allDone ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#166534', marginBottom: 8 }}>All controls validated</div>
          <div style={{ fontSize: 13, color: '#15803d', marginBottom: 16 }}>
            {Object.values(completed).filter(v => v === 'flagged').length > 0
              ? `${Object.values(completed).filter(v => v === 'flagged').length} flagged for group discussion — session can proceed with conservative assumptions on flagged items.`
              : 'Gate complete. Engine 3 can now run reconstruction and simulation.'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={{ padding: '10px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              Proceed to reconstruction →
            </button>
            <button onClick={() => { setCurrentIdx(0) }} style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Review validations
            </button>
          </div>
        </div>
      ) : current ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{current.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af' }}>{current.node_id}</span>
                {current.control?.agent_assessment?.probable_type && (
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: '#ede9fe', color: '#5b21b6', fontWeight: 500 }}>
                    {current.control.agent_assessment.probable_type}?
                  </span>
                )}
                {current.control?.agent_assessment?.confidence < 0.65 && (
                  <span style={{ fontSize: 11, color: '#d97706' }}>⚠ Low confidence — validate carefully</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af' }}>
              Control {currentIdx + 1} of {totalControls}
            </div>
          </div>

          {/* What the document says */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>What the document says</div>
            <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', borderLeft: '3px solid #e5e7eb', padding: '8px 12px', borderRadius: '0 4px 4px 0', lineHeight: 1.6, fontStyle: 'italic' }}>
              {current.source?.raw_text || current.description || 'No source text available'}
            </div>
          </div>

          {/* Agent assessment */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Agent assessment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Probable type', value: current.control?.agent_assessment?.probable_type || 'Not assessed' },
                { label: 'Risk mitigated', value: current.control?.agent_assessment?.risk_mitigated || 'Not assessed' },
                { label: 'Regulatory trigger', value: current.control?.agent_assessment?.regulatory_trigger_detected ? `Yes — ${current.control?.agent_assessment?.regulatory_reference || 'reference not specified'}` : 'Not detected' },
                { label: 'Automation potential', value: current.control?.agent_assessment?.automation_potential || 'Not assessed' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
            {current.control?.agent_assessment?.confidence !== undefined && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                  Confidence: {Math.round((current.control.agent_assessment.confidence || 0) * 100)}%
                </div>
                <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, maxWidth: 200 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: (current.control.agent_assessment.confidence || 0) < 0.65 ? '#f59e0b' : '#639922', width: `${Math.round((current.control.agent_assessment.confidence || 0) * 100)}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Human gate questions */}
          {current.control?.agent_assessment?.human_gate_questions?.length > 0 && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Questions for this session</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {current.control.agent_assessment.human_gate_questions.map((q, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af', paddingTop: 1, flexShrink: 0 }}>Q{idx + 1}</span>
                    <div>
                      <span style={{ fontSize: 13, color: '#111', lineHeight: 1.6 }}>
                        {typeof q === 'string' ? q : q.question || JSON.stringify(q)}
                      </span>
                      {q.category && (
                        <span style={{ fontSize: 10, marginLeft: 8, padding: '1px 5px', borderRadius: 3, background: '#f3f4f6', color: '#6b7280' }}>{q.category}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classification */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Your classification</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {CLASSES.map(cls => {
                const selected = selections[current.node_id] === cls
                const colors = classColors[cls]
                return (
                  <button
                    key={cls}
                    onClick={() => setSelections({ ...selections, [current.node_id]: cls })}
                    style={{
                      padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                      fontFamily: 'monospace', fontSize: 12, fontWeight: 500,
                      border: selected ? `2px solid ${colors.color}` : '1px solid #e5e7eb',
                      background: selected ? colors.bg : '#fff',
                      color: selected ? colors.color : '#6b7280',
                      transition: 'all 0.15s'
                    }}
                  >
                    {cls}
                  </button>
                )
              })}
            </div>
            <textarea
              value={notes[current.node_id] || ''}
              onChange={e => setNotes({ ...notes, [current.node_id]: e.target.value })}
              placeholder="Notes — policy reference, threshold recommendation, dissenting view, caveats..."
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, resize: 'none', height: 72, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Validated by</div>
              <input
                type="text"
                value={validator}
                onChange={e => setValidator(e.target.value)}
                placeholder="Name"
                style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', width: 140, fontFamily: 'inherit' }}
              />
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="Role"
                style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', width: 160, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleConfirm}
              disabled={!selections[current.node_id]}
              style={{ padding: '9px 18px', background: selections[current.node_id] ? '#111' : '#e5e7eb', color: selections[current.node_id] ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8, fontSize: 13, cursor: selections[current.node_id] ? 'pointer' : 'not-allowed', fontWeight: 500 }}
            >
              Confirm and next →
            </button>
            <button
              onClick={handleFlag}
              style={{ padding: '9px 14px', background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
              Flag for group discussion
            </button>
            {currentIdx > 0 && (
              <button
                onClick={() => setCurrentIdx(currentIdx - 1)}
                style={{ padding: '9px 14px', background: 'transparent', color: '#9ca3af', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Validated summary */}
      {completedCount > 0 && (
        <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Validated so far
          </div>
          {controlNodes.filter(n => completed[n.node_id]).map(n => {
            const cls = selections[n.node_id]
            const colors = cls ? classColors[cls] : { bg: '#fef9c3', color: '#854d0e' }
            const isFlagged = completed[n.node_id] === 'flagged'
            return (
              <div key={n.node_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f9fafb', fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{n.name}</span>
                  {notes[n.node_id] && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{notes[n.node_id]}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {validator && <span style={{ fontSize: 11, color: '#9ca3af' }}>{validator}</span>}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500, background: isFlagged ? '#fef9c3' : colors.bg, color: isFlagged ? '#854d0e' : colors.color }}>
                    {isFlagged ? 'Flagged' : cls}
                  </span>
                  <button
                    onClick={() => setCurrentIdx(controlNodes.indexOf(n))}
                    style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
function PlaceholderScreen({ label, graph }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: '#111' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#9ca3af' }}>
        {graph ? `Graph loaded — ${graph.nodes?.length} nodes ready to render` : 'Run extraction first to load a process'}
      </div>
    </div>
  )
}