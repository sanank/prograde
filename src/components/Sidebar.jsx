function Sidebar({ profile, page, setPage }) {
  const [collapsed,    setCollapsed]    = React.useState(false);
  const [profileOpen,  setProfileOpen]  = React.useState(false);
  const isAdmin     = profile?.role === 'admin';
  const emailPrefix = profile?.email ? profile.email.split('@')[0] : '';
  const initials    = (profile?.name || emailPrefix || 'U').slice(0, 2).toUpperCase();
  const displayName = profile?.name || emailPrefix;

  React.useEffect(() => {
    if (!profileOpen) return;
    const handler = e => { if (!e.target.closest('.sidebar-footer')) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const learnerItems = [
    { id: ROUTES.DASHBOARD, icon: '◈', label: 'Dashboard' },
    { id: ROUTES.PHASES,    icon: '⬡', label: 'My Course' },
    { id: ROUTES.SESSIONS,  icon: '⏱', label: 'Time Log'  },
  ];
  const adminItems = [
    { id: ROUTES.ADMIN,            icon: '⚙', label: 'Admin Home' },
    { id: ROUTES.ADMIN_COURSES,    icon: '◉', label: 'Courses'    },
    { id: ROUTES.ADMIN_USERS,      icon: '◎', label: 'Learners'   },
    { id: ROUTES.ADMIN_ANALYTICS,  icon: '▤', label: 'Analytics'  },
  ];

  const NavItem = ({ item }) => (
    <button
      className={`sidebar-item${page === item.id ? ' active' : ''}`}
      onClick={() => setPage(item.id)}
      title={collapsed ? item.label : ''}>
      <span className="item-icon">{item.icon}</span>
      <span className="item-label">{item.label}</span>
    </button>
  );

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-section">
        {!collapsed && <div className="sidebar-label">Learner</div>}
        {learnerItems.map(item => <NavItem key={item.id} item={item} />)}
      </div>

      {isAdmin && (
        <div className="sidebar-section" style={{ borderTop: '1px solid var(--border-0)' }}>
          {!collapsed && <div className="sidebar-label" style={{ color: 'var(--warn)' }}>Admin</div>}
          {adminItems.map(item => <NavItem key={item.id} item={item} />)}
        </div>
      )}

      <div className="sidebar-footer">
        {profileOpen && (
          <div className="profile-menu">
            <div className="profile-menu-header">
              <div className="profile-menu-name">{displayName}</div>
              <div className="profile-menu-email">{profile?.email}</div>
              <span className="profile-menu-role" style={{
                background: isAdmin ? 'var(--warn-dim)' : 'var(--info-dim)',
                color:      isAdmin ? 'var(--warn)'     : 'var(--info)',
              }}>{profile?.role || 'learner'}</span>
            </div>
            <button className="profile-menu-item" onClick={() => { setPage(ROUTES.DASHBOARD); setProfileOpen(false); }}>
              <span>◈</span> Dashboard
            </button>
            <button className="profile-menu-item danger" onClick={() => { supabase.auth.signOut(); setProfileOpen(false); }}>
              <span>↪</span> Sign out
            </button>
          </div>
        )}

        <button className="sidebar-profile-btn"
          onClick={() => setProfileOpen(o => !o)}
          title={collapsed ? (displayName || profile?.email || '') : ''}>
          <div className="sidebar-profile-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-name">{displayName}</div>
              <div className="sidebar-profile-role">{profile?.role || 'learner'}</div>
            </div>
          )}
        </button>

        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}>
          <span style={{ fontSize: 12 }}>{collapsed ? '▶' : '◀'}</span>
          <span className="item-label" style={{ fontSize: 11 }}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
