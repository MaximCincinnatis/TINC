import React from 'react';

interface Props {
  message: string;
  progress?: number;
  subMessage?: string;
}

const LoadingProgress: React.FC<Props> = ({ message, progress, subMessage }) => {
  const progressValue = Math.max(0, Math.min(100, progress || 0));
  
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        {/* Enhanced spinner with glow effect */}
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <div className="loading-spinner-glow"></div>
        </div>
        
        {/* Enhanced typography with better hierarchy */}
        <div className="loading-content">
          <h2 className="loading-title">{message}</h2>
          {subMessage && <p className="loading-subtitle">{subMessage}</p>}
        </div>
        
        {/* Enhanced progress indicator */}
        {progress !== undefined && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressValue}%`,
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
              <div className="progress-glow" style={{ left: `${Math.max(0, progressValue - 5)}%` }} />
            </div>
            <div className="progress-info">
              <span className="progress-text">{Math.round(progressValue)}%</span>
              {progressValue > 0 && (
                <span className="progress-estimate">
                  {progressValue < 100 ? 'Loading...' : 'Complete!'}
                </span>
              )}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default LoadingProgress;