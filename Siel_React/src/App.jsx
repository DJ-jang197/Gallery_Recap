import React, { useState, useContext } from 'react';
import GalleryUpload from './components/GalleryUpload';
import Survey from './components/Survey';
import SynthesisResult from './components/SynthesisResult';
import ProgressTracker from './components/ProgressTracker';
import LibraryDrawer from './components/LibraryDrawer';
import ArchiveView from './components/ArchiveView';
import NamingModal from './components/NamingModal';
import { LibraryContext } from './context/LibraryContext';

const STEPS = {
  UPLOAD: 'UPLOAD',
  SURVEY: 'SURVEY',
  SYNTHESIS: 'SYNTHESIS'
};

function App() {
  const [viewMode, setViewMode] = useState('CREATE'); // 'CREATE' or 'ARCHIVE'
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [synthesizedContent, setSynthesizedContent] = useState('');
  const [isSynthesisLoading, setIsSynthesisLoading] = useState(false);
  
  // Library & Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [finalNarrative, setFinalNarrative] = useState('');
  const [surveyData, setSurveyData] = useState(null);

  const { addEntryToLibrary } = useContext(LibraryContext);

  const [metadataList, setMetadataList] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);

  // Privacy-first default: send only EXIF-derived metadata unless explicitly enabled.
  const includeImages = import.meta.env.VITE_INCLUDE_IMAGES === 'true';

  const handleUploadComplete = (extractedMetadata, originalFiles) => {
    setMetadataList(extractedMetadata);
    setPhotoFiles(originalFiles);
    setCurrentStep(STEPS.SURVEY);
  };

  const fileToBase64WithMime = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const mimeMatch = typeof result === 'string' ? result.match(/^data:(.*?);base64,/) : null;
      const mimeType = mimeMatch?.[1] || file.type || 'image/jpeg';
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve({ mimeType, base64 });
    };
    reader.onerror = reject;
  });

  const handleSurveyComplete = async (surveyState) => {
    setSurveyData(surveyState);
    setCurrentStep(STEPS.SYNTHESIS);
    setIsSynthesisLoading(true);
    setSynthesizedContent("");

    try {
      const controller = new AbortController();
      const timeoutMs = 45000;
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      const imagesPayload = includeImages
        ? await Promise.all(photoFiles.slice(0, 10).map(f => fileToBase64WithMime(f)))
        : [];

      const kernelBearerToken = import.meta.env.VITE_KERNEL_BEARER_TOKEN;
      const headers = { 'Content-Type': 'application/json' };
      if (kernelBearerToken) {
        headers.Authorization = `Bearer ${kernelBearerToken}`;
      }

      const response = await fetch('http://localhost:8080/api/synthesize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scores: {
            energy: surveyState.energy,
            social: surveyState.social,
            stress: surveyState.stress,
            adjectives: surveyState.adjectives || []
          },
          reflection: surveyState.reflection,
          metadata: metadataList,
          images: imagesPayload
        }),
        signal: controller.signal
      });

      window.clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setSynthesizedContent(data.narrative);
    } catch (error) {
      console.error("AI Synthesis failed:", error);
      if (error?.name === 'AbortError') {
        setSynthesizedContent("Timed out while generating your journal entry. Please try again in a moment.");
      } else {
        setSynthesizedContent("I encountered an error connecting to the Siel Kernel. Please ensure your Java backend is running.");
      }
    } finally {
      setIsSynthesisLoading(false);
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
    
    // Reset flow and switch to archive to see the new entry
    setShowNamingModal(false);
    setViewMode('ARCHIVE');
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
        <div className="header-tabs">
          <button 
            className={`tab-btn ${viewMode === 'CREATE' ? 'active' : ''}`}
            onClick={() => setViewMode('CREATE')}
          >
            JOURNAL
          </button>
          <button 
            className={`tab-btn ${viewMode === 'ARCHIVE' ? 'active' : ''}`}
            onClick={() => setViewMode('ARCHIVE')}
          >
            ARCHIVE
          </button>
        </div>

        <h1 className="logo-text">Siel</h1>
        
        <button 
          onClick={handleLogout}
          className="logout-btn"
        >
          LOGOUT
        </button>
      </header>
      
      <main className="app-main">
        {viewMode === 'CREATE' ? (
          <>
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
                isLoading={isSynthesisLoading}
              />
            )}
          </>
        ) : (
          <ArchiveView />
        )}
      </main>

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
