function PhasesPage({ user, profile, setPage, setActiveTopic }) {
  const [course,   setCourse]   = React.useState(null);
  const [phases,   setPhases]   = React.useState([]);
  const [progress, setProgress] = React.useState({});
  const [expanded, setExpanded] = React.useState({});
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    if (profile === null) return; // still loading
    const load = async () => {
      if (!profile?.course_id) { setLoading(false); return; }
      const [{ data: courseData }, { data: phasesData }, { data: progressData }] = await Promise.all([
        supabase.from('courses').select('*').eq('id', profile.course_id).single(),
        supabase.from('phases').select('*, resources(*, topics(*))').eq('course_id', profile.course_id).order('order'),
        supabase.from('phase_progress').select('*').eq('user_id', user.id),
      ]);
      setCourse(courseData);
      setPhases(phasesData || []);
      const prog = {};
      (progressData || []).forEach(p => prog[p.phase_id] = p);
      setProgress(prog);
      setLoading(false);
    };
    load();
  }, [profile]);

  const statusColor = s => ({
    completed:   'var(--status-completed)',
    in_progress: 'var(--status-inprogress)',
    unlocked:    'var(--status-unlocked)',
    locked:      'var(--status-locked)',
  })[s] || 'var(--status-locked)';

  const statusLabel = s => ({
    completed:   'Completed',
    in_progress: 'In Progress',
    unlocked:    'Unlocked',
    locked:      'Locked',
  })[s] || 'Locked';

  const progressPct = s => ({ completed: 100, in_progress: 45 })[s] || 0;

  if (loading) return (
    <div className="main-content">
      <div className="loading-screen" style={{ flex: 1 }}><div className="spinner" /></div>
    </div>
  );

  if (!profile?.course_id) return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">No course assigned</div>
        <div className="page-sub">Ask your admin to assign you to a course.</div>
      </div>
      <div className="empty-state">
        <div className="empty-icon">◈</div>
        <div className="empty-title">Not enrolled yet</div>
        <div className="empty-sub">Your admin needs to assign you to a course.</div>
      </div>
    </div>
  );

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">{course?.title}</div>
        <div className="page-sub">{course?.role_title} · {phases.length} phases</div>
      </div>
      <div className="phase-map">
        {phases.map((phase, idx) => {
          const prog   = progress[phase.id];
          const status = prog?.status || 'locked';
          const topics = phase.resources?.flatMap(r => r.topics || []) || [];
          const isOpen = expanded[phase.id];

          return (
            <div key={phase.id} className={`phase-card status-${status}`}>
              <div className="phase-header"
                onClick={() => setExpanded(e => ({ ...e, [phase.id]: !e[phase.id] }))}>
                <div className="phase-num"
                  style={{ color: statusColor(status), background: status === 'locked' ? 'var(--bg-4)' : 'var(--bg-5)' }}>
                  {idx + 1}
                </div>
                <div className="phase-title-wrap">
                  <div className="phase-name">{phase.title}</div>
                  <div className="phase-meta">{topics.length} topics · Min pass {phase.min_pass_pct}%</div>
                </div>
                <span className="phase-status-badge"
                  style={{ background: `${statusColor(status)}18`, color: statusColor(status) }}>
                  {statusLabel(status)}
                </span>
                <span style={{ color: 'var(--text-2)', marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              <div className="phase-progress-bar">
                <div className="phase-progress-fill" style={{ width: progressPct(status) + '%' }} />
              </div>

              {isOpen && (
                <div className="phase-body">
                  {phase.resources?.map(resource => (
                    <div key={resource.id}>
                      <div style={{
                        padding: '10px 18px 4px',
                        fontSize: 11, color: 'var(--text-2)',
                        fontFamily: 'var(--font-code)',
                        textTransform: 'uppercase', letterSpacing: '.08em',
                      }}>
                        {resource.title}
                      </div>
                      <div className="phase-topics">
                        {(resource.topics || []).map(topic => (
                          <div key={topic.id} className="topic-row"
                            onClick={() => { setActiveTopic(topic.id); setPage(ROUTES.TOPIC); }}>
                            <div className="topic-status-dot"
                              style={{ background: status === 'locked' ? 'var(--status-locked)' : 'var(--accent)' }} />
                            <span className="topic-title">{topic.title}</span>
                            <span className={`topic-level-badge level-${topic.level}`}>{topic.level}</span>
                          </div>
                        ))}
                        {(resource.topics || []).length === 0 && (
                          <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-2)' }}>No topics yet</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {phases.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <div className="empty-title">No phases yet</div>
            <div className="empty-sub">The admin is still building the course.</div>
          </div>
        )}
      </div>
    </div>
  );
}
