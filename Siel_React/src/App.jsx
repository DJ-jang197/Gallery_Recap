import React, { useState } from 'react';
import GalleryUpload from './components/GalleryUpload';
import Survey from './components/Survey';
import SynthesisResult from './components/SynthesisResult';

const STEPS = {
  UPLOAD: 'UPLOAD',
  SURVEY: 'SURVEY',
  SYNTHESIS: 'SYNTHESIS'
};

function App() {
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [synthesizedContent, setSynthesizedContent] = useState('');
  const [includeVerse, setIncludeVerse] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleUploadComplete = () => {
    setCurrentStep(STEPS.SURVEY);
  };

  const handleSurveyComplete = (surveyState) => {
    setIncludeVerse(surveyState.wantsVerse);
    
    let mockProse = `The last two weeks have been a testament to your quiet resilience. While your energy levels dipped slightly during the mid-period, the photos from your gallery reveal moments of unexpected joy—a shared coffee, a sunset walk. Your reflection on "${surveyState.reflection}" suggests you're moving toward a place of deeper clarity.`;
    
    if (surveyState.wantsVerse) {
      mockProse += "\n\n---\n\"The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters.\" (Psalm 23:1-2 NIV)";
    }
    
    setSynthesizedContent(mockProse);
    setCurrentStep(STEPS.SYNTHESIS);
  };

  const handleReset = () => {
    setCurrentStep(STEPS.UPLOAD);
    setSynthesizedContent('');
  };

  const handleLogout = () => {
    localStorage.removeItem('siel_cadence');
    window.location.href = '/login';
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div 
          className="menu-trigger" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ cursor: 'pointer', position: 'absolute', left: '24px' }}
        >
          <div className="hamburger-lines">
            <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--deep-slate)', margin: '4px 0' }}></span>
            <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--deep-slate)', margin: '4px 0' }}></span>
            <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--deep-slate)', margin: '4px 0' }}></span>
          </div>
        </div>

        <h1 style={{ textAlign: 'center', margin: 0, width: '100%' }}>Siel</h1>

        {isMenuOpen && (
          <div className="dropdown-menu" style={{
            position: 'absolute',
            top: '70px',
            left: '20px',
            background: 'white',
            border: '1px solid #eee',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            padding: '12px',
            zIndex: 1000,
            width: '160px',
            animation: 'fadeIn 0.2s ease'
          }}>
            <button 
              onClick={handleLogout}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'left',
                padding: '10px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>
      
      <main className="app-main">
        {currentStep === STEPS.UPLOAD && (
          <GalleryUpload onComplete={handleUploadComplete} />
        )}
        
        {currentStep === STEPS.SURVEY && (
          <Survey onComplete={handleSurveyComplete} />
        )}

        {currentStep === STEPS.SYNTHESIS && (
          <SynthesisResult 
            content={synthesizedContent} 
            onReset={handleReset} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
