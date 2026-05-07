import React, { useState, useEffect } from 'react';
import './Survey.css';

/**
 * 1-5 Star Survey Component handling Energy, Social, and Stress.
 *
 * Logic: Reads 'siel_cadence' from localStorage (set by Auth module).
 * Changes the reflective prompt based on Bi-Weekly vs Monthly.
 * Builds the SurveyState object internally.
 */
const Survey = () => {
  const [cadence, setCadence] = useState('biweekly');
  const [scores, setScores] = useState({ energy: 0, social: 0, stress: 0 });
  const [reflection, setReflection] = useState('');
  
  useEffect(() => {
    const saved = localStorage.getItem('siel_cadence');
    if (saved) {
      setCadence(saved);
    }
  }, []);

  const handleStarClick = (category, value) => {
    setScores(prev => ({ ...prev, [category]: value }));
  };

  const getPrompt = () => {
    return cadence === 'biweekly' 
      ? "How was your fortnight?" 
      : "Define your month in three words.";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const surveyState = {
      cadence,
      energy: scores.energy,
      social: scores.social,
      stress: scores.stress,
      reflection
    };

    // In Phase 4, this state is sent to the backend/AI
    console.log("Survey State Synchronized:", surveyState);
    alert('Reflection captured. Ready for Synthesis.');
  };

  const renderStars = (category) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span 
            key={star} 
            className={`star ${scores[category] >= star ? 'active' : ''}`}
            onClick={() => handleStarClick(category, star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="survey-container">
      <h2>The Soul</h2>
      <p className="subtitle">Capture the essence of your recent journey.</p>
      
      <form onSubmit={handleSubmit} className="survey-form">
        <div className="rating-group">
          <label>Energy Level</label>
          {renderStars('energy')}
        </div>
        
        <div className="rating-group">
          <label>Social Battery</label>
          {renderStars('social')}
        </div>
        
        <div className="rating-group">
          <label>Stress & Pressure</label>
          {renderStars('stress')}
        </div>

        <div className="reflection-group">
          <label>{getPrompt()}</label>
          <textarea 
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Type your reflection here..."
            required
          />
        </div>

        <button type="submit" className="submit-btn">
          Synthesize Narrative
        </button>
      </form>
    </div>
  );
};

export default Survey;
