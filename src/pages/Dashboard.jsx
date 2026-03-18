function DashboardPage({ user, profile, setPage }) {
  const [stats,   setStats]   = React.useState({ done: 0, sessions: 0, minutes: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      const [{ count: done }, { data: sessions }] = await Promise.all([
        supabase.from('topic_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('sessions').select('duration_sec')
          .eq('user_id', user.id).not('duration_sec', 'is', null),
      ]);
      const minutes = Math.round((sessions || []).reduce((a, s) => a + (s.duration_sec || 0), 0) / 60);
      setStats({ done: done || 0, sessions: (sessions || []).length, minutes });
      setLoading(false);
    };
    load();
  }, [user.id]);

  const emailPrefix = profile?.email ? profile.email.split('@')[0] : '';
  const name = profile?.name || emailPrefix;
  const statColor = i => ['var(--accent)', 'var(--info)', 'var(--success)'][i];

  const quickLinks = [
    { icon: '⬡', title: 'My Course',  sub: 'View phase roadmap',     page: ROUTES.PHASES    },
    { icon: '⏱', title: 'Time Log',   sub: 'Review study sessions',  page: ROUTES.SESSIONS  },
  ];

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">Welcome back, {name}</div>
        <div className="page-sub">Track your progress, manage your time, stay on course.</div>
      </div>

      {loading
        ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : (
          <div className="stat-grid">
            {[
              { label: 'Topics Completed', value: stats.done     },
              { label: 'Study Sessions',   value: stats.sessions },
              { label: 'Minutes Studied',  value: stats.minutes  },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-value" style={{ color: statColor(i) }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )
      }

      <div className="phase-map">
        <div className="phase-map-title">Quick links</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {quickLinks.map(c => (
            <div key={c.page} className="admin-card" onClick={() => setPage(c.page)}>
              <div className="admin-card-icon">{c.icon}</div>
              <div className="admin-card-title">{c.title}</div>
              <div className="admin-card-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
