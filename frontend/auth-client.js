(function() {
  const config = window.__SUPABASE_CONFIG__;
  if (!config || !window.supabase?.createClient) {
    throw new Error('Supabase browser configuration could not be loaded.');
  }

  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      flowType: 'pkce'
    }
  });
  window.mcSupabase = client;

  window.mcAuthReady = new Promise((resolve) => {
    client.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        sessionStorage.setItem('mc_token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('mc_token');
        sessionStorage.removeItem('mc_user');
      }

      if (event === 'INITIAL_SESSION') resolve(session);
    });
  });

  window.mcSignOut = async function() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_user');
    window.location.href = 'index.html';
  };
})();
