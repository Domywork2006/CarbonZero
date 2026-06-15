import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DonutChart, LineChart } from '../components/Charts';
import { 
  TrendingDown, 
  TrendingUp, 
  Download, 
  Leaf, 
  Calendar, 
  Award, 
  Flame, 
  FileText, 
  Printer, 
  CheckCircle,
  HelpCircle,
  TrendingUp as TrendIcon,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function Dashboard({ user, onNavigate, refreshTrigger }) {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [error, setError] = useState(null);

  // Modals state
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const summary = await api.getSummary();
        const history = await api.getHistory();
        setSummaryData(summary);
        setHistoryData(history);
      } catch (err) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshTrigger]);

  const exportCSV = () => {
    if (historyData.length === 0) return;

    const headers = [
      'Date', 'Total CO2e (kg)', 'Transport CO2e (kg)', 'Energy CO2e (kg)', 'Diet CO2e (kg)', 'Waste CO2e (kg)', 'Water CO2e (kg)', 'Purchases CO2e (kg)',
      'Car Miles', 'Bus Miles', 'Train Miles', 'Flight Miles', 'Bike Miles',
      'Electricity (kWh)', 'Gas (kWh)', 'Heating (kWh)', 'Water (L)',
      'Veg Meals', 'Meat Meals', 'Vegan Meals', 'Waste (kg)',
      'Clothing Items', 'Electronics Items', 'Shipping Packages'
    ];

    const rows = historyData.map(h => [
      h.date, h.co2_total, h.co2_transport, h.co2_energy, h.co2_diet, h.co2_waste || 0, h.co2_water || 0, h.co2_purchases,
      h.car_miles, h.bus_miles, h.train_miles || 0, h.flight_miles, h.bike_miles,
      h.electricity_kwh, h.gas_kwh, h.heating_kwh, h.water_liters || 0,
      h.veg_meals, h.meat_meals, h.vegan_meals, h.waste_kg || 0,
      h.clothing_items, h.electronics_items, h.shipping_packages
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `terrasense_footprint_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Loading TerraSense carbon metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Error Loading Dashboard</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (!summaryData || !summaryData.hasData) {
    return (
      <div className="card" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: '600px', margin: '60px auto' }}>
        <Leaf size={48} style={{ color: 'var(--accent-color)', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '12px' }}>Welcome to TerraSense</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
          We don't have any carbon calculation records for you yet. 
          Complete your first calculation to unlock your carbon score, sustainability recommendations, and community badges!
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate('calculator')}>
          Calculate First Footprint
        </button>
      </div>
    );
  }

  const { latest, baseline, score, reductionPercent, prediction, nationalAverages } = summaryData;
  const target = user?.reduction_target || 20.0;
  
  // Format category data for Donut Chart
  const donutData = [
    { name: 'Transport', value: latest.categories.transport, color: 'var(--color-transport)' },
    { name: 'Energy', value: latest.categories.energy, color: 'var(--color-energy)' },
    { name: 'Diet', value: latest.categories.diet, color: 'var(--color-diet)' },
    { name: 'Lifestyle & Waste', value: latest.categories.purchases + (latest.categories.waste || 0) + (latest.categories.water || 0), color: 'var(--color-purchases)' }
  ];

  // Circular progress stroke logic for the score dial
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine highest emission category
  const categoriesMap = {
    Transportation: latest.categories.transport,
    'Home Utilities': latest.categories.energy,
    'Diet & Food': latest.categories.diet,
    'Lifestyle & Waste': latest.categories.purchases + (latest.categories.waste || 0) + (latest.categories.water || 0)
  };
  const highestCategoryName = Object.keys(categoriesMap).reduce((a, b) => categoriesMap[a] > categoriesMap[b] ? a : b);
  const highestCategoryValue = Math.round(categoriesMap[highestCategoryName]);

  // Streak details
  const streak = user?.streak || 0;

  // Eligibility for certificate: Points >= 500 OR reductionPercent >= 50%
  const isEligibleForCertificate = (user?.points || 0) >= 500 || reductionPercent >= 50;

  return (
    <div>
      <div className="top-header">
        <div>
          <h1 className="page-title">TerraSense Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            AI-powered carbon accounting and reduction portal.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowReportModal(true)}>
            <FileText size={16} />
            AI report
          </button>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('calculator')}>
            New Log
          </button>
        </div>
      </div>

      {/* Top statistics widgets */}
      <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>
            <Leaf size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Footprint</span>
            <span className="stat-val">{latest.total} kg</span>
            <span className="stat-subtext">CO2e/month</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: reductionPercent >= 0 ? '#d1fae5' : '#fee2e2', color: reductionPercent >= 0 ? '#10b981' : '#ef4444' }}>
            {reductionPercent >= 0 ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
          </div>
          <div className="stat-content">
            <span className="stat-label">vs Baseline</span>
            <span className="stat-val" style={{ color: reductionPercent >= 0 ? '#10b981' : '#ef4444' }}>
              {reductionPercent >= 0 ? `-${reductionPercent}%` : `+${Math.abs(reductionPercent)}%`}
            </span>
            <span className="stat-subtext">Baseline: {baseline.total} kg</span>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: streak > 0 ? '3px solid #f59e0b' : 'none' }}>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Flame size={24} className={streak > 0 ? 'animate-pulse' : ''} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Logging Streak</span>
            <span className="stat-val">{streak} Months</span>
            <span className="stat-subtext">consecutive logs</span>
          </div>
        </div>

        <div className="card stat-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <div className="score-circle-container">
            <svg className="score-svg" style={{ width: '80px', height: '80px' }}>
              <circle className="score-bg-ring" cx="40" cy="40" r={radius} strokeWidth="8" />
              <circle 
                className="score-progress-ring" 
                cx="40" 
                cy="40" 
                r={radius} 
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="score-text-overlay">
              <span className="score-number" style={{ fontSize: '1.25rem' }}>{score}</span>
            </div>
          </div>
          <div className="stat-content" style={{ alignSelf: 'center' }}>
            <span className="stat-label">Carbon Score</span>
            <strong style={{ fontSize: '0.9rem', color: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444' }}>
              {score >= 70 ? 'Excellent' : score >= 40 ? 'Moderate' : 'High Impact'}
            </strong>
          </div>
        </div>
      </div>

      {/* Goal Progress & Certificate Button */}
      <div className="card" style={{ marginBottom: '32px', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Goal Progress: Reduce by {target}%</h3>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Current reduction: <strong>{reductionPercent > 0 ? Math.round(reductionPercent) : 0}%</strong> / {target}%
              </span>
            </div>
            <div style={{ height: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden' }}>
              {reductionPercent > 0 ? (
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${Math.min(100, (reductionPercent / target) * 100)}%`, 
                    background: reductionPercent >= target ? 'var(--primary-gradient)' : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.8s ease'
                  }} 
                />
              ) : null}
            </div>
          </div>

          {isEligibleForCertificate && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCertificateModal(true)}
              style={{ padding: '10px 20px', alignSelf: 'flex-end', fontSize: '0.88rem' }}
            >
              <Award size={16} />
              View Certificate
            </button>
          )}
        </div>
      </div>

      {/* Predictions and National Averages section */}
      <div className="grid-cols-2" style={{ marginBottom: '32px' }}>
        {/* Prediction Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendIcon size={18} style={{ color: 'var(--accent-color)' }} />
              Footprint Forecast
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Predictive calculation based on your historical logs, indicating next month's estimated footprint.
            </p>
          </div>
          <div style={{ margin: '24px 0', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', color: prediction.predictedNextMonth < latest.total ? 'var(--accent-color)' : '#ef4444' }}>
              {prediction.predictedNextMonth} kg
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>CO2e next month</span>
          </div>
          <div style={{ fontSize: '0.8rem', padding: '10px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {prediction.status === 'decreasing' 
              ? '✨ Fantastic! Based on your recent trajectory, your footprint is projected to decline.' 
              : '⚠️ Your emissions show an upward trajectory. We suggest adopting additional recommendations.'}
          </div>
        </div>

        {/* National Comparison Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>National Comparisons</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Your monthly emissions compared against global average monthly kg CO2e levels.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* User */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700' }}>You ({latest.total} kg)</span>
                <strong>Score: {score}</strong>
              </div>
              <div style={{ height: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (latest.total / 1500) * 100)}%`, backgroundColor: 'var(--accent-color)' }} />
              </div>
            </div>

            {/* Global */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span>Global Average ({nationalAverages.global} kg)</span>
              </div>
              <div style={{ height: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(nationalAverages.global / 1500) * 100}%`, backgroundColor: '#9ca3af' }} />
              </div>
            </div>

            {/* US */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span>U.S. Average ({nationalAverages.US} kg)</span>
              </div>
              <div style={{ height: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(nationalAverages.US / 1500) * 100}%`, backgroundColor: '#ef4444' }} />
              </div>
            </div>

            {/* India */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span>India Average ({nationalAverages.India} kg)</span>
              </div>
              <div style={{ height: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(nationalAverages.India / 1500) * 100}%`, backgroundColor: '#10b981' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid-cols-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '20px' }}>Emissions by Category</h3>
          <div style={{ height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DonutChart data={donutData} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '20px' }}>Carbon Trend</h3>
          <div style={{ height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LineChart data={summaryData.trend} categoryColors={latest.categories} />
          </div>
        </div>
      </div>

      {/* ==========================================
          AI SUSTAINABILITY REPORT MODAL
          ========================================== */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <button className="modal-close" onClick={() => setShowReportModal(false)}>
              <X size={20} />
            </button>
            
            <div id="printable-area-report">
              <div style={{ borderBottom: '2px solid var(--accent-color)', paddingBottom: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Leaf size={28} style={{ color: 'var(--accent-color)' }} />
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>TerraSense AI Sustainability Report</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Generated on: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.92rem', lineHeight: '1.6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                  <div>
                    <strong>Client:</strong> {user?.name}<br />
                    <strong>Location:</strong> {user?.location || 'Not specified'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>Monthly Carbon Footprint:</strong> {latest.total} kg CO2e<br />
                    <strong>Carbon Score:</strong> {score}/100
                  </div>
                </div>

                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--accent-color)', marginBottom: '8px' }}>Executive Summary</h4>
                  <p>
                    Based on your latest calculations logged on {new Date(latest.date).toLocaleDateString()}, your total carbon output is <strong>{latest.total} kg CO2e</strong>. 
                    This places you in the <strong>{score >= 70 ? 'low-impact' : score >= 40 ? 'moderate-impact' : 'high-impact'}</strong> category. 
                    Your emissions are currently {reductionPercent >= 0 ? `lower by ${reductionPercent}%` : `higher by ${Math.abs(reductionPercent)}%`} relative to your baseline.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--accent-color)', marginBottom: '8px' }}>High-Impact Segments</h4>
                  <p>
                    Our analysis indicates that your primary source of greenhouse gas emissions is <strong>{highestCategoryName}</strong>, contributing <strong>{highestCategoryValue} kg CO2e</strong> (or {latest.total > 0 ? Math.round((highestCategoryValue / latest.total) * 100) : 0}% of your total footprint). 
                    Focusing reduction efforts in this area will yield the highest climate ROI.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--accent-color)', marginBottom: '8px' }}>Targeted Advisor Recommendations</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {highestCategoryName === 'Transportation' && (
                      <>
                        <li>🚲 <strong>Active Commuting:</strong> Switch car trips under 2 miles to walking/biking (saves ~25 kg/month).</li>
                        <li>🚌 <strong>Ride Transit:</strong> Carpool or take buses/trains twice a week (saves ~50 kg/month).</li>
                      </>
                    )}
                    {highestCategoryName === 'Home Utilities' && (
                      <>
                        <li>☀️ <strong>Green Tariff:</strong> Switch to a 100% renewable electricity tariff provider (saves ~150 kg/month).</li>
                        <li>🌡️ <strong>Smart Controls:</strong> Install a programmable thermostat to optimize temperature (saves ~45 kg/month).</li>
                      </>
                    )}
                    {highestCategoryName === 'Diet & Food' && (
                      <>
                        <li>🥗 <strong>Meatless Mondays:</strong> Swap meat for plant-based proteins 1 day a week (saves ~30 kg/month).</li>
                        <li>🌱 <strong>Plant-centric Diet:</strong> Transition fully to vegetarian or vegan meals (saves ~120-180 kg/month).</li>
                      </>
                    )}
                    {highestCategoryName === 'Lifestyle & Waste' && (
                      <>
                        <li>🛍️ <strong>Secondhand Purchases:</strong> Thrift clothing items instead of buying new (saves ~20 kg/month).</li>
                        <li>♻️ <strong>Composting & Recycling:</strong> Reduce household waste and compost organic matter (saves ~15 kg/month).</li>
                      </>
                    )}
                    <li>🔌 <strong>Vampire Loads:</strong> Unplug household electronics when not in use to eliminate standby draw (saves ~10 kg/month).</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          ACHIEVEMENT CERTIFICATE MODAL
          ========================================== */}
      {showCertificateModal && (
        <div className="modal-overlay" onClick={() => setShowCertificateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', padding: 0, overflow: 'hidden' }}>
            <button className="modal-close" onClick={() => setShowCertificateModal(false)} style={{ top: '24px', right: '24px', zIndex: 10 }}>
              <X size={20} />
            </button>

            <div id="printable-area-certificate" style={{ padding: '48px', backgroundColor: 'var(--bg-primary)', border: '16px solid var(--accent-light)', position: 'relative' }}>
              {/* Inner certificate border */}
              <div style={{ border: '2px solid var(--accent-color)', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Leaf size={40} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
                
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Certificate of Achievement
                </span>
                
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent-color)', margin: '12px 0 24px', letterSpacing: '-0.5px' }}>
                  Sustainability Ambassador
                </h2>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>This is proudly awarded to</p>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '8px', margin: '8px 0 24px', minWidth: '280px' }}>
                  {user?.name}
                </h3>
                
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '480px', marginBottom: '32px' }}>
                  for exceptional dedication to monitoring, reducing, and educating on carbon footprint emissions, having unlocked milestones and achieved a reduction target of <strong>{reductionPercent}%</strong> on the TerraSense platform.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div>
                    <strong>Points Earned:</strong> {user?.points} pts<br />
                    <strong>Calculations Streak:</strong> {streak} Months
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <ShieldCheck size={28} style={{ color: 'var(--accent-color)', marginBottom: '4px' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>TerraSense Verified</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 32px', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setShowCertificateModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
