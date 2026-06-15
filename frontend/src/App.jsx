import React, { useState, useEffect } from 'react';
import api from './services/api';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Calculator from './pages/Calculator';
import Recommendations from './pages/Recommendations';
import Leaderboard from './pages/Leaderboard';
import EducationalHub from './pages/EducationalHub';
import Profile from './pages/Profile';

// Styles & Icons
import './App.css';
import { 
  Leaf, 
  LayoutDashboard, 
  Calculator as CalcIcon, 
  Sparkles, 
  Trophy, 
  BookOpen, 
  User as UserIcon, 
  Sun, 
  Moon,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  // Toasts State
  const [toasts, setToasts] = useState([]);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toast helper
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load user profile if token is present
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        api.logout();
        setToken(null);
        setUser(null);
        showToast('Session expired. Please log in again.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const handleAuthSuccess = (authenticatedUser, jwtToken) => {
    setToken(jwtToken);
    setUser(authenticatedUser);
    setActiveTab('dashboard');
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(prev => ({
      ...prev,
      ...updatedUser
    }));
  };

  const handleLogout = () => {
    api.logout();
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    showToast('Signed out successfully.');
  };

  const handlePointsChange = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user points:', err);
    }
  };

  const handleCalculationSuccess = (result) => {
    setRefreshTrigger(prev => prev + 1);
    handlePointsChange(); // Refresh points / badges in sidebar
    setActiveTab('dashboard'); // Redirect to dashboard
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <Leaf className="logo-icon animate-bounce" size={48} style={{ color: 'var(--accent-color)', margin: '0 auto 16px' }} />
          <h2 style={{ color: 'var(--text-primary)', fontWeight: '700' }}>Initializing TerraSense...</h2>
        </div>
      </div>
    );
  }

  // Not Authenticated Layout
  if (!user) {
    return (
      <>
        <Auth onAuthSuccess={handleAuthSuccess} showToast={showToast} />
        
        {/* Toast Stack */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast" style={{ borderLeft: `4px solid ${t.type === 'error' ? '#ef4444' : 'var(--accent-color)'}` }}>
              {t.type === 'error' ? (
                <AlertCircle size={18} style={{ color: '#ef4444' }} />
              ) : (
                <CheckCircle size={18} style={{ color: 'var(--accent-color)' }} />
              )}
              <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>{t.message}</span>
              <button 
                onClick={() => removeToast(t.id)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: '8px', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Authenticated Layout
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <Leaf className="logo-icon" size={26} />
          <span className="logo-text">TerraSense</span>
        </div>

        <nav>
          <ul className="nav-menu">
            <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('dashboard')}>
                <LayoutDashboard size={18} />
                Dashboard
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'calculator' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('calculator')}>
                <CalcIcon size={18} />
                Calculator
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'recommendations' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('recommendations')}>
                <Sparkles size={18} />
                Recommendations
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('leaderboard')}>
                <Trophy size={18} />
                Leaderboard
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'educational' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('educational')}>
                <BookOpen size={18} />
                Educational Hub
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('profile')}>
                <UserIcon size={18} />
                Profile Settings
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-points">{user.points || 0} Points</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Dark Theme</span>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-wrapper">
        {activeTab === 'dashboard' && (
          <Dashboard user={user} onNavigate={setActiveTab} refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'calculator' && (
          <Calculator onCalculationSuccess={handleCalculationSuccess} showToast={showToast} />
        )}
        {activeTab === 'recommendations' && (
          <Recommendations onPointsChange={handlePointsChange} showToast={showToast} />
        )}
        {activeTab === 'leaderboard' && (
          <Leaderboard user={user} onPointsChange={handlePointsChange} showToast={showToast} />
        )}
        {activeTab === 'educational' && (
          <EducationalHub onPointsChange={handlePointsChange} showToast={showToast} />
        )}
        {activeTab === 'profile' && (
          <Profile user={user} onProfileUpdate={handleProfileUpdate} onLogout={handleLogout} showToast={showToast} />
        )}
      </main>

      {/* Toast Stack */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderLeft: `4px solid ${t.type === 'error' ? '#ef4444' : 'var(--accent-color)'}` }}>
            {t.type === 'error' ? (
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
            ) : (
              <CheckCircle size={18} style={{ color: 'var(--accent-color)' }} />
            )}
            <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>{t.message}</span>
            <button 
              onClick={() => removeToast(t.id)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: '8px', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
