function AuthPage() {
  const [email,   setEmail]   = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [status,  setStatus]  = React.useState(null);

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setLoading(false);
    if (error) setStatus({ type: 'error', msg: error.message });
    else setStatus({ type: 'success', msg: `Magic link sent to ${email}. Check your inbox.` });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Prograde<span className="dim">.dev</span></div>
        <div className="auth-tagline">Role-based professional learning platform</div>
        {status && <div className={`auth-alert ${status.type}`}>{status.msg}</div>}
        <form onSubmit={handleLogin}>
          <label className="auth-label">Email address</label>
          <input className="auth-input" type="email" placeholder="you@company.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Sending...' : 'Send magic link →'}
          </button>
        </form>
        <div className="auth-footer">No password needed. A login link will be sent to your email.</div>
      </div>
    </div>
  );
}
