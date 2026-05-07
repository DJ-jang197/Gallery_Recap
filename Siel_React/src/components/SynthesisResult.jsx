import React from 'react';
import './SynthesisResult.css';

/**
 * Component displaying the final synthesized journal entry.
 */
const SynthesisResult = ({ content, onReset }) => {
  return (
    <div className="synthesis-container">
      <div className="header-meta">
        <span className="tag">Final Narrative</span>
        <span className="date">{new Date().toLocaleDateString()}</span>
      </div>
      
      <h2>The Turning Point</h2>
      
      <div className="narrative-body">
        {content || "Generating your story..."}
      </div>

      <div className="quote-card">
        <span className="icon">✧</span>
        <p>"Peace is not the absence of work, but the presence of purpose."</p>
      </div>

      <button className="reset-btn" onClick={onReset}>
        Start New Reflection
      </button>
    </div>
  );
};

export default SynthesisResult;
