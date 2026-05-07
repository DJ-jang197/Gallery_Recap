import React, { useState } from 'react';
import './GalleryUpload.css';

/**
 * Component for uploading gallery photos to initiate metadata extraction.
 * Now includes a Strict Date Filter to ensure photos are within the selected cadence.
 */
const GalleryUpload = ({ onComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [excludedCount, setExcludedCount] = useState(0);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Determine the cadence timeframe
    const cadence = localStorage.getItem('siel_cadence') || 'biweekly';
    const daysLimit = cadence === 'monthly' ? 30 : 14;
    const timeLimit = Date.now() - (daysLimit * 24 * 60 * 60 * 1000);

    // Filter files based on lastModified date (Proxy for EXIF Date Taken)
    const validFiles = selectedFiles.filter(file => file.lastModified >= timeLimit);
    const excluded = selectedFiles.length - validFiles.length;

    setFiles(validFiles);
    setExcludedCount(excluded);
    
    if (validFiles.length > 0) {
      // Simulate extraction process
      setUploading(true);
      setExcludedCount(excluded);
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);
        if (currentProgress >= 100) {
          clearInterval(interval);
          setUploading(false);
        }
      }, 200);
    }
  };

  return (
    <div className="gallery-container">
      <h2>The Detective</h2>
      <p className="subtitle">Select photos to extract local metadata.</p>
      
      <div className={`drop-zone ${files.length > 0 ? 'has-files' : ''}`}>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFileChange}
          disabled={uploading}
        />
        <div className="drop-content">
          <p>{files.length > 0 ? `${files.length} photos accepted` : 'Click to select gallery photos'}</p>
          {excludedCount > 0 && (
            <p className="excluded-hint">
              {excludedCount} photos excluded (outside your {localStorage.getItem('siel_cadence') || 'biweekly'} window)
            </p>
          )}
        </div>
        {uploading && (
          <div className="progress-bar">
            <div className="fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>

      <button 
        className="next-btn" 
        disabled={files.length === 0 || uploading}
        onClick={onComplete}
      >
        Analyze Sentiment
      </button>
    </div>
  );
};

export default GalleryUpload;
