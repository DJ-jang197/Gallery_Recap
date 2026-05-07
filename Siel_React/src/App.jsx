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

  return (
    <div className="app-layout">
      <header className="app-header" style={{ justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center', margin: 0 }}>Siel</h1>
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
