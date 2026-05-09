import React, { useState } from 'react';
import EXIF from 'exif-js';
import './GalleryUpload.css';

/**
 * Component for uploading gallery photos to initiate metadata extraction.
 * Extracts EXIF data (Date Taken, Location) to feed into the AI narrator.
 */
const GalleryUpload = ({ onComplete, canGoForward, onForward, username }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [excludedCount, setExcludedCount] = useState(0);
  const [cadence, setCadence] = useState(localStorage.getItem('siel_cadence') || 'biweekly');

  const updateCadence = (newCadence) => {
    setCadence(newCadence);
    localStorage.setItem('siel_cadence', newCadence);
    // If files are already selected, we could re-filter, but for now 
    // let's just update the state so the next upload uses it.
  };

  // Extracts only metadata needed for synthesis; image bytes are never persisted here.
  const extractMetadata = (file) => {
    return new Promise((resolve) => {
      EXIF.getData(file, function() {
        const dateTaken = EXIF.getTag(this, "DateTimeOriginal");
        const lat = EXIF.getTag(this, "GPSLatitude");
        const lon = EXIF.getTag(this, "GPSLongitude");
        
        resolve({
          fileName: file.name,
          dateTaken: dateTaken || new Date(file.lastModified).toISOString(),
          location: lat ? `${lat}, ${lon}` : "Unknown Location"
        });
      });
    });
  };

  // Filters files by selected cadence window, then runs metadata extraction.
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    const activeCadence = cadence;
    const daysLimit = activeCadence === 'monthly' ? 30 : 14;
    const timeLimit = Date.now() - (daysLimit * 24 * 60 * 60 * 1000);

    const validFiles = selectedFiles.filter(file => file.lastModified >= timeLimit);
    const excluded = selectedFiles.length - validFiles.length;

    setExcludedCount(excluded);
    
    if (validFiles.length > 0) {
      setUploading(true);
      
      // Real extraction
      const metadataList = [];
      for (let i = 0; i < validFiles.length; i++) {
        const meta = await extractMetadata(validFiles[i]);
        metadataList.push(meta);
        setProgress(Math.round(((i + 1) / validFiles.length) * 100));
      }

      setFiles(validFiles);
      setUploading(false);
      
      // Pass both metadata and files back to App
      onComplete(metadataList, validFiles);
    }
  };

  return (
    <div className="gallery-container">
      {username && (
        <div className="user-greeting">
          Good to have you here, <span className="username">{username}</span>.
        </div>
      )}
      <h2>Upload</h2>
      <p className="subtitle">Pick your timeframe and photos to start your story.</p>

      <div className="cadence-toggle-container">
        <div className="header-tabs">
          <div className={`tab-slider ${cadence === 'monthly' ? 'right' : ''}`} />
          <button 
            className={`tab-btn ${cadence === 'biweekly' ? 'active' : ''}`}
            onClick={() => updateCadence('biweekly')}
          >
            TWO-WEEK
          </button>
          <button 
            className={`tab-btn ${cadence === 'monthly' ? 'active' : ''}`}
            onClick={() => updateCadence('monthly')}
          >
            MONTHLY
          </button>
        </div>
      </div>
      
      <div className={`drop-zone ${files.length > 0 ? 'has-files' : ''}`}>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFileChange}
          disabled={uploading}
        />
        <div className="drop-content">
          <p>{uploading ? `Extracting ${progress}%` : files.length > 0 ? `${files.length} photos accepted` : 'Click to select gallery photos'}</p>
          {excludedCount > 0 && (
            <p className="excluded-hint">
              {excludedCount} photos excluded (outside your {cadence} window)
            </p>
          )}
        </div>
        {uploading && (
          <div className="progress-bar">
            <div className="fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>

      <div className="gallery-actions">
        <button 
          className="next-btn" 
          disabled={!canGoForward || uploading}
          onClick={onForward}
        >
          Continue to Survey →
        </button>
      </div>
    </div>
  );
};

export default GalleryUpload;
