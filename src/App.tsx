import React, { useState, useEffect } from 'react';
import './App.css';
import BurnChart from './components/BurnChart';
import StatsCards from './components/StatsCards';
import LoadingProgress from './components/LoadingProgress';
import AdminPanel from './components/AdminPanel';
import { fetchBurnData, setProgressCallback } from './services/fileCachedBurnService';
import { BurnData } from './types/BurnData';

function App() {
  const [burnData, setBurnData] = useState<BurnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  // v2.1 - Fixed emission rate display

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setLoadingMessage('Loading data...');
      setLoadingProgress(0);
      
      setProgressCallback((message, progress) => {
        setLoadingMessage(message);
        if (progress !== undefined) {
          setLoadingProgress(progress);
        }
      });
      
      const data = await fetchBurnData(forceRefresh);
      setBurnData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch burn data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="App">
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="brand-section">
              <div className="logo">
                <img 
                  src="https://titanfarms.win/Logo.png" 
                  alt="TINC Logo" 
                  style={{ height: '32px', width: 'auto' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'inline';
                  }}
                />
                <span style={{ 
                  display: 'none',
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>T</span>
              </div>
              <div className="brand-info">
                <h1>TINC Analytics</h1>
                <p>30 Day Burn Tracker</p>
              </div>
            </div>
            
            <div className="nav-section">
              <AdminPanel onDataUpdate={() => loadData(false)} />
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        {loading && (
          <LoadingProgress 
            message={loadingMessage} 
            progress={loadingProgress}
            subMessage={loadingProgress > 0 ? `${Math.round(loadingProgress)}% complete` : undefined}
          />
        )}

        {error && (
          <div className="error">
            <div className="error-title">⚠️ Error</div>
            <div className="error-message">{error}</div>
          </div>
        )}
        
        {loading && !burnData && (
          <>
            <div className="stats-grid">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="stat-card" style={{ opacity: 0.3 }}>
                  <div className="stat-header">
                    <div className="stat-label">Loading...</div>
                    <div className="stat-icon" />
                  </div>
                  <div className="stat-value">--</div>
                  <div className="stat-description">--</div>
                </div>
              ))}
            </div>
            <div className="chart-section" style={{ opacity: 0.3, minHeight: '400px' }}>
              <div className="loading">
                <div className="loading-spinner" />
                <div className="loading-text">Loading chart data...</div>
              </div>
            </div>
          </>
        )}
        
        {burnData && !loading && (
          <>
            <StatsCards burnData={burnData} />
            <div className="chart-section">
              <div className="chart-header">
                <h2 className="chart-title">Daily TINC Burns</h2>
                <p className="chart-subtitle">Last 30 days burn activity</p>
              </div>
              <BurnChart burnData={burnData} />
            </div>
          </>
        )}
      </main>

      <footer style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        fontSize: '0.875rem', 
        color: 'rgba(255,255,255,0.5)'
      }}>
        <p style={{ marginBottom: '0.5rem' }}>
          Contract: <a 
            href="https://etherscan.io/address/0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#22c55e', textDecoration: 'none' }}
          >
            0x6532...B385a
          </a>
          {burnData && (
            <span> • Last updated: {new Date(burnData.fetchedAt).toLocaleString()}</span>
          )}
          {burnData?.fromCache && (
            <span> • Cached</span>
          )}
        </p>
        <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Built for the TINC Community
        </p>
      </footer>
    </div>
  );
}

export default App;