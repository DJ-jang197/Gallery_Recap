import React from 'react';
import './ProgressTracker.css';

/**
 * Visual indicator of the current step in the workflow.
 * Uses a circle-line-circle format.
 */
const ProgressTracker = ({ currentStep }) => {
  const steps = [
    { id: 'UPLOAD', label: 'Upload' },
    { id: 'SURVEY', label: 'Reflection' },
    { id: 'SYNTHESIS', label: 'Narrative' }
  ];

  // Maps symbolic step id to numeric index for active/completed styling.
  const getStepIndex = () => {
    return steps.findIndex(s => s.id === currentStep);
  };

  const currentIndex = getStepIndex();

  return (
    <div className="progress-tracker">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="step-item">
            <div className={`step-circle ${index <= currentIndex ? 'active' : ''}`}>
              {index < currentIndex ? '✓' : index + 1}
            </div>
            <span className={`step-label ${index <= currentIndex ? 'active' : ''}`}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`step-line ${index < currentIndex ? 'active' : ''}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProgressTracker;
