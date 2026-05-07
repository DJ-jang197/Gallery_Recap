import React, { useState } from 'react';
import './SynthesisResult.css';

/**
 * Component displaying the final synthesized journal entry.
 * Allows user to edit the text directly.
 */
const SynthesisResult = ({ content, onComplete }) => {
  const [editableContent, setEditableContent] = useState(content);

  return (
    <div className="synthesis-container">
      <div className="header-meta">
        <span className="tag">Archive Entry</span>
        <span className="date">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>
      
      <h2>The Narrative</h2>
      
      <div className="narrative-editor">
        <textarea 
          value={editableContent}
          onChange={(e) => setEditableContent(e.target.value)}
          placeholder="Your story is appearing here..."
        />
        <div className="edit-hint">You can edit the text above to refine your story.</div>
      </div>

      <button className="reset-btn" onClick={() => onComplete(editableContent)}>
        Complete Reflection
      </button>
    </div>
  );
};

export default SynthesisResult;
