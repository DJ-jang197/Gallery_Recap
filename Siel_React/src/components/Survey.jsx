import React, { useState, useEffect } from 'react';
import './Survey.css';

/**
 * Component for gathering user sentiment.
 * Removed star emoticons for a cleaner text-based scale.
 * Added NIV Bible verse integration.
 */
const Survey = ({ onComplete }) => {
  const [cadence, setCadence] = useState('biweekly');
  const [scores, setScores] = useState({ energy: 0, social: 0, stress: 0 });
  const [reflection, setReflection] = useState('');
  const [wantsVerse, setWantsVerse] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('siel_cadence');
    if (saved) {
      setCadence(saved);
    }
  }, []);

  const handleScoreSelect = (category, value) => {
    setScores(prev => ({ ...prev, [category]: value }));
  };

  const getPrompt = () => {
    return cadence === 'monthly' 
      ? "How would you describe your last month?" 
      : "How would you describe your last two weeks?";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const surveyState = {
      cadence,
      energy: scores.energy,
      social: scores.social,
      stress: scores.stress,
      reflection,
      wantsVerse
    };

    onComplete(surveyState);
  };

  const renderScale = (category) => {
    return (
      <div className="scale-container">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            className={`scale-btn ${scores[category] === num ? 'active' : ''}`}
            onClick={() => handleScoreSelect(category, num)}
          >
            {num}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="survey-container">
      <h2>The Soul</h2>
      <p className="subtitle">Reflect on your inner state.</p>

      <form className="survey-form" onSubmit={handleSubmit}>
        <div className="rating-group">
          <label>Energy Level</label>
          {renderScale('energy')}
        </div>

        <div className="rating-group">
          <label>Social Connection</label>
          {renderScale('social')}
        </div>

        <div className="rating-group">
          <label>Mental Stress</label>
          {renderScale('stress')}
        </div>

        <div className="reflection-group">
          <label>{getPrompt()}</label>
          <textarea 
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Adjectives or simple phrases work best (e.g. Grateful, Hectic, Growth)"
            required
          />
        </div>

        <div className="verse-toggle">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={wantsVerse} 
              onChange={(e) => setWantsVerse(e.target.checked)} 
            />
            <span className="checkmark"></span>
            Include a related NIV Bible verse?
          </label>
        </div>

        <button className="submit-btn" type="submit">
          Generate Journal Entry
        </button>
      </form>
    </div>
  );
};

export default Survey;
