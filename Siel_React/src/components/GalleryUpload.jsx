import React, { useState } from 'react';
import EXIF from 'exif-js';
import './GalleryUpload.css';

/**
 * Component for uploading gallery photos to initiate metadata extraction.
 * Extracts EXIF data (Date Taken, Location) to feed into the AI narrator.
 */
const GalleryUpload = ({ onComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [excludedCount, setExcludedCount] = useState(0);

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

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    const cadence = localStorage.getItem('siel_cadence') || 'biweekly';
    const daysLimit = cadence === 'monthly' ? 30 : 14;
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
          <p>{uploading ? `Extracting ${progress}%` : files.length > 0 ? `${files.length} photos accepted` : 'Click to select gallery photos'}</p>
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
        onClick={() => {}} // Now handled automatically after extraction
        style={{ display: files.length > 0 && !uploading ? 'block' : 'none' }}
      >
        Continue to Survey
      </button>
    </div>
  );
};

export default GalleryUpload;
