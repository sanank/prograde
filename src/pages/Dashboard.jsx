function DashboardPage({ user, profile, setPage, setActiveTopic }) {
  const [stats,    setStats]    = React.useState(null);
  const [recent,   setRecent]   = React.useState([]);
  const [overview, setOverview] = React.useState(null);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      const [
        { count: topicsDone },
        { count: topicsTotal },
        { data: sessionsData },
        { data: recentTopics },
      ] = await Promise.all([
        supabase.from('topic_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('topic_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase.from('sessions').select('duration_sec')
          .eq('user_id', user.id).not('duration_sec', 'is', null),
        supabase.from('topic_progress')
          .select('*, topics(title, level, resources(title, phases(title)))')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(3),
      ]);

      const minutes = Math.round(
        (sessionsData || []).reduce((a, s) => a + (s.duration_sec || 0), 0) / 60
      );
      const pct = topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 100) : 0;
      setStats({ topicsDone: topicsDone || 0, topicsTotal: topicsTotal || 0, pct, minutes, sessions: (sessionsData || []).length });
      setRecent(recentTopics || []);

      if (profile?.course_id) {
        const [{ data: phases }, { data: progress }] = await Promise.all([
          supabase.from('phases').select('id, title, "order"').eq('course_id', profile.course_id).order('order'),
          supabase.from('phase_progress').select('*').eq('user_id', user.id),
        ]);
        const prog = {};
        (progress || []).forEach(p => prog[p.phase_id] = p);
        setOverview({ phases: phases || [], prog });
      }
      setLoading(false);
    };
    load();
  }, [user.id, profile?.course_id]);

  const emailPrefix = profile?.email ? profile.email.split('@')[0] : '';
  const name = profile?.name || emailPrefix;

  const statusColor = s => ({
    completed: 'var(--status-completed)', in_progress: 'var(--status-inprogress)',
    unlocked: 'var(--status-unlocked)', locked: 'var(--status-locked)',
  })[s] || 'var(--status-locked)';

  const statusLabel = s => ({ completed: 'Done', in_progress: 'Active', unlocked: 'Ready', locked: 'Locked' })[s] || 'Locked';

  if (loading) return (
    <div className="main-content">
      <div className="loading-screen" style={{ flex: 1 }}><div className="spinner" /></div>
    </div>
  );

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">Welcome back, {name}</div>
        <div className="page-sub">
          {stats.topicsTotal > 0
            ? `${stats.topicsDone} of ${stats.topicsTotal} topics complete · ${stats.pct}% through your course`
            : 'Start a topic to begin tracking your progress'}
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Topics Done',     value: stats.topicsDone, color: 'var(--accent)'  },
          { label: 'Study Sessions',  value: stats.sessions,   color: 'var(--info)'    },
          { label: 'Minutes Studied', value: stats.minutes,    color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {overview && overview.phases.length > 0 && (
        <div className="phase-map" style={{ paddingTop: 0 }}>
          <div className="phase-map-title">Course phases</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {overview.phases.map((ph, idx) => {
              const prog = overview.prog[ph.id];
              const status = prog?.status || 'locked';
              const fillPct = status === 'completed' ? 100 : status === 'in_progress' ? 45 : 0;
              return (
                <div key={ph.id} className={`phase-card status-${status}`}
                  style={{ cursor: 'pointer' }} onClick={() => setPage(ROUTES.PHASES)}>
                  <div className="phase-header" style={{ padding: '12px 16px' }}>
                    <div className="phase-num" style={{ color: statusColor(status), background: 'var(--bg-4)' }}>
                      {idx + 1}
                    </div>
                    <div className="phase-title-wrap">
                      <div className="phase-name">{ph.title}</div>
                    </div>
                    <span className="phase-status-badge"
                      style={{ background: `${statusColor(status)}18`, color: statusColor(status) }}>
                      {statusLabel(status)}
                    </span>
                  </div>
                  <div className="phase-progress-bar">
                    <div className="phase-progress-fill" style={{ width: fillPct + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="phase-map">
          <div className="phase-map-title">Continue where you left off</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recent.map(tp => (
              <div key={tp.topic_id} className="phase-card" style={{ cursor: 'pointer' }}
                onClick={() => { setActiveTopic(tp.topic_id); setPage(ROUTES.TOPIC); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: tp.status === 'completed' ? 'var(--status-completed)' : 'var(--status-inprogress)',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-0)' }}>{tp.topics?.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-code)', marginTop: 2 }}>
                      {tp.topics?.resources?.phases?.title}
                    </div>
                  </div>
                  <span className={`topic-level-badge level-${tp.topics?.level}`}>{tp.topics?.level}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div className="phase-map">
          <div className="phase-map-title">Get started</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {[
              { icon: '⬡', title: 'My Course',  sub: 'View phases and start a topic', page: ROUTES.PHASES   },
              { icon: '⏱', title: 'Time Log',   sub: 'Review study sessions',          page: ROUTES.SESSIONS },
            ].map(c => (
              <div key={c.page} className="admin-card" onClick={() => setPage(c.page)}>
                <div className="admin-card-icon">{c.icon}</div>
                <div className="admin-card-title">{c.title}</div>
                <div className="admin-card-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
