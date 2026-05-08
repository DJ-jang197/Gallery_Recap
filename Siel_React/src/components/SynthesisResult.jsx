import React, { useEffect, useState } from 'react';
import './SynthesisResult.css';

/**
 * Component displaying the final synthesized journal entry.
 * Allows user to edit the text directly.
 */
const SynthesisResult = ({ content, onComplete, onRegenerate, onBack, isLoading = false }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const loadingMessages = [
    "Siel is leafing through your memories...",
    "Checking out that lake view! Stunning.",
    "Connecting the dots between your photos...",
    "Gathering thoughts for your reflection...",
    "Almost ready! I want to see what I've got..."
  ];

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

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
            <div className="loader-content">
              <img src="/seal.png" alt="Siel Loader" className="loader-seal" />
              <div className="loading-text">{loadingMessages[messageIndex]}</div>
              <div className="loading-subtext">This will be worth the wait.</div>
            </div>
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

      <div className="synthesis-actions">
        <button className="back-btn-secondary" onClick={onBack} disabled={isLoading}>
          ← Adjust Survey
        </button>
        <button className="regen-btn" onClick={onRegenerate} disabled={isLoading}>
          Regenerate Entry
        </button>
        <button
          className="reset-btn"
          onClick={() => onComplete(editableContent)}
          disabled={isLoading}
          style={isLoading ? { cursor: 'not-allowed', opacity: 0.7 } : undefined}
        >
          Complete Reflection
        </button>
      </div>
    </div>
  );
};

export default SynthesisResult;
