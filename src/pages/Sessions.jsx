function SessionsPage({ user }) {
  const [sessions, setSessions] = React.useState([]);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    supabase.from('sessions').select('*, topics(title)').eq('user_id', user.id)
      .order('punched_in_at', { ascending: false }).limit(50)
      .then(({ data }) => { setSessions(data || []); setLoading(false); });
  }, []);

  const fmt     = s => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—';
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }) : '—';

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">Time Log</div>
        <div className="page-sub">All tracked study sessions with duration and topic.</div>
      </div>
      <div style={{ padding: '20px 28px' }}>
        {loading
          ? <div className="spinner" />
          : sessions.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">⏱</div>
                <div className="empty-title">No sessions yet</div>
                <div className="empty-sub">Start a topic to begin time tracking.</div>
              </div>
            )
            : (
              <table className="data-table">
                <thead>
                  <tr><th>Topic</th><th>Punched In</th><th>Duration</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td>{s.topics?.title || '—'}</td>
                      <td className="mono-cell">{fmtDate(s.punched_in_at)}</td>
                      <td className="mono-cell">{fmt(s.duration_sec)}</td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-code)', fontSize: 10, padding: '2px 6px', borderRadius: 3,
                          background: s.stale ? 'var(--warn-dim)'    : 'var(--success-dim)',
                          color:      s.stale ? 'var(--warn)'        : 'var(--success)',
                        }}>{s.stale ? 'stale' : 'complete'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </div>
  );
}
