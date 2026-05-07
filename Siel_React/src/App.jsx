import React from 'react';
import Survey from './components/Survey';

function App() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="menu-trigger">☰</div>
        <h1>Siel</h1>
        <p>Biographer</p>
        <div className="user-profile">👤</div>
      </header>
      
      <main className="app-main">
        <div className="report-tag" style={{
          background: 'var(--pale-cyan)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '700',
          marginBottom: '16px',
          textTransform: 'uppercase'
        }}>
          Current Reflection Period
        </div>
        <Survey />
      </main>

      <nav className="bottom-nav">
        <div className="nav-item">
          <span className="icon">✦</span>
          <span>Reflect</span>
        </div>
        <div className="nav-item active">
          <span className="icon">📝</span>
          <span>Survey</span>
        </div>
        <div className="nav-item">
          <span className="icon">🖼️</span>
          <span>Gallery</span>
        </div>
        <div className="nav-item">
          <span className="icon">📚</span>
          <span>Archive</span>
        </div>
      </nav>
    </div>
  );
}

export default App;
