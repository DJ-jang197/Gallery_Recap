import React, { useState } from 'react';
import './NamingModal.css';

/**
 * Modal to capture the title of the journal entry before saving to the archive.
 */
const NamingModal = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="naming-modal">
        <h2>Save to Archive</h2>
        <p className="subtitle">What would you like to name this memory?</p>
        
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. May Grinds or Summer Study"
            required
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="save-btn" disabled={!title.trim()}>Save Memory</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NamingModal;
