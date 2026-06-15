import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trophy, Medal, Award, Compass, Shield, BookOpen, Sparkles, Star, Users, Trash2, ShieldAlert } from 'lucide-react';

const ICON_MAP = {
  Compass: Compass,
  Shield: Shield,
  Award: Award,
  BookOpen: BookOpen,
  Sparkles: Sparkles
};

export default function Leaderboard({ user, onPointsChange, showToast }) {
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState([]);
  const [badges, setBadges] = useState([]);
  const [error, setError] = useState(null);

  // Challenges State (persisted locally)
  const [claimedChallenges, setClaimedChallenges] = useState(() => {
    return {
      reduce_10: localStorage.getItem(`challenge_reduce_10_${user?.id}`) === 'true',
      no_plastic: localStorage.getItem(`challenge_no_plastic_${user?.id}`) === 'true',
      public_transport: localStorage.getItem(`challenge_public_transport_${user?.id}`) === 'true',
      energy_saving: localStorage.getItem(`challenge_energy_saving_${user?.id}`) === 'true'
    };
  });

  async function fetchData() {
    try {
      const leaderboardData = await api.getLeaderboard();
      const badgesData = await api.getBadges();
      setLeaders(leaderboardData);
      setBadges(badgesData);
    } catch (err) {
      setError(err.message || 'Failed to fetch gamification details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [user]);

  const claimChallenge = (key, valueRequired = false) => {
    if (claimedChallenges[key]) return;

    if (valueRequired) {
      const myRank = leaders.find(l => l.id === user.id);
      if (!myRank || myRank.reductionPercent < 10) {
        showToast('You must reduce your carbon footprint by at least 10% compared to your baseline to claim this!', 'error');
        return;
      }
    }

    fetch('http://localhost:5000/api/leaderboard/claim-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ challenge_key: key })
    })
    .then(res => {
      if (!res.ok) throw new Error('Claim failed');
      return res.json();
    })
    .then(data => {
      showToast(data.message || 'Challenge claimed!');
      localStorage.setItem(`challenge_${key}_${user.id}`, 'true');
      setClaimedChallenges(prev => ({
        ...prev,
        [key]: true
      }));
      onPointsChange();
      fetchData(); // Reload standings
    })
    .catch(err => {
      showToast(err.message || 'Failed to claim challenge', 'error');
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', minHeight: '60vh', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Loading leaderboard standings and achievements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Error Loading Leaderboard</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
        <button className="btn btn-secondary" onClick={fetchData}>Try Again</button>
      </div>
    );
  }

  const myLeaderboardEntry = leaders.find(l => l.id === user?.id);
  const myReduction = myLeaderboardEntry ? myLeaderboardEntry.reductionPercent : 0;

  // Level calculation: 1 level per 200 points
  const points = user?.points || 0;
  const level = Math.floor(points / 200) + 1;
  const pointsToNextLevel = 200 - (points % 200);

  return (
    <div>
      <div className="top-header">
        <div>
          <h1 className="page-title">Community & Standings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Compete on the global leaderboard, complete sustainability challenges, and earn milestones.
          </p>
        </div>
      </div>

      {/* User Level and Progress */}
      <div className="card" style={{ padding: '24px 32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-color)' }}>Gamification Status</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '2px' }}>Level {level} Environmentalist</h3>
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            <strong>{points}</strong> total points ({pointsToNextLevel} pts to level {level + 1})
          </span>
        </div>
        <div style={{ height: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((points % 200) / 200) * 100}%`, backgroundColor: 'var(--accent-color)', borderRadius: '5px' }} />
        </div>
      </div>

      {/* Eco Challenges Grid */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Star size={20} style={{ color: 'var(--color-energy)' }} />
        Active Eco Challenges
      </h3>
      <div className="grid-cols-2" style={{ gap: '20px', marginBottom: '32px' }}>
        {/* Challenge 1 */}
        <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', borderLeft: '4px solid var(--color-energy)' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-energy)' }}>
            <Star size={20} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Reduce by 10% this Month</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
              Cut your latest carbon calculation by 10% compared to your baseline log.
            </p>
            <div style={{ marginTop: '12px' }}>
              {claimedChallenges.reduce_10 ? (
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>✓ Claimed (200 pts)</span>
              ) : (
                <button 
                  className={`btn ${myReduction >= 10 ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  onClick={() => claimChallenge('reduce_10', true)}
                >
                  Claim 200 pts
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Challenge 2 */}
        <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', borderLeft: '4px solid var(--accent-color)' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
            <Shield size={20} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>No-Plastic Challenge</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
              Avoid single-use plastics (bottles, bags, cutlery) for a full week.
            </p>
            <div style={{ marginTop: '12px' }}>
              {claimedChallenges.no_plastic ? (
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>✓ Claimed (150 pts)</span>
              ) : (
                <button 
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  onClick={() => claimChallenge('no_plastic', false)}
                >
                  Claim 150 pts
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Challenge 3 */}
        <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', borderLeft: '4px solid var(--color-transport)' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-transport)' }}>
            <Compass size={20} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Public Transit Day</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
              Commute to work or school using only public transit, trains, or walking.
            </p>
            <div style={{ marginTop: '12px' }}>
              {claimedChallenges.public_transport ? (
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>✓ Claimed (150 pts)</span>
              ) : (
                <button 
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  onClick={() => claimChallenge('public_transport', false)}
                >
                  Claim 150 pts
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Challenge 4 */}
        <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', borderLeft: '4px solid var(--color-purchases)' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: 'var(--color-purchases)' }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>Energy-Saving Day</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
              Unplug vampire appliances and keep lighting off during daylight hours.
            </p>
            <div style={{ marginTop: '12px' }}>
              {claimedChallenges.energy_saving ? (
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>✓ Claimed (150 pts)</span>
              ) : (
                <button 
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  onClick={() => claimChallenge('energy_saving', false)}
                >
                  Claim 150 pts
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-cols-3">
        {/* Leaderboard Rankings */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} style={{ color: 'var(--color-energy)' }} />
              Global Standings
            </h3>

            <div className="leaderboard-list">
              {leaders.map((entry) => {
                const isMe = entry.id === user?.id;
                
                let rankClass = 'rank-default';
                if (entry.rank === 1) rankClass = 'rank-top1';
                else if (entry.rank === 2) rankClass = 'rank-top2';
                else if (entry.rank === 3) rankClass = 'rank-top3';

                return (
                  <div key={entry.id} className={`leaderboard-item ${isMe ? 'me' : ''}`}>
                    <div className={`rank-badge ${rankClass}`}>
                      {entry.rank}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="leaderboard-name">{entry.name} {isMe && '(You)'}</span>
                      <span className="leaderboard-location">{entry.location}</span>
                    </div>

                    <div className="leaderboard-badges-unlocked">
                      {entry.badges.map(bKey => {
                        return (
                          <span 
                            key={bKey} 
                            className="mini-badge" 
                            style={{ backgroundColor: bKey === 'first_step' ? '#3b82f6' : bKey === 'green_guardian' ? '#10b981' : '#8b5cf6' }}
                            title={bKey.replace('_', ' ')}
                          >
                            {bKey[0].toUpperCase()}
                          </span>
                        );
                      })}
                    </div>

                    <div className="leaderboard-stats">
                      <div className="leaderboard-stat">
                        <span className="leaderboard-stat-label">Reduction</span>
                        <span className="leaderboard-stat-val" style={{ color: entry.reductionPercent >= 0 ? 'var(--accent-color)' : '#ef4444' }}>
                          {entry.reductionPercent >= 0 ? `-${entry.reductionPercent}%` : `+${Math.abs(entry.reductionPercent)}%`}
                        </span>
                      </div>
                      <div className="leaderboard-stat" style={{ minWidth: '80px' }}>
                        <span className="leaderboard-stat-label">Total Score</span>
                        <span className="leaderboard-stat-val">{entry.points} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Achievements / Badges Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Medal size={20} style={{ color: 'var(--accent-color)' }} />
              Milestone Badges
            </h3>

            <div className="badges-grid" style={{ gridTemplateColumns: '1fr' }}>
              {badges.map((badge) => {
                const IconComponent = ICON_MAP[badge.icon] || Compass;
                return (
                  <div 
                    key={badge.key} 
                    className={`card badge-card ${badge.unlocked ? 'unlocked' : ''}`}
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      textAlign: 'left', 
                      padding: '16px',
                      opacity: badge.unlocked ? 1 : 0.45,
                      filter: badge.unlocked ? 'none' : 'grayscale(0.95)',
                      backgroundColor: badge.unlocked ? 'var(--card-bg)' : 'transparent',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div 
                      className="badge-card-icon" 
                      style={{ 
                        backgroundColor: badge.unlocked ? badge.color : 'var(--bg-secondary)', 
                        margin: 0, 
                        marginRight: '16px',
                        width: '48px',
                        height: '48px'
                      }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 className="badge-card-name" style={{ fontSize: '0.9rem' }}>{badge.name}</h4>
                      <p className="badge-card-desc" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>{badge.description}</p>
                      {badge.unlocked && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-color)', fontWeight: '600', display: 'block', marginTop: '4px' }}>
                          Unlocked {new Date(badge.awarded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
