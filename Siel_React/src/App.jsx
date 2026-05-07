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

  const handleUploadComplete = () => {
    setCurrentStep(STEPS.SURVEY);
  };

  const handleSurveyComplete = (surveyState) => {
    // Simulate Synthesis logic from Phase 4
    const mockProse = `The last two weeks have been a testament to your quiet resilience. While your energy levels dipped slightly during the mid-period, the photos from your gallery reveal moments of unexpected joy—a shared coffee, a sunset walk. Your reflection on "${surveyState.reflection}" suggests you're moving toward a place of deeper clarity.`;
    
    setSynthesizedContent(mockProse);
    setCurrentStep(STEPS.SYNTHESIS);
  };

  const handleReset = () => {
    setCurrentStep(STEPS.UPLOAD);
    setSynthesizedContent('');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="menu-trigger">☰</div>
        <h1>Siel</h1>
        <p>Biographer</p>
        <div className="user-profile">👤</div>
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

      <nav className="bottom-nav">
        <div className={`nav-item ${currentStep === STEPS.UPLOAD ? 'active' : ''}`}>
          <span className="icon">📸</span>
          <span>Gallery</span>
        </div>
        <div className={`nav-item ${currentStep === STEPS.SURVEY ? 'active' : ''}`}>
          <span className="icon">📝</span>
          <span>Survey</span>
        </div>
        <div className={`nav-item ${currentStep === STEPS.SYNTHESIS ? 'active' : ''}`}>
          <span className="icon">✦</span>
          <span>Narrative</span>
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
