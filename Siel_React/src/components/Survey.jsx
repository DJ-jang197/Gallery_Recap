import React, { useState, useEffect } from 'react';
import './Survey.css';

/**
 * Component for gathering user sentiment.
 * Removed star emoticons for a cleaner text-based scale.
 * Added NIV Bible verse integration.
 */
const Survey = ({ onComplete, onBack }) => {
  const [cadence, setCadence] = useState('biweekly');
  const [scores, setScores] = useState({ energy: 0, social: 0, stress: 0 });
  const [reflection, setReflection] = useState('');
  const [wantsVerse, setWantsVerse] = useState(false);
  
  useEffect(() => {
    // Restores previously selected cadence so prompts stay consistent.
    const saved = localStorage.getItem('siel_cadence');
    if (saved) {
      setCadence(saved);
    }
  }, []);

  // Updates one score dimension (energy/social/stress) immutably.
  const handleScoreSelect = (category, value) => {
    setScores(prev => ({ ...prev, [category]: value }));
  };

  // Chooses dynamic reflection prompt based on selected cadence.
  const getPrompt = () => {
    return cadence === 'monthly' 
      ? "How would you describe your last month?" 
      : "How would you describe your last two weeks?";
  };

  const [adjectives, setAdjectives] = useState([]);
  const availableAdjectives = [
    'Peaceful', 'Hectic', 'Magical', 'Ordinary', 'Productive', 
    'Adventurous', 'Nostalgic', 'Melancholic', 'Joyful', 'Quiet',
    'Sad', 'Happy', 'Hopeful', 'Stressed', 'Inspired'
  ];

  // Toggles adjective chips in the selected mood list.
  const handleToggleAdjective = (adj) => {
    setAdjectives(prev => prev.includes(adj) ? prev.filter(a => a !== adj) : [...prev, adj]);
  };

  // Adds custom adjective when user presses Enter in auxiliary input.
  const handleCustomAdjective = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      handleToggleAdjective(e.target.value.trim());
      e.target.value = '';
    }
  };

  // Requires all ratings, mood words, and reflection text before submit.
  const isFormValid = () => {
    return (
      scores.energy > 0 &&
      scores.social > 0 &&
      scores.stress > 0 &&
      adjectives.length > 0 &&
      reflection.trim().length > 0
    );
  };

  // Normalizes survey payload into the shape expected by App synthesis flow.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    const surveyState = {
      cadence,
      energy: scores.energy,
      social: scores.social,
      stress: scores.stress,
      reflection,
      wantsVerse,
      adjectives // Include the bubbles!
    };

    onComplete(surveyState);
  };

  // Renders shared 1-5 numeric scale UI for each score category.
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
      
      <div className="cadence-switcher">
        <button 
          type="button" 
          className={`cadence-btn ${cadence === 'biweekly' ? 'active' : ''}`}
          onClick={() => {
            setCadence('biweekly');
            localStorage.setItem('siel_cadence', 'biweekly');
          }}
        >
          Bi-weekly
        </button>
        <button 
          type="button" 
          className={`cadence-btn ${cadence === 'monthly' ? 'active' : ''}`}
          onClick={() => {
            setCadence('monthly');
            localStorage.setItem('siel_cadence', 'monthly');
          }}
        >
          Monthly
        </button>
      </div>

      <form className="survey-form" onSubmit={handleSubmit}>
        <div className="rating-group">
          <label>The Vibe</label>
          <div className="adjective-grid">
            {availableAdjectives.map(adj => (
              <button
                key={adj}
                type="button"
                className={`adj-bubble ${adjectives.includes(adj) ? 'active' : ''}`}
                onClick={() => handleToggleAdjective(adj)}
              >
                {adj}
              </button>
            ))}
            {adjectives.filter(adj => !availableAdjectives.includes(adj)).map(adj => (
              <button
                key={adj}
                type="button"
                className="adj-bubble active"
                onClick={() => handleToggleAdjective(adj)}
              >
                {adj}
              </button>
            ))}
            <input 
              type="text" 
              placeholder="+ Other"
              className="adj-input"
              onKeyDown={handleCustomAdjective}
            />
          </div>
        </div>

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

        <div className="survey-actions">
          <button className="back-btn-secondary" type="button" onClick={onBack}>
            ← Go Back
          </button>
          <button 
            className={`submit-btn ${!isFormValid() ? 'disabled' : ''}`} 
            type="submit"
            disabled={!isFormValid()}
          >
            Generate Journal Entry
          </button>
        </div>
      </form>
    </div>
  );
};

export default Survey;
