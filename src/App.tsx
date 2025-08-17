import React, { useState, useEffect } from 'react';
import './App.css';
import BurnChart from './components/BurnChart';
import StatsCards from './components/StatsCards';
import LoadingProgress from './components/LoadingProgress';
import AdminPanel from './components/AdminPanel';
import SeaCreatures from './components/SeaCreatures';
import { fetchBurnData, setProgressCallback } from './services/fileCachedBurnService';
import { BurnData } from './types/BurnData';
import { Analytics } from '@vercel/analytics/react';

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
                <h1 style={{
                  fontSize: '3rem',
                  fontWeight: '700',
                  letterSpacing: '-0.04em',
                  margin: 0,
                  color: '#ffffff',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.25rem',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                  textShadow: '0 0 40px rgba(34, 197, 94, 0.3)'
                }}>
                  <span style={{
                    fontFamily: 'Space Grotesk, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontWeight: '700',
                    letterSpacing: '-0.06em',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textTransform: 'uppercase'
                  }}>TINC</span>
                  <span style={{
                    fontWeight: '600',
                    color: '#ffffff',
                    letterSpacing: '-0.03em'
                  }}>Burn</span>
                  <span style={{
                    fontSize: '2.5rem',
                    fontWeight: '300',
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    marginLeft: '0.125rem'
                  }}>.fyi</span>
                </h1>
                <p style={{
                  fontSize: '0.9375rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginTop: '0.5rem',
                  letterSpacing: '0.05em',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif'
                }}>Real-Time Burn Analytics Platform</p>
              </div>
            </div>
            
            <div className="nav-section">
              <a 
                href="https://titanfarms.win/burn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="nav-link"
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginRight: '1rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#22c55e';
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                  e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <img 
                  src="https://titanfarms.win/Logo.png" 
                  alt="TINC Logo" 
                  style={{ 
                    height: '18px', 
                    width: 'auto',
                    opacity: '0.9'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                Titan Farms
              </a>
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
            
            <SeaCreatures burnData={burnData} />
          </>
        )}
      </main>

      <footer style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        fontSize: '0.875rem', 
        color: 'rgba(255,255,255,0.5)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <a 
            href="https://titanfarms.win/burn" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
              e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            }}
          >
            <img 
              src="https://titanfarms.win/Logo.png" 
              alt="TINC Logo" 
              style={{ 
                height: '16px', 
                width: 'auto',
                opacity: '0.9'
              }}
            />
            Titan Farms
          </a>
          
          <a 
            href="https://etherscan.io/token/tokenholderchart/0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
              e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            TINC Holders
          </a>
          
          <a 
            href="https://dexscreener.com/ethereum/0x72e0de1cc2c952326738dac05bacb9e9c25422e3" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
              e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
            TINC/TitanX
          </a>
        </div>
        
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
      <Analytics />
    </div>
  );
}

export default App;<!-- Deployment trigger -->
