function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-toggle">
      {THEMES.map(t => (
        <button key={t.id}
          className={`tt-btn${theme === t.id ? ' active' : ''}`}
          onClick={() => setTheme(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TopNav({ user, profile, route, topicId, theme, setTheme }) {
  const { elapsed, idle, active } = usePunchClock(user?.id, topicId);
  const emailPrefix = profile?.email ? profile.email.split('@')[0] : '';
  const initials = (profile?.name || emailPrefix || 'U').slice(0, 2).toUpperCase();

  return (
    <nav className="topnav">
      <div className="topnav-brand">
        Prograde
        {route && route !== 'dashboard' && (
          <>
            <span className="sep"> / </span>
            <span className="page-crumb">
              {route.charAt(0).toUpperCase() + route.slice(1).replace(/-/g, ' ').replace(/\//g, ' / ')}
            </span>
          </>
        )}
      </div>
      <div className="topnav-right">
        <ThemeToggle theme={theme} setTheme={setTheme} />
        {active && (
          <div className="punch-clock">
            <div className={`dot${idle ? ' idle' : ''}`} />
            <span>{elapsed}</span>
            {idle && <span style={{ color: 'var(--warn)', fontSize: 10 }}>idle</span>}
          </div>
        )}
        <div className="avatar">{initials}</div>
      </div>
    </nav>
  );
}
