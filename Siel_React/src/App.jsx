import React from 'react';
import Survey from './components/Survey';

function App() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Siel</h1>
        <p>Digital Biographer</p>
      </header>
      <main className="app-main">
        <Survey />
      </main>
    </div>
  );
}

export default App;
