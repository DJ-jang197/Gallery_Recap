import React, { useEffect, useState } from 'react';
import './SynthesisResult.css';

/**
 * Component displaying the final synthesized journal entry.
 * Allows user to edit the text directly.
 */
const SynthesisResult = ({ content, onComplete, isLoading = false }) => {
  const [editableContent, setEditableContent] = useState(content);

  // Keep local editable state in sync with incoming generated content.
  useEffect(() => {
    setEditableContent(content);
  }, [content]);

  return (
    <div className="synthesis-container">
      <div className="header-meta">
        <span className="tag">Archive Entry</span>
        <span className="date">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>
      
      <h2>The Narrative</h2>
      
      <div className="narrative-editor">
        {isLoading && (
          <div className="loading-overlay" aria-live="polite">
            <div className="spinner" />
            <div className="loading-text">Analyzing your metadata and crafting your narrative...</div>
          </div>
        )}
        <textarea
          value={editableContent}
          onChange={(e) => setEditableContent(e.target.value)}
          placeholder="Your story is appearing here..."
          disabled={isLoading}
        />
        <div className="edit-hint">You can edit the text above to refine your story.</div>
      </div>

      <button
        className="reset-btn"
        onClick={() => onComplete(editableContent)}
        disabled={isLoading}
        style={isLoading ? { cursor: 'not-allowed', opacity: 0.7 } : undefined}
      >
        Complete Reflection
      </button>
    </div>
  );
};

export default SynthesisResult;
