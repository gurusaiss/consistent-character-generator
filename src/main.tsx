import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { isSupabaseConfigured } from './lib/supabase';
import './index.css';

function ConfigError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#07071a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', padding: '24px',
    }}>
      <div style={{
        maxWidth: '520px', background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '32px',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚙️</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Configuration Required</h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
          ConsistentAI can't connect to its backend. The following environment
          variables are missing or invalid:
        </p>
        <ul style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 2, marginBottom: '16px', paddingLeft: '20px' }}>
          <li><code style={{ color: '#a5b4fc' }}>VITE_SUPABASE_URL</code></li>
          <li><code style={{ color: '#a5b4fc' }}>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>
          Copy <code style={{ color: '#a5b4fc' }}>.env.example</code> to <code style={{ color: '#a5b4fc' }}>.env</code>,
          fill in your Supabase project credentials, and restart the dev server.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSupabaseConfigured ? <App /> : <ConfigError />}
  </React.StrictMode>
);
