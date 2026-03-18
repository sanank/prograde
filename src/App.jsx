const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

function App() {
  const { session, profile }  = useAuth();
  const { toasts, show: toast } = useToast();
  const [page,        setPage]        = React.useState(ROUTES.DASHBOARD);
  const [activeTopic, setActiveTopic] = React.useState(null);
  const [theme,       setTheme]       = React.useState(() => localStorage.getItem('pg-theme') || 'vscode');

  // Apply theme to <html>
  React.useEffect(() => {
    const el = document.documentElement;
    if (theme === 'vscode') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', theme);
    localStorage.setItem('pg-theme', theme);
  }, [theme]);

  // Loading
  if (session === undefined) return (
    <div className="loading-screen">
      <div className="loading-logo">prograde</div>
      <div className="spinner" />
    </div>
  );

  // Unauthenticated
  if (!session) return <AuthPage />;

  const routeLabel = ROUTE_LABELS[page] || page;

  const renderPage = () => {
    if (profile === null) return (
      <div className="loading-screen" style={{ flex: 1 }}><div className="spinner" /></div>
    );
    switch (page) {
      case ROUTES.DASHBOARD:       return <DashboardPage       user={session.user} profile={profile} setPage={setPage} />;
      case ROUTES.PHASES:          return <PhasesPage          user={session.user} profile={profile} setPage={setPage} setActiveTopic={setActiveTopic} />;
      case ROUTES.SESSIONS:        return <SessionsPage        user={session.user} />;
      case ROUTES.TOPIC:           return <TopicPage           topicId={activeTopic} setPage={setPage} />;
      case ROUTES.ADMIN:           return <AdminHomePage       setPage={setPage} />;
      case ROUTES.ADMIN_COURSES:   return <AdminCoursesPage    user={session.user} toast={toast} />;
      case ROUTES.ADMIN_USERS:     return <AdminUsersPage      toast={toast} />;
      case ROUTES.ADMIN_ANALYTICS: return <AdminAnalyticsPage  />;
      default:                     return <DashboardPage       user={session.user} profile={profile} setPage={setPage} />;
    }
  };

  return (
    <AppCtx.Provider value={{ session, profile, toast }}>
      <TopNav
        user={session.user}
        profile={profile}
        route={routeLabel}
        topicId={activeTopic}
        theme={theme}
        setTheme={setTheme}
      />
      <div className="app-shell">
        <Sidebar profile={profile} page={page} setPage={setPage} />
        {renderPage()}
      </div>
      <ToastContainer toasts={toasts} />
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
