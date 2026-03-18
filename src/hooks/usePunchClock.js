const IDLE_MS = 5 * 60 * 1000;

function usePunchClock(userId, topicId) {
  const [sessionId, setSessionId]   = React.useState(null);
  const [elapsed,   setElapsed]     = React.useState(0);
  const [startTime, setStartTime]   = React.useState(null);
  const [idle,      setIdle]        = React.useState(false);
  const idleTimer = React.useRef(null);

  const resetIdle = React.useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);

  React.useEffect(() => {
    if (!userId || !topicId) return;
    supabase.from('sessions').insert({ user_id: userId, topic_id: topicId })
      .select().single()
      .then(({ data }) => { if (data) { setSessionId(data.id); setStartTime(Date.now()); } });
    resetIdle();
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => document.addEventListener(e, resetIdle));
    return () => {
      events.forEach(e => document.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer.current);
    };
  }, [userId, topicId]);

  React.useEffect(() => {
    if (!startTime) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  React.useEffect(() => {
    if (!idle || !sessionId) return;
    supabase.from('sessions').update({
      punched_out_at: new Date().toISOString(),
      duration_sec: elapsed,
      stale: true,
    }).eq('id', sessionId);
    setSessionId(null);
  }, [idle]);

  const punchOut = async () => {
    if (!sessionId) return;
    await supabase.from('sessions').update({
      punched_out_at: new Date().toISOString(),
      duration_sec: elapsed,
      stale: false,
    }).eq('id', sessionId);
    setSessionId(null);
    setElapsed(0);
  };

  const fmt = s => [
    String(Math.floor(s / 3600)).padStart(2, '0'),
    String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    String(s % 60).padStart(2, '0'),
  ].join(':');

  return { elapsed: fmt(elapsed), idle, active: !!sessionId, punchOut };
}
