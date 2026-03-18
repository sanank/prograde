function TopicPage({ topicId, setPage }) {
  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">Topic Viewer</div>
        <div className="page-sub">Notes · Resources · IDE · Challenges — Phase C</div>
      </div>
      <div style={{ padding: 28 }}>
        <div style={{
          background: 'var(--bg-2)', border: '1px dashed var(--border-1)',
          borderRadius: 'var(--radius-md)', padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-code)', color: 'var(--accent)', fontSize: 13, marginBottom: 8 }}>
            topic_id: {topicId}
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Full topic viewer builds in Phase C.
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setPage(ROUTES.PHASES)}>
            ← Back to phases
          </button>
        </div>
      </div>
    </div>
  );
}
