import React, { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import Toast from './components/Toast';

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
  Moon
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Memoised page components — only re-render when their own props change
// ---------------------------------------------------------------------------
const MemoizedDashboard      = React.memo(Dashboard);
const MemoizedCalculator     = React.memo(Calculator);
const MemoizedRecommendations = React.memo(Recommendations);
const MemoizedLeaderboard    = React.memo(Leaderboard);
const MemoizedEducationalHub = React.memo(EducationalHub);
const MemoizedProfile        = React.memo(Profile);

// ---------------------------------------------------------------------------
// Toast helper hook (keeps toast logic out of App body)
// ---------------------------------------------------------------------------
function useToasts() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const { user, loading, login, logout, updateUser, refreshUser } = useAuth();
  const { toasts, showToast, removeToast } = useToasts();

  const [activeTab, setActiveTab]         = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [theme, setTheme]                 = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  // Apply theme to DOM
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ---------------------------------------------------------------------------
  // Stable callbacks (wrapped in useCallback to avoid child re-renders)
  // ---------------------------------------------------------------------------

  const handleAuthSuccess = useCallback((authenticatedUser, jwtToken) => {
    login(authenticatedUser, jwtToken);
    setActiveTab('dashboard');
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    setActiveTab('dashboard');
    showToast('Signed out successfully.');
  }, [logout, showToast]);

  const handlePointsChange = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  const handleCalculationSuccess = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    refreshUser();
    setActiveTab('dashboard');
  }, [refreshUser]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Unauthenticated layout
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <>
        <Auth onAuthSuccess={handleAuthSuccess} showToast={showToast} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated layout
  // ---------------------------------------------------------------------------
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
            {[
              { tab: 'dashboard',       icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
              { tab: 'calculator',      icon: <CalcIcon size={18} />,        label: 'Calculator' },
              { tab: 'recommendations', icon: <Sparkles size={18} />,        label: 'Recommendations' },
              { tab: 'leaderboard',     icon: <Trophy size={18} />,          label: 'Leaderboard' },
              { tab: 'educational',     icon: <BookOpen size={18} />,        label: 'Educational Hub' },
              { tab: 'profile',         icon: <UserIcon size={18} />,        label: 'Profile Settings' }
            ].map(({ tab, icon, label }) => (
              <li key={tab} className={`nav-item ${activeTab === tab ? 'active' : ''}`}>
                <button onClick={() => setActiveTab(tab)}>
                  {icon}
                  {label}
                </button>
              </li>
            ))}
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
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Dark Theme
            </span>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-wrapper">
        {activeTab === 'dashboard'       && <MemoizedDashboard user={user} onNavigate={setActiveTab} refreshTrigger={refreshTrigger} />}
        {activeTab === 'calculator'      && <MemoizedCalculator onCalculationSuccess={handleCalculationSuccess} showToast={showToast} />}
        {activeTab === 'recommendations' && <MemoizedRecommendations onPointsChange={handlePointsChange} showToast={showToast} />}
        {activeTab === 'leaderboard'     && <MemoizedLeaderboard user={user} onPointsChange={handlePointsChange} showToast={showToast} />}
        {activeTab === 'educational'     && <MemoizedEducationalHub onPointsChange={handlePointsChange} showToast={showToast} />}
        {activeTab === 'profile'         && <MemoizedProfile user={user} onProfileUpdate={updateUser} onLogout={handleLogout} showToast={showToast} />}
      </main>

      {/* Single toast stack — no longer duplicated */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
