import React from 'react';
import './ProgressTracker.css';

/**
 * Visual indicator of the current step in the workflow.
 * Uses a circle-line-circle format.
 */
const ProgressTracker = ({ currentStep }) => {
  const steps = [
    { id: 'UPLOAD', label: 'Gallery' },
    { id: 'SURVEY', label: 'Survey' },
    { id: 'SYNTHESIS', label: 'Narrative' }
  ];

  const getStepIndex = () => {
    return steps.findIndex(s => s.id === currentStep);
  };

  const currentIndex = getStepIndex();

  return (
    <div className="progress-tracker">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={`step-circle ${index <= currentIndex ? 'active' : ''}`}>
            {index + 1}
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
