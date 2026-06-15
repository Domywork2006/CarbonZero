import React, { useState } from 'react';
import api from '../services/api';
import { User, Mail, MapPin, Target, LogOut, Check, Save } from 'lucide-react';

const INTERESTS_OPTIONS = [
  "Public Transit",
  "EV Charging",
  "Renewable Energy",
  "Vegan Diet",
  "Vegetarian",
  "Conscious Buying",
  "Zero Waste",
  "Home Efficiency"
];

export default function Profile({ user, onProfileUpdate, onLogout, showToast }) {
  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [reductionTarget, setReductionTarget] = useState(user?.reduction_target || 20);
  const [selectedInterests, setSelectedInterests] = useState(user?.interests || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInterestToggle = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name) {
      setErrors({ name: 'Name is required' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const updatedUser = await api.updateProfile({
        name,
        location,
        reduction_target: parseFloat(reductionTarget),
        interests: selectedInterests
      });
      
      onProfileUpdate(updatedUser);
      showToast('Profile updated successfully!');
    } catch (err) {
      setErrors({ form: err.message || 'Failed to update profile' });
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="top-header">
        <h1 className="page-title">Profile Settings</h1>
        <button className="btn btn-danger" onClick={onLogout} style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      <div className="grid-cols-3">
        {/* Profile Card and Stats */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: 'fit-content' }}>
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'var(--primary-gradient)', 
              color: 'white', 
              fontSize: '2.5rem', 
              fontWeight: '800', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{user?.name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
            <Mail size={14} /> {user?.email}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-color)' }}>{user?.points || 0}</div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '600' }}>Total Points</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-energy)' }}>{user?.reduction_target || 20}%</div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '600' }}>Target Goal</span>
            </div>
          </div>
        </div>

        {/* Profile Update Form - spans 2 columns */}
        <div className="card flex-grow-2" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '20px' }}>Edit Personal Details</h3>
          
          <form onSubmit={handleSave}>
            {errors.form && (
              <div className="form-error-msg" style={{ marginBottom: '16px' }}>{errors.form}</div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {errors.name && <p className="form-error-msg">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-location">Location</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
                <input
                  id="profile-location"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  placeholder="e.g. London, UK"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Carbon Reduction Target</label>
                <span style={{ fontWeight: '700', color: 'var(--accent-color)', fontSize: '0.9rem' }}>{reductionTarget}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Target size={18} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="range"
                  min="5"
                  max="95"
                  step="5"
                  style={{ flexGrow: 1, accentColor: 'var(--accent-color)' }}
                  value={reductionTarget}
                  onChange={(e) => setReductionTarget(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sustainability Interests</label>
              <div className="interest-tag-selector">
                {INTERESTS_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-option ${selectedInterests.includes(tag) ? 'selected' : ''}`}
                    onClick={() => handleInterestToggle(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full mt-4" 
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving changes...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
