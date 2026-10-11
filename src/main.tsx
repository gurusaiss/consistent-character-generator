import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { isSupabaseConfigured } from './lib/supabase';
import './index.css';

function ConfigError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#12100e', color: '#ece5d8', fontFamily: '"Hanken Grotesk", system-ui, sans-serif', padding: '24px',
    }}>
      <div style={{
        maxWidth: '520px', background: '#1a1714', border: '1px solid rgba(236,229,216,0.1)',
        borderRadius: '6px', padding: '32px',
      }}>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ff5a2c', marginBottom: '14px' }}>
          Setup needed
        </p>
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '28px', fontWeight: 500, marginBottom: '12px' }}>Missing configuration</h1>
        <p style={{ color: '#a39a8c', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
          ConsistentAI can't reach its backend. These environment variables are missing or invalid:
        </p>
        <ul style={{ color: '#c4bbab', fontSize: '14px', lineHeight: 2, marginBottom: '16px', paddingLeft: '20px' }}>
          <li><code style={{ color: '#ff8a66' }}>VITE_SUPABASE_URL</code></li>
          <li><code style={{ color: '#ff8a66' }}>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p style={{ color: '#867d71', fontSize: '13px', lineHeight: 1.6 }}>
          Copy <code style={{ color: '#ff8a66' }}>.env.example</code> to <code style={{ color: '#ff8a66' }}>.env</code>,
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
