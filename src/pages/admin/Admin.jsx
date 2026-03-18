function AdminHomePage({ setPage }) {
  const cards = [
    { icon: '◉', title: 'Courses',   sub: 'Create and manage courses, phases, topics',   page: ROUTES.ADMIN_COURSES   },
    { icon: '◎', title: 'Learners',  sub: 'Manage users, assign courses, view progress', page: ROUTES.ADMIN_USERS     },
    { icon: '▤', title: 'Analytics', sub: 'Cohort progress, time spent, quiz scores',    page: ROUTES.ADMIN_ANALYTICS },
  ];
  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">Admin Panel</div>
        <div className="page-sub">Configure courses, manage learners, analyse progress.</div>
      </div>
      <div className="admin-grid">
        {cards.map(c => (
          <div key={c.page} className="admin-card" onClick={() => setPage(c.page)}>
            <div className="admin-card-icon">{c.icon}</div>
            <div className="admin-card-title">{c.title}</div>
            <div className="admin-card-sub">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCoursesPage({ user, toast }) {
  const [courses,  setCourses]  = React.useState([]);
  const [loading,  setLoading]  = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [form,     setForm]     = React.useState({ title: '', role_title: '', description: '' });

  const load = async () => {
    const { data } = await supabase.from('courses').select('*, phases(count)').order('created_at', { ascending: false });
    setCourses(data || []);
    setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const create = async e => {
    e.preventDefault();
    const { error } = await supabase.from('courses').insert({ ...form, created_by: user.id });
    if (error) { toast(error.message, 'error'); return; }
    toast('Course created', 'success');
    setCreating(false);
    setForm({ title: '', role_title: '', description: '' });
    load();
  };

  return (
    <div className="main-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">Courses</div>
          <div className="page-sub">Create and configure role-based learning paths.</div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setCreating(true)}>+ New course</button>
      </div>

      {creating && (
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-0)' }}>
          <form onSubmit={create} style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>New course</div>
            <input placeholder="Course title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            <input placeholder="Role title (e.g. Frontend Developer)" value={form.role_title} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))} required />
            <textarea placeholder="Description (optional)" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit">Create</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ padding: '20px 28px' }}>
        {loading ? <div className="spinner" /> : courses.length === 0
          ? <div className="empty-state"><div className="empty-icon">◉</div><div className="empty-title">No courses yet</div></div>
          : (
            <table className="data-table">
              <thead><tr><th>Title</th><th>Role</th><th>Phases</th><th>Created</th></tr></thead>
              <tbody>{courses.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.title}</td>
                  <td><span style={{ fontFamily: 'var(--font-code)', fontSize: 11, background: 'var(--info-dim)', color: 'var(--info)', padding: '2px 7px', borderRadius: 3 }}>{c.role_title}</span></td>
                  <td className="mono-cell">{c.phases?.[0]?.count ?? 0}</td>
                  <td className="mono-cell" style={{ color: 'var(--text-2)' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}</tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

function AdminUsersPage({ toast }) {
  const [users,   setUsers]   = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    const [{ data: u }, { data: c }] = await Promise.all([
      supabase.from('user_profiles').select('*, courses(title)').order('created_at'),
      supabase.from('courses').select('id, title').order('title'),
    ]);
    setUsers(u || []); setCourses(c || []); setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const assignCourse = async (userId, courseId) => {
    const { error } = await supabase.from('user_profiles').update({ course_id: courseId || null }).eq('id', userId);
    if (error) toast(error.message, 'error'); else { toast('Course assigned', 'success'); load(); }
  };
  const setRole = async (userId, role) => {
    const { error } = await supabase.from('user_profiles').update({ role }).eq('id', userId);
    if (error) toast(error.message, 'error'); else { toast('Role updated', 'success'); load(); }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">Learners</div>
        <div className="page-sub">Manage user roles and course assignments.</div>
      </div>
      <div style={{ padding: '20px 28px' }}>
        {loading ? <div className="spinner" /> : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned Course</th></tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name || '—'}</td>
                <td className="mono-cell" style={{ fontSize: 12 }}>{u.email}</td>
                <td>
                  <select value={u.role || 'learner'} onChange={e => setRole(u.id, e.target.value)}
                    style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg-4)' }}>
                    <option value="learner">learner</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <select value={u.course_id || ''} onChange={e => assignCourse(u.id, e.target.value)}
                    style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg-4)', maxWidth: 200 }}>
                    <option value="">— unassigned —</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AdminAnalyticsPage() {
  const [stats, setStats] = React.useState(null);
  React.useEffect(() => {
    const load = async () => {
      const [{ count: users }, { count: topics }, { count: sessions }, { data: times }] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'learner'),
        supabase.from('topic_progress').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('duration_sec').not('duration_sec', 'is', null),
      ]);
      const totalMin = Math.round((times || []).reduce((a, s) => a + (s.duration_sec || 0), 0) / 60);
      setStats({ users, topics, sessions, totalMin });
    };
    load();
  }, []);

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-sub">Platform-wide learning metrics.</div>
      </div>
      {stats && (
        <div className="stat-grid">
          {[
            { label: 'Active Learners',   value: stats.users,    color: 'var(--accent)'  },
            { label: 'Topics Completed',  value: stats.topics,   color: 'var(--success)' },
            { label: 'Study Sessions',    value: stats.sessions, color: 'var(--info)'    },
            { label: 'Total Minutes',     value: stats.totalMin, color: 'var(--warn)'    },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '0 28px 28px' }}>
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border-0)',
          borderRadius: 'var(--radius-md)', padding: 24,
          textAlign: 'center', color: 'var(--text-2)', fontSize: 13,
        }}>
          Per-learner analytics, quiz scores, weak areas, and cohort views coming in Phase F.
        </div>
      </div>
    </div>
  );
}
