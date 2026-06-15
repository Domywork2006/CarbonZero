import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BookOpen, CheckCircle, ExternalLink, X, HelpCircle, Users } from 'lucide-react';

const ACTIONS_CATALOG = [
  { key: 'energy', label: 'Switch to Renewable Energy', savings: 150 },
  { key: 'vegetarian', label: 'Transition to Vegetarian Diet', savings: 120 },
  { key: 'active_transit', label: 'Bike/Walk under 2 miles', savings: 25 },
  { key: 'repair', label: 'Repair electronics instead of buying new', savings: 60 },
  { key: 'led', label: 'Replace bulbs with LEDs', savings: 20 }
];

export default function EducationalHub({ onPointsChange, showToast }) {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  
  // Modal View Article State
  const [activeArticle, setActiveArticle] = useState(null);

  // Impact Simulator States
  const [selectedAction, setSelectedAction] = useState(ACTIONS_CATALOG[0]);
  const [peopleCount, setPeopleCount] = useState(1000000); // Default 1 Million

  async function fetchArticles() {
    try {
      const data = await api.getArticles();
      setArticles(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch educational articles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchArticles();
  }, []);

  const openArticle = async (article) => {
    setActiveArticle(article);

    // If article is not read yet, mark as read
    if (!article.read) {
      try {
        const result = await api.readArticle(article.id);
        if (result.pointsEarned > 0) {
          showToast(`Article read! +25 Points earned.`);
          onPointsChange();
          // Update local articles array read state
          setArticles(prev => prev.map(a => a.id === article.id ? { ...a, read: true } : a));
        }
      } catch (err) {
        console.error('Failed to log article read:', err);
      }
    }
  };

  const closeArticle = () => {
    setActiveArticle(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Fetching educational database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Error Loading Articles</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
        <button className="btn btn-secondary" onClick={fetchArticles}>Try Again</button>
      </div>
    );
  }

  // Simulator calculations
  // savings_kg_per_month * 12 months * people / 1000 = tonnes_per_year
  const annualSavingsTonnes = (selectedAction.savings * 12 * peopleCount) / 1000;
  // 1 passenger car emits ~4.6 tonnes CO2 per year
  const carsRemoved = Math.round(annualSavingsTonnes / 4.6);

  return (
    <div>
      <div className="top-header">
        <div>
          <h1 className="page-title">Educational Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Learn about sustainability, study carbon footprint calculations, and simulate collective action.
          </p>
        </div>
      </div>

      <div className="grid-cols-3">
        {/* Articles list - spans 2 columns */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="articles-grid">
            {articles.map((art) => {
              const catColors = {
                Transport: 'var(--color-transport)',
                Energy: 'var(--color-energy)',
                Diet: 'var(--color-diet)',
                Purchases: 'var(--color-purchases)',
                General: 'var(--accent-color)'
              };
              const catBg = (catColors[art.category] || 'var(--accent-color)') + '1F';

              return (
                <div key={art.id} className="card article-card" style={{ padding: '24px' }}>
                  <div className="article-header">
                    <span 
                      className="article-category"
                      style={{ backgroundColor: catBg, color: catColors[art.category] || 'var(--accent-color)' }}
                    >
                      {art.category}
                    </span>
                    <span className="article-read-time">{art.read_time}</span>
                  </div>
                  <h3 className="article-title">{art.title}</h3>
                  <p className="article-summary">{art.summary}</p>
                  
                  <div className="article-footer">
                    {art.read ? (
                      <span className="article-status">
                        <CheckCircle size={16} />
                        Completed (+25 pts)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Unread (+25 pts potential)
                      </span>
                    )}

                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => openArticle(art)}
                    >
                      Read Article
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collective Impact Simulator - spans 1 column */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: 'var(--accent-color)' }} />
            Impact Simulator
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.4' }}>
            See the massive difference when small changes are scaled across a community.
          </p>

          <div className="simulator-box">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Choose an Action</label>
              <select 
                className="form-input" 
                style={{ padding: '10px' }}
                value={selectedAction.key}
                onChange={(e) => setSelectedAction(ACTIONS_CATALOG.find(a => a.key === e.target.value))}
              >
                {ACTIONS_CATALOG.map(act => (
                  <option key={act.key} value={act.key}>{act.label}</option>
                ))}
              </select>
            </div>

            <div className="simulator-slider-group">
              <div className="slider-labels">
                <span style={{ fontSize: '0.8rem' }}>Scale (People)</span>
                <span style={{ color: 'var(--accent-color)', fontSize: '0.85rem' }}>
                  {peopleCount.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="10000000"
                step="50000"
                className="slider-input"
                value={peopleCount}
                onChange={(e) => setPeopleCount(parseInt(e.target.value))}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
              <div className="simulator-result">
                {annualSavingsTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 })} tonnes
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '600' }}>
                CO2e Saved / Year
              </div>

              <div className="simulator-result" style={{ color: 'var(--color-transport)', marginTop: '16px', fontSize: '1.25rem' }}>
                🚘 {carsRemoved.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '600' }}>
                Cars Off the Road / Year
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '20px' }}>
            <span>🔗 <strong>External Resources:</strong></span>
            <a href="https://www.epa.gov/ghgreporting" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
              U.S. EPA Greenhouse Gas inventories <ExternalLink size={10} />
            </a>
            <a href="https://ghgprotocol.org/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
              Greenhouse Gas Protocol (Standards) <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* Full Article Modal View Overlay */}
      {activeArticle && (
        <div className="modal-overlay" onClick={closeArticle}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeArticle}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span className="article-category" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                {activeArticle.category}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activeArticle.read_time}</span>
            </div>
            
            <h2 className="modal-title">{activeArticle.title}</h2>
            
            <div className="modal-body">
              <p style={{ marginBottom: '20px', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {activeArticle.content}
              </p>
              
              <div className="modal-fact-box">
                💡 <strong>Sustainability Fact:</strong> {activeArticle.fact}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={closeArticle}>
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
