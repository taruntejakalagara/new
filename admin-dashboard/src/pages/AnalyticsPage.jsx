import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Car, Users, DollarSign, Clock, 
  RefreshCw, Calendar, ArrowUp, ArrowDown
} from 'lucide-react';
import { API_BASE_URL, getCurrentEST, toESTDate } from '../config/api';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('today');
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    totalRetrievals: 0,
    totalRevenue: 0,
    avgWaitTime: 0,
    peakHour: '6 PM',
    activeVenues: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getCurrentEST());

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => setCurrentTime(getCurrentEST()), 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics?range=${timeRange}`);
      const data = await response.json();
      if (data.success) setStats(data.stats);
      else {
        // Demo data
        setStats({
          totalCheckIns: 156,
          totalRetrievals: 142,
          totalRevenue: 2340,
          avgWaitTime: 4.2,
          peakHour: '6 PM',
          activeVenues: 3,
          checkInsChange: 12,
          revenueChange: 8,
          waitTimeChange: -5
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setStats({
        totalCheckIns: 156, totalRetrievals: 142, totalRevenue: 2340,
        avgWaitTime: 4.2, peakHour: '6 PM', activeVenues: 3,
        checkInsChange: 12, revenueChange: 8, waitTimeChange: -5
      });
    } finally { setLoading(false); }
  };

  const statCards = [
    { label: 'Total Check-ins', value: stats.totalCheckIns, icon: Car, color: 'blue', change: stats.checkInsChange },
    { label: 'Total Retrievals', value: stats.totalRetrievals, icon: TrendingUp, color: 'green' },
    { label: 'Revenue', value: `$${stats.totalRevenue?.toLocaleString()}`, icon: DollarSign, color: 'purple', change: stats.revenueChange },
    { label: 'Avg Wait Time', value: `${stats.avgWaitTime}m`, icon: Clock, color: 'orange', change: stats.waitTimeChange }
  ];

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="current-time"><Clock size={14} />{currentTime}</p>
        </div>
        <div className="header-actions">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="time-select">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button className="refresh-btn" onClick={fetchAnalytics}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <div key={i} className={`stat-card ${stat.color}`}>
            <div className="stat-icon"><stat.icon size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              {stat.change !== undefined && (
                <span className={`stat-change ${stat.change >= 0 ? 'positive' : 'negative'}`}>
                  {stat.change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {Math.abs(stat.change)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>Hourly Activity</h3>
          <div className="chart-placeholder">
            <BarChart3 size={48} />
            <p>Chart visualization will appear here</p>
            <p className="peak-info">Peak Hour: <strong>{stats.peakHour} EST</strong></p>
          </div>
        </div>

        <div className="chart-card">
          <h3>Venue Performance</h3>
          <div className="venue-stats">
            <div className="venue-stat-row">
              <span className="venue-name">Fairmont Pittsburgh</span>
              <div className="venue-bar"><div className="bar-fill" style={{width: '85%'}} /></div>
              <span className="venue-count">45 vehicles</span>
            </div>
            <div className="venue-stat-row">
              <span className="venue-name">Westin Convention</span>
              <div className="venue-bar"><div className="bar-fill" style={{width: '65%'}} /></div>
              <span className="venue-count">32 vehicles</span>
            </div>
            <div className="venue-stat-row">
              <span className="venue-name">Omni William Penn</span>
              <div className="venue-bar"><div className="bar-fill" style={{width: '45%'}} /></div>
              <span className="venue-count">21 vehicles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-card">
          <h4>Quick Stats</h4>
          <div className="summary-list">
            <div className="summary-item">
              <span>Active Venues</span>
              <strong>{stats.activeVenues}</strong>
            </div>
            <div className="summary-item">
              <span>Peak Hour</span>
              <strong>{stats.peakHour} EST</strong>
            </div>
            <div className="summary-item">
              <span>Completion Rate</span>
              <strong>{stats.totalRetrievals && stats.totalCheckIns ? 
                Math.round((stats.totalRetrievals / stats.totalCheckIns) * 100) : 0}%</strong>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .analytics-page { padding: 2rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .current-time { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; }
        .header-actions { display: flex; gap: 0.75rem; }
        .time-select { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: white; font-size: 0.875rem; }
        .refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; border-radius: 12px; padding: 1.5rem; display: flex; align-items: flex-start; gap: 1rem; border: 1px solid #e2e8f0; }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
        .stat-card.blue .stat-icon { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .stat-card.green .stat-icon { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .stat-card.purple .stat-icon { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
        .stat-card.orange .stat-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .stat-content { flex: 1; }
        .stat-value { display: block; font-size: 1.75rem; font-weight: 700; color: #1e293b; }
        .stat-label { display: block; color: #64748b; font-size: 0.875rem; margin-bottom: 0.25rem; }
        .stat-change { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 500; padding: 0.125rem 0.5rem; border-radius: 4px; }
        .stat-change.positive { background: #dcfce7; color: #16a34a; }
        .stat-change.negative { background: #fef2f2; color: #dc2626; }

        .charts-section { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        .chart-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; }
        .chart-card h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin-bottom: 1rem; }
        .chart-placeholder { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
        .chart-placeholder svg { margin-bottom: 0.75rem; opacity: 0.5; }
        .peak-info { margin-top: 1rem; font-size: 0.875rem; }
        .peak-info strong { color: #3b82f6; }

        .venue-stats { display: flex; flex-direction: column; gap: 1rem; }
        .venue-stat-row { display: flex; align-items: center; gap: 1rem; }
        .venue-name { width: 160px; font-size: 0.875rem; color: #374151; }
        .venue-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 4px; }
        .venue-count { font-size: 0.8125rem; color: #64748b; width: 80px; text-align: right; }

        .summary-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .summary-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; }
        .summary-card h4 { font-size: 0.9375rem; font-weight: 600; color: #1e293b; margin-bottom: 1rem; }
        .summary-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .summary-item { display: flex; justify-content: space-between; font-size: 0.875rem; }
        .summary-item span { color: #64748b; }
        .summary-item strong { color: #1e293b; }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .charts-section { grid-template-columns: 1fr; }
          .summary-section { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
