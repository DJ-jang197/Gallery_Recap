import React, { useState } from 'react';
import './GalleryUpload.css';

/**
 * Component for uploading gallery photos to initiate metadata extraction.
 */
const GalleryUpload = ({ onComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    
    // Simulate extraction process
    setUploading(true);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploading(false);
      }
    }, 200);
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
          <p>{files.length > 0 ? `${files.length} photos selected` : 'Click to select gallery photos'}</p>
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
