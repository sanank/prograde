function TopicPage({ topicId, setPage, user }) {
  const [topic,      setTopic]      = React.useState(null);
  const [materials,  setMaterials]  = React.useState([]);
  const [challenges, setChallenges] = React.useState([]);
  const [quizQs,     setQuizQs]     = React.useState([]);
  const [progress,   setProgress]   = React.useState(null);
  const [tab,        setTab]        = React.useState('notes');
  const [loading,    setLoading]    = React.useState(true);

  // IDE state
  const [ideCode,    setIdeCode]    = React.useState('// Write JavaScript here\nconsole.log("Hello from Prograde IDE");');
  const [ideOutput,  setIdeOutput]  = React.useState('');
  const [ideErr,     setIdeErr]     = React.useState(false);

  // Challenge state
  const [chCode,     setChCode]     = React.useState({});
  const [chResults,  setChResults]  = React.useState({});
  const [hintOpen,   setHintOpen]   = React.useState({});

  // Punch clock
  const { elapsed, idle, active } = usePunchClock(user?.id, topicId);

  React.useEffect(() => {
    if (!topicId) return;
    const load = async () => {
      const [
        { data: topicData },
        { data: mats },
        { data: chs },
        { data: qs },
        { data: prog },
      ] = await Promise.all([
        supabase.from('topics').select('*, resources(title, phases(title))').eq('id', topicId).single(),
        supabase.from('topic_materials').select('*').eq('topic_id', topicId).order('order'),
        supabase.from('challenges').select('*').eq('topic_id', topicId).order('order'),
        supabase.from('quiz_questions').select('*').eq('topic_id', topicId).order('round'),
        supabase.from('topic_progress').select('*').eq('topic_id', topicId).eq('user_id', user.id).single(),
      ]);
      setTopic(topicData);
      setMaterials(mats || []);
      setChallenges(chs || []);
      setQuizQs(qs || []);
      setProgress(prog);
      // Pre-fill challenge code editors with starter code
      const starterMap = {};
      (chs || []).forEach(c => { starterMap[c.id] = c.starter_code || ''; });
      setChCode(starterMap);
      setLoading(false);
    };
    load();
  }, [topicId]);

  // ── IDE runner ────────────────────────────────────────────────
  const runIDE = () => {
    const logs = [];
    const origLog   = console.log;
    const origError = console.error;
    const origWarn  = console.warn;
    console.log   = (...a) => logs.push('→ ' + a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '));
    console.error = (...a) => logs.push('✗ ' + a.join(' '));
    console.warn  = (...a) => logs.push('⚠ ' + a.join(' '));
    try {
      // eslint-disable-next-line no-new-func
      new Function(ideCode)();
      setIdeOutput(logs.length ? logs.join('\n') : '(no output)');
      setIdeErr(false);
    } catch (e) {
      setIdeOutput('✗ ' + e.toString());
      setIdeErr(true);
    } finally {
      console.log   = origLog;
      console.error = origError;
      console.warn  = origWarn;
    }
  };

  // ── Challenge runner ──────────────────────────────────────────
  const runChallenge = async (ch) => {
    const code = chCode[ch.id] || '';
    let passed = false;
    try {
      // test_fn is stored as a JS expression that receives `code` and returns boolean
      // eslint-disable-next-line no-new-func
      passed = new Function('code', `try { return (${ch.test_fn}); } catch(e){ return false; }`)(code);
    } catch (e) {
      passed = false;
    }
    setChResults(r => ({ ...r, [ch.id]: passed }));

    // Persist to DB
    if (user) {
      await supabase.from('challenge_submissions').upsert({
        user_id: user.id,
        challenge_id: ch.id,
        code,
        passed,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'user_id,challenge_id' });
    }
  };

  // ── Mark complete ─────────────────────────────────────────────
  const markComplete = async () => {
    if (user && topicId) {
      await supabase.rpc('complete_topic', { p_user_id: user.id, p_topic_id: topicId });
      setProgress(p => ({ ...p, status: 'completed' }));
    }
  };

  // ── Render notes_md as HTML ───────────────────────────────────
  const renderNotes = (md) => {
    if (!md) return '<p style="color:var(--text-2)">No notes for this topic yet.</p>';
    return md
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre class="notes-code"><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
      .replace(/^### (.+)$/gm, '<h3 class="notes-h3">$1</h3>')
      .replace(/^## (.+)$/gm,  '<h2 class="notes-h2">$1</h2>')
      .replace(/^# (.+)$/gm,   '<h1 class="notes-h1">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="notes-inline">$1</code>')
      .replace(/^> (.+)$/gm, '<div class="notes-callout">$1</div>')
      .replace(/\n\n/g, '</p><p class="notes-p">')
      .replace(/^(?!<[hpd])(.*\S.*)/gm, '<p class="notes-p">$1</p>');
  };

  const matTypeIcon = t => ({ article:'◎', video:'▶', sandbox:'⬡', docs:'◈', exercise:'✎' })[t] || '◎';

  if (loading) return (
    <div className="main-content">
      <div className="loading-screen" style={{ flex: 1 }}><div className="spinner" /></div>
    </div>
  );

  if (!topic) return (
    <div className="main-content">
      <div className="page-header"><div className="page-title">Topic not found</div></div>
      <div style={{ padding: 28 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setPage(ROUTES.PHASES)}>← Back</button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'notes',      label: 'Notes'                           },
    { id: 'resources',  label: `Resources (${materials.length})` },
    { id: 'ide',        label: 'IDE'                             },
    { id: 'challenges', label: `Challenges (${challenges.length})`},
  ];

  const isDone = progress?.status === 'completed';

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Topic header */}
      <div className="page-header" style={{ borderBottom: '1px solid var(--border-0)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--text-2)', marginBottom: 4 }}>
              <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => setPage(ROUTES.PHASES)}>
                ← {topic.resources?.phases?.title}
              </span>
              {' / '}{topic.resources?.title}
            </div>
            <div className="page-title">{topic.title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span className={`topic-level-badge level-${topic.level}`}>{topic.level}</span>
            {active && (
              <div className="punch-clock" style={{ fontSize: 11 }}>
                <div className={`dot${idle ? ' idle' : ''}`} />
                <span>{elapsed}</span>
              </div>
            )}
            {isDone
              ? <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--status-completed)' }}>✓ Completed</span>
              : <button className="btn btn-primary btn-sm" onClick={markComplete}>Mark complete</button>
            }
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-0)', background: 'var(--bg-1)', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px 18px', fontSize: 12, fontWeight: 500,
              color: tab === t.id ? 'var(--text-0)' : 'var(--text-2)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, fontFamily: 'var(--font-ui)', transition: 'color .12s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* ── NOTES ── */}
        {tab === 'notes' && (
          <div style={{ padding: '24px 32px', maxWidth: 760 }}>
            <style>{`
              .notes-h1{font-family:var(--font-serif);font-size:1.5rem;font-weight:600;color:var(--text-0);margin:0 0 4px}
              .notes-h2{font-family:var(--font-serif);font-size:1.15rem;font-weight:600;color:var(--text-0);margin:1.4rem 0 .4rem}
              .notes-h3{font-size:1rem;font-weight:600;color:var(--text-0);margin:1.2rem 0 .3rem;font-family:var(--font-ui)}
              .notes-p{font-size:14px;color:var(--text-1);line-height:1.8;margin:.6rem 0}
              .notes-code{background:var(--bg-2);border:1px solid var(--border-0);border-radius:var(--radius-sm);padding:1rem 1.1rem;font-family:var(--font-code);font-size:12px;color:var(--text-0);overflow-x:auto;line-height:1.7;margin:.75rem 0}
              .notes-inline{font-family:var(--font-code);font-size:12px;background:var(--bg-4);padding:1px 5px;border-radius:3px;color:var(--accent)}
              .notes-callout{background:var(--info-dim);border-left:3px solid var(--info);padding:.7rem 1rem;border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:13px;color:var(--info);margin:.75rem 0}
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: renderNotes(topic.notes_md) }} />
          </div>
        )}

        {/* ── RESOURCES ── */}
        {tab === 'resources' && (
          <div style={{ padding: 24 }}>
            {materials.length === 0
              ? <div className="empty-state"><div className="empty-title">No materials yet</div></div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 680 }}>
                  {materials.map(m => (
                    <div key={m.id} style={{
                      background: 'var(--bg-2)', border: '1px solid var(--border-0)',
                      borderRadius: 'var(--radius-md)', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-4)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13, color: 'var(--accent)', flexShrink: 0,
                      }}>{matTypeIcon(m.type)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-0)' }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-code)', marginTop: 2 }}>
                          {m.type} · {m.url.replace('https://','').split('/')[0]}
                        </div>
                      </div>
                      <a href={m.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-code)', whiteSpace: 'nowrap' }}>
                        Open ↗
                      </a>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── IDE ── */}
        {tab === 'ide' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
            {/* toolbar */}
            <div style={{
              background: 'var(--bg-1)', borderBottom: '1px solid var(--border-0)',
              padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-2)' }}>
                JavaScript Sandbox
              </span>
              <button className="btn btn-green btn-sm" style={{ marginLeft: 'auto' }} onClick={runIDE}>▶ Run</button>
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setIdeCode('// Write JavaScript here\nconsole.log("Hello!");'); setIdeOutput(''); }}>
                Reset
              </button>
            </div>
            {/* editor */}
            <textarea
              value={ideCode}
              onChange={e => setIdeCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const s = e.target.selectionStart;
                  const v = ideCode;
                  setIdeCode(v.substring(0, s) + '  ' + v.substring(e.target.selectionEnd));
                  requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; });
                }
              }}
              spellCheck={false}
              style={{
                flex: 1, background: 'var(--bg-0)', color: 'var(--text-0)',
                fontFamily: 'var(--font-code)', fontSize: 13, lineHeight: 1.7,
                padding: '1rem', border: 'none', resize: 'none', outline: 'none',
                minHeight: 240, tabSize: 2,
              }}
            />
            {/* divider */}
            <div style={{
              background: 'var(--bg-2)', borderTop: '1px solid var(--border-0)',
              borderBottom: '1px solid var(--border-0)',
              padding: '4px 14px', fontSize: 11,
              fontFamily: 'var(--font-code)', color: 'var(--text-2)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>▼ Output</span>
              <button onClick={() => setIdeOutput('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-2)' }}>
                Clear
              </button>
            </div>
            {/* output */}
            <pre style={{
              background: 'var(--bg-0)', color: ideErr ? 'var(--error)' : 'var(--text-1)',
              fontFamily: 'var(--font-code)', fontSize: 12, padding: '1rem',
              margin: 0, overflowY: 'auto', minHeight: 120, maxHeight: 220, lineHeight: 1.6,
            }}>
              {ideOutput || '// Run code to see output'}
            </pre>
          </div>
        )}

        {/* ── CHALLENGES ── */}
        {tab === 'challenges' && (
          <div style={{ padding: 24, maxWidth: 760 }}>
            {challenges.length === 0
              ? <div className="empty-state"><div className="empty-title">No challenges for this topic yet</div></div>
              : challenges.map((ch, i) => {
                const result  = chResults[ch.id];
                const hasHint = !!ch.hint;
                return (
                  <div key={ch.id} style={{
                    background: 'var(--bg-2)', border: '1px solid var(--border-0)',
                    borderRadius: 'var(--radius-md)', marginBottom: 16, overflow: 'hidden',
                    borderLeft: result === true ? '3px solid var(--status-completed)'
                              : result === false ? '3px solid var(--error)'
                              : '3px solid var(--border-0)',
                  }}>
                    {/* Challenge header */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-0)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-4)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontFamily: 'var(--font-code)',
                        fontSize: 11, color: 'var(--text-1)', flexShrink: 0,
                      }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-0)', marginBottom: 3 }}>{ch.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.55 }}>{ch.description}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span className={`topic-level-badge level-${ch.difficulty === 'easy' ? 'basic' : ch.difficulty === 'medium' ? 'intermediate' : 'advanced'}`}>
                          {ch.difficulty}
                        </span>
                        {result === true  && <span style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--status-completed)' }}>✓ Pass</span>}
                        {result === false && <span style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--error)' }}>✗ Fail</span>}
                      </div>
                    </div>
                    {/* Code editor */}
                    <textarea
                      value={chCode[ch.id] || ''}
                      onChange={e => setChCode(c => ({ ...c, [ch.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const s = e.target.selectionStart;
                          const v = chCode[ch.id] || '';
                          setChCode(c => ({ ...c, [ch.id]: v.substring(0, s) + '  ' + v.substring(e.target.selectionEnd) }));
                          requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; });
                        }
                      }}
                      spellCheck={false}
                      style={{
                        width: '100%', minHeight: 160, background: 'var(--bg-0)',
                        color: 'var(--text-0)', fontFamily: 'var(--font-code)',
                        fontSize: 12, padding: '12px 14px', border: 'none',
                        resize: 'vertical', outline: 'none', lineHeight: 1.65, tabSize: 2,
                        borderBottom: '1px solid var(--border-0)',
                      }}
                    />
                    {/* Actions */}
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => runChallenge(ch)}>▶ Run & Test</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => setChCode(c => ({ ...c, [ch.id]: ch.starter_code || '' }))}>
                        Reset
                      </button>
                      {hasHint && (
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => setHintOpen(h => ({ ...h, [ch.id]: !h[ch.id] }))}>
                          {hintOpen[ch.id] ? 'Hide hint' : 'Show hint'}
                        </button>
                      )}
                      {result === true  && <span style={{ fontSize: 12, color: 'var(--status-completed)', marginLeft: 4 }}>✓ All tests passed!</span>}
                      {result === false && <span style={{ fontSize: 12, color: 'var(--error)', marginLeft: 4 }}>✗ Tests failed — check your logic</span>}
                    </div>
                    {hintOpen[ch.id] && ch.hint && (
                      <div style={{
                        background: 'var(--warn-dim)', borderTop: '1px solid var(--border-0)',
                        padding: '10px 14px', fontSize: 12, color: 'var(--warn)', lineHeight: 1.6,
                      }}>
                        💡 {ch.hint}
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        )}
      </div>
    </div>
  );
}
