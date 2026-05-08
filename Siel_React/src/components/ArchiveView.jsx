import React, { useContext, useState } from 'react';
import { LibraryContext } from '../context/LibraryContext';
import './ArchiveView.css';

const ArchiveView = () => {
  const { entries, removeEntryFromLibrary } = useContext(LibraryContext);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const formatDate = (isoString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(isoString).toLocaleDateString('en-US', options);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this memory?")) {
      removeEntryFromLibrary(id);
      if (selectedEntry?.id === id) setSelectedEntry(null);
    }
  };

  if (selectedEntry) {
    return (
      <div className="archive-detail-container">
        <button className="back-btn" onClick={() => setSelectedEntry(null)}>
          ← Back to Archive
        </button>
        <div className="detail-card">
          <div className="detail-header">
            <span className="cadence-tag">{selectedEntry.cadenceType}</span>
            <h2>{selectedEntry.logTitle}</h2>
            <p className="date">{formatDate(selectedEntry.logDate)}</p>
          </div>
          <div className="detail-content">
            {selectedEntry.narrativeContent.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="archive-grid-container">
      {entries.length === 0 ? (
        <div className="empty-archive">
          <p>Your archive is waiting for its first memory.</p>
        </div>
      ) : (
        <div className="entries-grid">
          {entries.map(entry => (
            <div key={entry.id} className="entry-grid-card" onClick={() => setSelectedEntry(entry)}>
              <div className="card-header">
                <span className="type-dot"></span>
                <span className="date">{formatDate(entry.logDate)}</span>
              </div>
              <h3>{entry.logTitle}</h3>
              <p className="excerpt">{entry.narrativeContent.substring(0, 120)}...</p>
              <button className="delete-icon" onClick={(e) => handleDelete(e, entry.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchiveView;
