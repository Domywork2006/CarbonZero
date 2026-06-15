import React, { useState } from 'react';
import api from '../services/api';
import { Leaf, Mail, Lock, User, MapPin, Target, ArrowRight } from 'lucide-react';

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

export default function Auth({ onAuthSuccess, showToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [reductionTarget, setReductionTarget] = useState(20);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
  };

  const handleInterestToggle = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email address is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && !name) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(false);
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.login(email, password);
        onAuthSuccess(data.user, data.token);
        showToast('Logged in successfully! Welcome back.');
      } else {
        const data = await api.register(
          name,
          email,
          password,
          location,
          reductionTarget,
          selectedInterests
        );
        onAuthSuccess(data.user, data.token);
        showToast('Account registered successfully! Welcome to TerraSense.');
      }
    } catch (err) {
      setErrors({ form: err.message || 'Authentication failed' });
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Leaf className="logo-icon" size={32} />
            <span className="logo-text" style={{ fontSize: '1.75rem' }}>TerraSense</span>
          </div>
          <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="auth-subtitle">
            {isLogin 
              ? 'Track and reduce your environmental impact today' 
              : 'Join the community and start your green journey'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.form && (
            <div className="form-error-msg" style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.9rem' }}>
              {errors.form}
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {errors.name && <p className="form-error-msg">{errors.name}</p>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {errors.email && <p className="form-error-msg">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {errors.password && <p className="form-error-msg">{errors.password}</p>}
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="location">Location (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-secondary)' }} />
                  <input
                    id="location"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    placeholder="New York, USA"
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
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Sign Up'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="auth-link" onClick={toggleMode}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
