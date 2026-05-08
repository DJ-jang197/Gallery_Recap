import React, { useContext } from 'react';
import { LibraryContext } from '../context/LibraryContext';
import './LibraryDrawer.css';

/**
 * Side drawer displaying archived journal entries.
 */
const LibraryDrawer = ({ isOpen, onClose }) => {
  const { entries, removeEntryFromLibrary } = useContext(LibraryContext);

  // Confirms destructive delete action before mutating archive state.
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this memory?")) {
      removeEntryFromLibrary(id);
    }
  };

  // Formats ISO timestamps for card display in the drawer UI.
  const formatDate = (isoString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(isoString).toLocaleDateString('en-US', options);
  };

  return (
    <>
      <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`library-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>Archive</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="drawer-content">
          {entries.length === 0 ? (
            <p className="empty-state">Your archive is currently empty.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="entry-card">
                <div className="entry-info">
                  <h3 className="entry-title">{entry.logTitle}</h3>
                  <p className="entry-date">{formatDate(entry.logDate)}</p>
                </div>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(entry.id)}
                  aria-label="Delete entry"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default LibraryDrawer;
