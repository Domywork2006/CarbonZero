import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Sparkles, Clock, Calendar, CheckSquare, Square, ChevronRight, Activity } from 'lucide-react';

export default function Recommendations({ onPointsChange, showToast }) {
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState([]);
  const [error, setError] = useState(null);

  async function fetchTips() {
    try {
      const data = await api.getRecommendations();
      setTips(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTips();
  }, []);

  const handleStatusChange = async (tipId, newStatus) => {
    try {
      const result = await api.adoptTip(tipId, newStatus);
      showToast(result.message);
      
      // Update local state
      setTips(prevTips => prevTips.map(t => {
        if (t.id === tipId) {
          return { ...t, status: newStatus };
        }
        return t;
      }));

      // If points were earned, notify parent to refresh user profile data
      if (result.pointsEarned > 0) {
        onPointsChange();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update tip status', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Analyzing footprints to generate reduction strategies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Error Loading Recommendations</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
        <button className="btn btn-secondary" onClick={fetchTips}>Try Again</button>
      </div>
    );
  }

  // Calculate stats
  const adoptedTips = tips.filter(t => t.status === 'adopted');
  const inProgressTips = tips.filter(t => t.status === 'in_progress');

  const totalMonthlySavings = adoptedTips.reduce((sum, t) => sum + t.savings, 0);
  const potentialSavings = inProgressTips.reduce((sum, t) => sum + t.savings, 0);

  return (
    <div>
      <div className="top-header">
        <div>
          <h1 className="page-title">Personalized Strategies</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            AI-driven carbon reduction goals customized based on your highest carbon segments.
          </p>
        </div>
      </div>

      {/* Savings Summary Cards */}
      <div className="grid-cols-3" style={{ marginBottom: '32px' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
            <CheckSquare size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Adoptions</span>
            <span className="stat-val">{adoptedTips.length} Tips</span>
            <span className="stat-subtext">Earned points: {adoptedTips.length * 100} pts</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">In Progress</span>
            <span className="stat-val">{inProgressTips.length} Tips</span>
            <span className="stat-subtext">Currently implementing</span>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
            <Sparkles size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Active Monthly Savings</span>
            <span className="stat-val">{totalMonthlySavings} kg</span>
            <span className="stat-subtext" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              +{potentialSavings} kg potential savings
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '24px' }}>Recommended Actions</h3>

        {tips.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '20px 0', textAlign: 'center' }}>
            No recommendations generated. Run a carbon footprint calculation first!
          </p>
        ) : (
          <div className="tips-grid">
            {tips.map((tip) => {
              const categoryColorMap = {
                Transport: 'var(--color-transport)',
                Energy: 'var(--color-energy)',
                Diet: 'var(--color-diet)',
                Purchases: 'var(--color-purchases)'
              };

              const diffClassMap = {
                Easy: 'diff-easy',
                Medium: 'diff-medium',
                Hard: 'diff-hard'
              };

              const catBg = categoryColorMap[tip.category] + '1F'; // 12% opacity

              return (
                <div key={tip.id} className="card tip-card" style={{ padding: '20px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span 
                        className="tip-cat-badge" 
                        style={{ backgroundColor: catBg, color: categoryColorMap[tip.category] }}
                      >
                        {tip.category}
                      </span>
                      <span className={`badge-difficulty ${diffClassMap[tip.difficulty]}`}>
                        {tip.difficulty}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>
                      {tip.title}
                    </h4>
                    
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '680px' }}>
                      {tip.description}
                    </p>

                    <div className="tip-meta">
                      <span className="tip-meta-item">
                        <Clock size={14} />
                        Timeline: {tip.timeline}
                      </span>
                      <span className="tip-meta-item">
                        <Activity size={14} />
                        Est. savings: {tip.savings} kg CO2e / month
                      </span>
                    </div>
                  </div>

                  <div className="tip-action-section">
                    <div style={{ textAlign: 'right' }}>
                      <div className="tip-savings">-{tip.savings} kg</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CO2e / mo</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      {tip.status === 'none' && (
                        <>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '0.8rem', flexGrow: 1 }}
                            onClick={() => handleStatusChange(tip.id, 'in_progress')}
                          >
                            Set In Progress
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '8px 12px', fontSize: '0.8rem', flexGrow: 1 }}
                            onClick={() => handleStatusChange(tip.id, 'adopted')}
                          >
                            Adopt Tip
                          </button>
                        </>
                      )}

                      {tip.status === 'in_progress' && (
                        <>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '0.8rem', flexGrow: 1 }}
                            onClick={() => handleStatusChange(tip.id, 'none')}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '8px 12px', fontSize: '0.8rem', flexGrow: 1 }}
                            onClick={() => handleStatusChange(tip.id, 'adopted')}
                          >
                            Complete & Adopt
                          </button>
                        </>
                      )}

                      {tip.status === 'adopted' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                          <span style={{ color: 'var(--accent-color)', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                            <CheckSquare size={16} /> Adopted!
                          </span>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', marginLeft: 'auto' }}
                            onClick={() => handleStatusChange(tip.id, 'none')}
                          >
                            Undo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
