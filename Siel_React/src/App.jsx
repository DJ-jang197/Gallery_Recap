import React, { useState, useContext, useEffect, useRef } from 'react';
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
  const [userProfile, setUserProfile] = useState(null);

  const hasFetchedProfile = useRef(false);

  // Fetch user profile from Auth service on mount
  useEffect(() => {
    if (hasFetchedProfile.current) return;
    hasFetchedProfile.current = true;

    const fetchProfile = async () => {
      try {
        // Step 1: Silent Refresh to get a valid access token from cookies
        // credentials: 'include' allows the browser to send the refresh_token cookie
        const refreshRes = await fetch('http://localhost:3000/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (!refreshRes.ok) {
          // If refresh fails, we're simply not logged in; ignore silently.
          return;
        }
        
        const { accessToken } = await refreshRes.json();
        sessionStorage.setItem('accessToken', accessToken);

        // Step 2: Use the fresh access token to fetch user profile
        const profileRes = await fetch('http://localhost:3000/auth/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (profileRes.ok) {
          const data = await profileRes.json();
          setUserProfile(data.user);
        }
      } catch (error) {
        // Log error but don't disrupt user flow; they might just be unauthenticated.
        console.error("Identity handshake failed:", error);
      }
    };
    fetchProfile();
  }, []);

  // Send images to Gemini by default for real visual grounding; set VITE_INCLUDE_IMAGES=false to send metadata only.
  const includeImages = import.meta.env.VITE_INCLUDE_IMAGES !== 'false';

  // Advances flow to survey once upload metadata extraction is complete.
  const handleUploadComplete = (extractedMetadata, originalFiles) => {
    setMetadataList(extractedMetadata);
    setPhotoFiles(originalFiles);
    setCurrentStep(STEPS.SURVEY);
  };

  // Converts image files into Gemini inline_data payload shape.
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

  // Runs backend synthesis request from current survey + metadata state.
  const handleSurveyComplete = async (surveyState) => {
    setSurveyData(surveyState);
    setCurrentStep(STEPS.SYNTHESIS);
    setIsSynthesisLoading(true);
    setSynthesizedContent("");

    try {
      const controller = new AbortController();
      const timeoutMs = 120000;
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      const imagesPayload = includeImages
        ? await Promise.all(photoFiles.slice(0, 10).map(f => fileToBase64WithMime(f)))
        : [];

      const kernelBearerToken = sessionStorage.getItem('accessToken') || import.meta.env.VITE_KERNEL_BEARER_TOKEN;
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

  // Re-runs synthesis using last submitted survey state.
  const handleRegenerate = () => {
    if (surveyData) {
      handleSurveyComplete(surveyData);
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

  // Clears local auth artifacts and returns to hosted login page.
  const handleLogout = () => {
    localStorage.removeItem('siel_cadence');
    sessionStorage.removeItem('accessToken');
    window.location.href = 'http://localhost:3000/login';
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-tabs">
          <div className={`tab-slider ${viewMode === 'ARCHIVE' ? 'right' : ''}`} />
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

        <div className="logo-container">
          <img src="/seal.png" alt="Siel Logo" className="seal-logo-header" />
          <div className="logo-text-group">
            <h1 className="logo-text">Siel: <span className="logo-motto">Recap on your moments.</span></h1>
          </div>
        </div>
        
        <div className="logout-container">
          <button 
            onClick={handleLogout}
            className="logout-btn"
          >
            LOGOUT
          </button>
        </div>
      </header>
      
      <main className="app-main">
        <div className={`page-slider ${viewMode === 'ARCHIVE' ? 'slide-archive' : ''}`}>
          {/* Archive Page - Left side */}
          <div className="page-view">
            <ArchiveView />
          </div>

          {/* Journal Page - Right side */}
          <div className="page-view">
            <ProgressTracker currentStep={currentStep} />

            {currentStep === STEPS.UPLOAD && (
              <GalleryUpload 
                onComplete={handleUploadComplete} 
                canGoForward={metadataList.length > 0}
                onForward={() => setCurrentStep(STEPS.SURVEY)}
                username={userProfile?.username || userProfile?.email?.split('@')[0]}
              />
            )}
            
            {currentStep === STEPS.SURVEY && (
              <Survey 
                onComplete={handleSurveyComplete} 
                onBack={() => setCurrentStep(STEPS.UPLOAD)}
              />
            )}

            {currentStep === STEPS.SYNTHESIS && (
              <SynthesisResult 
                content={synthesizedContent} 
                onComplete={handleSynthesisComplete} 
                onRegenerate={handleRegenerate}
                onBack={() => setCurrentStep(STEPS.SURVEY)}
                isLoading={isSynthesisLoading}
              />
            )}
          </div>
        </div>
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
