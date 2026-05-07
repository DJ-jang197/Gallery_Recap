import React, { useState, useContext } from 'react';
import GalleryUpload from './components/GalleryUpload';
import Survey from './components/Survey';
import SynthesisResult from './components/SynthesisResult';
import ProgressTracker from './components/ProgressTracker';
import LibraryDrawer from './components/LibraryDrawer';
import NamingModal from './components/NamingModal';
import { LibraryContext } from './context/LibraryContext';

const STEPS = {
  UPLOAD: 'UPLOAD',
  SURVEY: 'SURVEY',
  SYNTHESIS: 'SYNTHESIS'
};

function App() {
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [synthesizedContent, setSynthesizedContent] = useState('');
  
  // Library & Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [finalNarrative, setFinalNarrative] = useState('');
  const [surveyData, setSurveyData] = useState(null);

  const { addEntryToLibrary } = useContext(LibraryContext);

  const [metadataList, setMetadataList] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);

  const handleUploadComplete = (extractedMetadata, originalFiles) => {
    setMetadataList(extractedMetadata);
    setPhotoFiles(originalFiles);
    setCurrentStep(STEPS.SURVEY);
  };

  const fileToBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
  });

  const handleSurveyComplete = async (surveyState) => {
    setSurveyData(surveyState);
    setCurrentStep(STEPS.SYNTHESIS);
    setSynthesizedContent("Analyzing your metadata and crafting your narrative...");

    try {
      const imagePromises = photoFiles.slice(0, 10).map(f => fileToBase64(f));
      const base64Images = await Promise.all(imagePromises);

      const response = await fetch('http://localhost:8080/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores: {
            energy: surveyState.energy,
            social: surveyState.social,
            stress: surveyState.stress,
            adjectives: surveyState.adjectives || []
          },
          reflection: surveyState.reflection,
          metadata: metadataList,
          images: base64Images
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      let prose = data.narrative;
      
      if (surveyState.wantsVerse) {
        prose += "\n\n---\n\"The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters.\" (Psalm 23:1-2 NIV)";
      }
      
      setSynthesizedContent(prose);
    } catch (error) {
      console.error("AI Synthesis failed:", error);
      setSynthesizedContent("I encountered an error connecting to the Siel Kernel. Please ensure your Java backend is running.");
    }
  };

  // Called from SynthesisResult when "Complete Reflection" is clicked
  const handleSynthesisComplete = (editedContent) => {
    setFinalNarrative(editedContent);
    setShowNamingModal(true);
  };

  // Called from NamingModal when user saves the title
  const handleSaveToArchive = async (title) => {
    const entryData = {
      id: crypto.randomUUID(),
      logTitle: title,
      logDate: new Date().toISOString(),
      cadenceType: surveyData?.cadence || 'Unknown',
      narrativeContent: finalNarrative,
      sentimentData: {
        energy: surveyData?.energy,
        social: surveyData?.social,
        stress: surveyData?.stress
      }
    };

    await addEntryToLibrary(entryData);
    
    // Reset flow
    setShowNamingModal(false);
    setCurrentStep(STEPS.UPLOAD);
    setSynthesizedContent('');
    setSurveyData(null);
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
          onClick={() => setIsDrawerOpen(true)}
          style={{ cursor: 'pointer', position: 'absolute', left: '24px', padding: '8px' }}
        >
          <div className="hamburger-lines">
            <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--deep-slate)', margin: '4px 0' }}></span>
            <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--deep-slate)', margin: '4px 0' }}></span>
            <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--deep-slate)', margin: '4px 0' }}></span>
          </div>
        </div>

        <h1 style={{ textAlign: 'center', margin: 0, width: '100%' }}>Siel</h1>
        
        <button 
          onClick={handleLogout}
          style={{ 
            position: 'absolute', 
            right: '24px', 
            background: 'none', 
            border: 'none', 
            color: '#94a3b8', 
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          LOGOUT
        </button>
      </header>
      
      <main className="app-main">
        <ProgressTracker currentStep={currentStep} />

        {currentStep === STEPS.UPLOAD && (
          <GalleryUpload onComplete={handleUploadComplete} />
        )}
        
        {currentStep === STEPS.SURVEY && (
          <Survey onComplete={handleSurveyComplete} />
        )}

        {currentStep === STEPS.SYNTHESIS && (
          <SynthesisResult 
            content={synthesizedContent} 
            onComplete={handleSynthesisComplete} 
          />
        )}
      </main>

      <LibraryDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />

      {showNamingModal && (
        <NamingModal 
          onSave={handleSaveToArchive} 
          onCancel={() => setShowNamingModal(false)} 
        />
      )}
    </div>
  );
}

export default App;
