import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Clock, DollarSign, Users,
  Calendar, RefreshCw, Award, Timer, Car, AlertCircle
} from 'lucide-react';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {
      totalRetrievals: 0,
      totalRevenue: 0,
      avgWaitTime: 0,
      peakHour: null,
      totalTips: 0,
    },
    hourlyData: [],
    driverLeaderboard: [],
    revenueBreakdown: {
      valetFees: 0,
      tips: 0,
      cash: 0,
      card: 0,
    },
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [dailyRes, driversRes] = await Promise.all([
        fetch(`${API_BASE_URL}${ENDPOINTS.ANALYTICS_DAILY}?period=${period}`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}${ENDPOINTS.ANALYTICS_DRIVERS}?period=${period}`).then(r => r.json()).catch(() => ({ drivers: [] })),
      ]);

      // Only use actual data from API - no mock data
      setData({
        summary: {
          totalRetrievals: dailyRes.totalRetrievals || 0,
          totalRevenue: dailyRes.totalRevenue || 0,
          avgWaitTime: dailyRes.avgWaitTime || 0,
          peakHour: dailyRes.peakHour || '--',
          totalTips: dailyRes.totalTips || 0,
        },
        hourlyData: dailyRes.hourlyData || [],
        driverLeaderboard: driversRes.drivers || [],
        revenueBreakdown: {
          valetFees: dailyRes.valetFees || 0,
          tips: dailyRes.totalTips || 0,
          cash: dailyRes.cashPayments || 0,
          card: dailyRes.cardPayments || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxRetrievals = Math.max(...data.hourlyData.map(d => d.retrievals), 1);
  const hasData = data.summary.totalRetrievals > 0 || data.summary.totalRevenue > 0;
  const hasDriverData = data.driverLeaderboard.length > 0;

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="spinner lg" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-title">
          <h1>Analytics</h1>
          <p>Performance metrics and insights</p>
        </div>
        <div className="page-header-actions">
          <div className="tabs">
            {['today', 'week', 'month'].map((p) => (
              <button
                key={p}
                className={`tab ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={fetchAnalytics}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Summary Stats */}
        <div className="stats-grid mb-lg">
          <div className="stat-card">
            <div className="stat-icon"><Car size={20} /></div>
            <div className="stat-label">Total Retrievals</div>
            <div className="stat-value">{data.summary.totalRetrievals}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><DollarSign size={20} /></div>
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">${data.summary.totalRevenue.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Timer size={20} /></div>
            <div className="stat-label">Avg Wait Time</div>
            <div className="stat-value">{data.summary.avgWaitTime > 0 ? `${data.summary.avgWaitTime} min` : '--'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><TrendingUp size={20} /></div>
            <div className="stat-label">Total Tips</div>
            <div className="stat-value">${data.summary.totalTips.toFixed(2)}</div>
          </div>
        </div>

        {!hasData ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <BarChart3 size={24} />
              </div>
              <h3>No Data Yet</h3>
              <p>Analytics will appear here once you have completed retrievals.</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-md)' }}>
              {/* Hourly Chart */}
              <div className="card">
                <div className="card-header">
                  <h2>Retrievals by Hour</h2>
                </div>
                <div className="card-body">
                  {data.hourlyData.length === 0 ? (
                    <div className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
                      <Clock size={32} style={{ opacity: 0.3, marginBottom: 'var(--space-sm)' }} />
                      <p>No hourly data available</p>
                    </div>
                  ) : (
                    <div style={{ height: 280, display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 30, position: 'relative' }}>
                      {data.hourlyData.map((item, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div 
                            style={{ 
                              width: '100%', 
                              height: `${(item.retrievals / maxRetrievals) * 200}px`,
                              background: 'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                              borderRadius: '4px 4px 0 0',
                              minHeight: 4,
                              transition: 'height 0.3s ease',
                            }}
                            title={`${item.retrievals} retrievals`}
                          />
                          <div style={{ 
                            fontSize: '0.625rem', 
                            color: 'var(--color-text-muted)',
                            marginTop: 8,
                            position: 'absolute',
                            bottom: 0,
                          }}>
                            {item.hour}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="card">
                <div className="card-header">
                  <h2>Revenue Breakdown</h2>
                </div>
                <div className="card-body">
                  {data.summary.totalRevenue === 0 ? (
                    <div className="text-center text-muted" style={{ padding: 'var(--space-lg)' }}>
                      <DollarSign size={32} style={{ opacity: 0.3, marginBottom: 'var(--space-sm)' }} />
                      <p>No revenue data</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-lg">
                        <div className="flex justify-between mb-sm">
                          <span className="text-muted">Valet Fees</span>
                          <span className="font-mono" style={{ fontWeight: 600 }}>${data.revenueBreakdown.valetFees.toFixed(2)}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ 
                            width: data.summary.totalRevenue > 0 ? `${(data.revenueBreakdown.valetFees / data.summary.totalRevenue) * 100}%` : '0%',
                            height: '100%',
                            background: 'var(--color-primary)',
                          }} />
                        </div>
                      </div>

                      <div className="mb-lg">
                        <div className="flex justify-between mb-sm">
                          <span className="text-muted">Tips</span>
                          <span className="font-mono" style={{ fontWeight: 600 }}>${data.revenueBreakdown.tips.toFixed(2)}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ 
                            width: data.summary.totalRevenue > 0 ? `${(data.revenueBreakdown.tips / data.summary.totalRevenue) * 100}%` : '0%',
                            height: '100%',
                            background: 'var(--color-accent)',
                          }} />
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                        <div className="text-muted mb-sm" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Payment Methods</div>
                        <div className="flex justify-between mb-xs">
                          <span style={{ fontSize: '0.875rem' }}>💵 Cash</span>
                          <span className="font-mono">${data.revenueBreakdown.cash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ fontSize: '0.875rem' }}>💳 Card</span>
                          <span className="font-mono">${data.revenueBreakdown.card.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Leaderboard */}
            <div className="card mt-lg">
              <div className="card-header">
                <h2>
                  <Award size={16} style={{ marginRight: 8, color: 'var(--color-accent)' }} />
                  Driver Leaderboard
                </h2>
              </div>
              <div className="card-body flush">
                {!hasDriverData ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Users size={24} />
                    </div>
                    <h3>No Driver Data</h3>
                    <p>Driver performance will appear once drivers complete retrievals.</p>
                  </div>
                ) : (
                  data.driverLeaderboard.map((driver, index) => (
                    <div key={driver.id} className="leaderboard-item">
                      <div className={`leaderboard-rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>
                        {index + 1}
                      </div>
                      <div className="leaderboard-info">
                        <div className="leaderboard-name">{driver.name || driver.fullName || driver.username}</div>
                        <div className="leaderboard-meta">
                          ${driver.tips || 0} tips
                        </div>
                      </div>
                      <div className="leaderboard-value">
                        {driver.retrievals || 0}
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 4 }}>
                          retrievals
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
