import React, { useState, useEffect } from 'react';
import { getLastUpdateTime, isDataStale } from '../services/fileCachedBurnService';

interface Props {
  onDataUpdate?: () => void;
}

const AdminPanel: React.FC<Props> = ({ onDataUpdate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataIsStale, setDataIsStale] = useState(false);

  useEffect(() => {
    const checkDataStatus = async () => {
      const updateTime = await getLastUpdateTime();
      const stale = await isDataStale(6); // 6 hours
      setLastUpdate(updateTime);
      setDataIsStale(stale);
    };

    checkDataStatus();
    const interval = setInterval(checkDataStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    onDataUpdate?.();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="admin-toggle"
        title="Data Status"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h3>Data Status</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="admin-close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div className="admin-content">
        <div className="data-status">
          <div className="status-item">
            <label>Last Update:</label>
            <span>{lastUpdate ? lastUpdate.toLocaleString() : 'Unknown'}</span>
          </div>
          
          <div className="status-item">
            <label>Status:</label>
            <span className={`status-badge ${dataIsStale ? 'stale' : 'fresh'}`}>
              {dataIsStale ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  Stale (&gt;6h)
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  Fresh
                </>
              )}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          className="btn btn-primary admin-update-btn"
        >
          Refresh Display
        </button>
        
        <div className="admin-message info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9,12 2,2 4,-4"/>
          </svg>
          Data updates are managed by the developer. Current data is served from cached file for instant loading.
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;