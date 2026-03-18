function useAuth() {
  const [session, setSession] = React.useState(undefined); // undefined = loading
  const [profile, setProfile] = React.useState(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      .then(({ data, error }) => {
        if (error) console.error('profile load error:', error);
        else setProfile(data);
      });
  }, [session]);

  return { session, profile, setProfile };
}
