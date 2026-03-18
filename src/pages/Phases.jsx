function PhasesPage({ user, profile, setPage, setActiveTopic }) {
  const [course,   setCourse]   = React.useState(null);
  const [phases,   setPhases]   = React.useState([]);
  const [progress, setProgress] = React.useState({});
  const [topicProg,setTopicProg]= React.useState({});
  const [expanded, setExpanded] = React.useState({});
  const [loading,  setLoading]  = React.useState(true);

  const load = React.useCallback(async () => {
    if (!profile?.course_id) { setLoading(false); return; }

    // Init phase progress rows if first visit
    await supabase.rpc('init_phase_progress', {
      p_user_id: user.id,
      p_course_id: profile.course_id,
    });

    const [
      { data: courseData },
      { data: phasesData },
      { data: progressData },
      { data: topicProgressData },
    ] = await Promise.all([
      supabase.from('courses').select('*').eq('id', profile.course_id).single(),
      supabase.from('phases').select('*, resources(*, topics(*))').eq('course_id', profile.course_id).order('"order"'),
      supabase.from('phase_progress').select('*').eq('user_id', user.id),
      supabase.from('topic_progress').select('*').eq('user_id', user.id),
    ]);

    setCourse(courseData);
    setPhases(phasesData || []);
    const prog = {};
    (progressData || []).forEach(p => prog[p.phase_id] = p);
    setProgress(prog);
    const tp = {};
    (topicProgressData || []).forEach(t => tp[t.topic_id] = t);
    setTopicProg(tp);
    setLoading(false);
  }, [profile, user.id]);

  React.useEffect(() => {
    if (profile === null) return;
    load();
  }, [profile]);

  const handleTopicClick = async (topic) => {
    // Start topic — creates topic_progress row via DB function
    await supabase.rpc('start_topic', { p_user_id: user.id, p_topic_id: topic.id });
    setActiveTopic(topic.id);
    setPage(ROUTES.TOPIC);
  };

  const statusColor = s => ({
    completed:   'var(--status-completed)',
    in_progress: 'var(--status-inprogress)',
    unlocked:    'var(--status-unlocked)',
    locked:      'var(--status-locked)',
  })[s] || 'var(--status-locked)';

  const statusLabel = s => ({
    completed: 'Completed', in_progress: 'In Progress', unlocked: 'Unlocked', locked: 'Locked',
  })[s] || 'Locked';

  // Compute real completion % from topic_progress
  const phaseCompletion = (phase) => {
    const topics = phase.resources?.flatMap(r => r.topics || []) || [];
    if (!topics.length) return 0;
    const done = topics.filter(t => topicProg[t.id]?.status === 'completed').length;
    return Math.round((done / topics.length) * 100);
  };

  const topicStatusColor = (topicId) => {
    const s = topicProg[topicId]?.status;
    if (s === 'completed')   return 'var(--status-completed)';
    if (s === 'in_progress') return 'var(--status-inprogress)';
    return 'var(--border-1)';
  };

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
          const pct    = phaseCompletion(phase);
          const isOpen = expanded[phase.id];
          const isLocked = status === 'locked';
          const topics = phase.resources?.flatMap(r => r.topics || []) || [];

          return (
            <div key={phase.id} className={`phase-card status-${status}`}>
              <div className="phase-header"
                onClick={() => !isLocked && setExpanded(e => ({ ...e, [phase.id]: !e[phase.id] }))
                }
                style={{ cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? .65 : 1 }}>
                <div className="phase-num"
                  style={{ color: statusColor(status), background: isLocked ? 'var(--bg-4)' : 'var(--bg-5)' }}>
                  {isLocked ? '🔒' : idx + 1}
                </div>
                <div className="phase-title-wrap">
                  <div className="phase-name">{phase.title}</div>
                  <div className="phase-meta">
                    {topics.length} topics
                    {pct > 0 && ` · ${pct}% complete`}
                    {` · Min pass ${phase.min_pass_pct}%`}
                  </div>
                </div>
                <span className="phase-status-badge"
                  style={{ background: `${statusColor(status)}18`, color: statusColor(status) }}>
                  {statusLabel(status)}
                </span>
                {!isLocked && (
                  <span style={{ color: 'var(--text-2)', marginLeft: 8, fontSize: 11 }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                )}
              </div>

              <div className="phase-progress-bar">
                <div className="phase-progress-fill" style={{ width: pct + '%' }} />
              </div>

              {isOpen && !isLocked && (
                <div className="phase-body">
                  {phase.resources?.map(resource => (
                    <div key={resource.id}>
                      <div style={{
                        padding: '10px 18px 4px',
                        fontSize: 11, color: 'var(--text-2)',
                        fontFamily: 'var(--font-code)',
                        textTransform: 'uppercase', letterSpacing: '.08em',
                        borderTop: '1px solid var(--border-0)',
                      }}>
                        {resource.title}
                      </div>
                      <div className="phase-topics">
                        {(resource.topics || []).map(topic => {
                          const tStatus = topicProg[topic.id]?.status;
                          return (
                            <div key={topic.id} className="topic-row"
                              onClick={() => handleTopicClick(topic)}>
                              <div className="topic-status-dot"
                                style={{ background: topicStatusColor(topic.id) }} />
                              <span className="topic-title">{topic.title}</span>
                              {tStatus === 'completed' && (
                                <span style={{ fontSize: 11, color: 'var(--status-completed)', fontFamily: 'var(--font-code)' }}>✓</span>
                              )}
                              {tStatus === 'in_progress' && (
                                <span style={{ fontSize: 11, color: 'var(--status-inprogress)', fontFamily: 'var(--font-code)' }}>…</span>
                              )}
                              <span className={`topic-level-badge level-${topic.level}`}>{topic.level}</span>
                            </div>
                          );
                        })}
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
