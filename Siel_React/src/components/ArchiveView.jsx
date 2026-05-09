import React, { useContext, useState } from 'react';
import { LibraryContext } from '../context/LibraryContext';
import './ArchiveView.css';

const ArchiveView = () => {
  const { entries, removeEntryFromLibrary, togglePinEntry } = useContext(LibraryContext);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Partition entries into pinned and unpinned, maintaining the newest-first order.
  const pinnedEntries = entries.filter(e => e.isPinned);
  const otherEntries = entries.filter(e => !e.isPinned);

  // Formats stored ISO date into human-readable archive labels.
  const formatDate = (isoString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(isoString).toLocaleDateString('en-US', options);
  };

  // Prevents card-open click bubbling when deleting an entry.
  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this memory?")) {
      removeEntryFromLibrary(id);
      if (selectedEntry?.id === id) setSelectedEntry(null);
    }
  };

  // Prevents card-open click bubbling when toggling pin.
  const handleTogglePin = (e, id) => {
    e.stopPropagation();
    togglePinEntry(id);
  };

  const renderEntryCard = (entry) => (
    <div key={entry.id} className={`archive-card ${entry.isPinned ? 'pinned' : ''}`} onClick={() => setSelectedEntry(entry)}>
      <div className="entry-controls">
        <button 
          className={`control-btn pin-btn ${entry.isPinned ? 'active' : ''}`}
          onClick={(e) => handleTogglePin(e, entry.id)}
          title={entry.isPinned ? "Unpin Memory" : "Pin Memory"}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <g transform="translate(24, 0) scale(-1, 1) rotate(-45 12 12)">
              <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11V22H13V16H18V14L16,12Z" />
            </g>
          </svg>
        </button>
        <button 
          className="control-btn delete-btn"
          onClick={(e) => handleDelete(e, entry.id)}
          title="Remove Memory"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <div className="card-header">
        <span className="type-dot"></span>
        <span className="date">{formatDate(entry.logDate)}</span>
      </div>
      <h3>{entry.logTitle}</h3>
      <p className="excerpt">{entry.narrativeContent.substring(0, 120)}...</p>
    </div>
  );

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
      <div className="archive-view-header">
        <h2>Your Library</h2>
        <p className="subtitle">Every story you've reflected on is kept safe here.</p>
      </div>
      
      {entries.length === 0 ? (
        <div className="empty-archive">
          <p>Your archive is waiting for its first memory.</p>
        </div>
      ) : (
        <>
          {pinnedEntries.length > 0 && (
            <div className="archive-section">
              <h4 className="section-title">Pinned Memories</h4>
              <div className="entries-grid">
                {pinnedEntries.map(renderEntryCard)}
              </div>
            </div>
          )}

          <div className="archive-section">
            <h4 className="section-title">{pinnedEntries.length > 0 ? 'All Memories' : 'Recent Memories'}</h4>
            <div className="entries-grid">
              {otherEntries.map(renderEntryCard)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ArchiveView;
