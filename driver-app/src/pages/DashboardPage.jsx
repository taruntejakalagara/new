import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, Users, Clock, TrendingUp, DollarSign,
  ChevronRight, RefreshCw, AlertCircle, Bell,
  CloudRain, Volume2, VolumeX, Star, Zap
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS, ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { shiftConfig } = useAuth();
  const audioRef = useRef(null);
  
  const [stats, setStats] = useState({
    parkedVehicles: 0,
    activeDrivers: 0,
    pendingRequests: 0,
    completedToday: 0,
    revenue: 0,
    avgWaitTime: 0,
    hooksAvailable: 0,
    hooksTotal: 50,
  });
  const [alerts, setAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastQueueCount, setLastQueueCount] = useState(0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVALS.STATS);
    return () => clearInterval(interval);
  }, []);

  // Play sound for new requests
  useEffect(() => {
    if (soundEnabled && stats.pendingRequests > lastQueueCount && lastQueueCount > 0) {
      playNotificationSound();
    }
    setLastQueueCount(stats.pendingRequests);
  }, [stats.pendingRequests]);

  const playNotificationSound = () => {
    // Create a simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, queueRes, driversRes, hooksRes] = await Promise.all([
        fetch(`${API_BASE_URL}${ENDPOINTS.STATS}`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}${ENDPOINTS.QUEUE}`).then(r => r.json()).catch(() => ({ requests: [] })),
        fetch(`${API_BASE_URL}${ENDPOINTS.DRIVERS}`).then(r => r.json()).catch(() => ({ drivers: [] })),
        fetch(`${API_BASE_URL}${ENDPOINTS.HOOKS_STATS}`).then(r => r.json()).catch(() => ({ stats: {} })),
      ]);

      const activeDrivers = driversRes.drivers?.filter(d => d.status === 'online' || d.status === 'busy').length || 0;
      const pendingRequests = queueRes.requests?.filter(r => r.status === 'pending').length || 0;

      setStats({
        parkedVehicles: statsRes.parked || hooksRes.stats?.occupied || 0,
        activeDrivers,
        pendingRequests,
        completedToday: statsRes.completedToday || 0,
        revenue: statsRes.revenue || 0,
        avgWaitTime: statsRes.averageWaitTime || 0,
        hooksAvailable: hooksRes.stats?.available || 50,
        hooksTotal: hooksRes.stats?.total || 50,
      });

      // Generate alerts
      const newAlerts = [];
      if (pendingRequests > 3) {
        newAlerts.push({ type: 'error', message: `${pendingRequests} requests waiting - assign drivers!` });
      }
      if (activeDrivers === 0 && pendingRequests > 0) {
        newAlerts.push({ type: 'error', message: 'No active drivers - requests are waiting' });
      }
      if (hooksRes.stats?.available < 5) {
        newAlerts.push({ type: 'warning', message: `Only ${hooksRes.stats?.available} hooks available` });
      }
      
      // Check for long wait times
      const longWait = queueRes.requests?.find(r => {
        const waitMins = Math.floor((Date.now() - new Date(r.requested_at).getTime()) / 60000);
        return waitMins > 5 && r.status === 'pending';
      });
      if (longWait) {
        newAlerts.push({ type: 'warning', message: 'Customer waiting over 5 minutes!' });
      }

      setAlerts(newAlerts);

      // Recent activity
      const recent = queueRes.requests?.slice(0, 6).map(r => ({
        id: r.id,
        type: r.status,
        vehicle: `${r.make || ''} ${r.model || ''}`.trim() || 'Unknown',
        plate: r.license_plate,
        time: r.requested_at || r.created_at,
        isVip: r.is_vip,
        isPriority: r.is_priority,
      })) || [];

      setRecentActivity(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const StatCard = ({ label, value, icon: Icon, subtitle, accent }) => (
    <div className={`stat-card ${accent ? 'accent' : ''}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-change">{subtitle}</div>}
    </div>
  );

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
          <h1>Dashboard</h1>
          <p>Real-time valet operations</p>
        </div>
        <div className="page-header-actions">
          <button 
            className={`btn btn-icon ${soundEnabled ? 'btn-accent' : 'btn-ghost'}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Sound alerts on' : 'Sound alerts off'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="btn btn-ghost" onClick={fetchData}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-lg">
            {alerts.map((alert, i) => (
              <div key={i} className={`alert alert-${alert.type} mb-sm`}>
                <AlertCircle className="alert-icon" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid mb-lg">
          <StatCard
            label="Parked Vehicles"
            value={stats.parkedVehicles}
            icon={Car}
            subtitle={`${stats.hooksAvailable} hooks free`}
            accent
          />
          <StatCard
            label="Active Drivers"
            value={stats.activeDrivers}
            icon={Users}
          />
          <StatCard
            label="Pending Requests"
            value={stats.pendingRequests}
            icon={Clock}
          />
          <StatCard
            label="Today's Revenue"
            value={`$${stats.revenue.toFixed(0)}`}
            icon={DollarSign}
            subtitle={`${stats.completedToday} retrievals`}
          />
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          {/* Queue Preview */}
          <div className="card">
            <div className="card-header">
              <h2>Active Queue</h2>
              <Link to="/queue" className="btn btn-ghost btn-sm">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="card-body flush">
              {recentActivity.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Clock size={24} />
                  </div>
                  <h3>No Active Requests</h3>
                  <p>Retrieval requests will appear here</p>
                </div>
              ) : (
                <div>
                  {recentActivity.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-md) var(--space-lg)',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: item.type === 'pending' 
                            ? 'var(--color-warning)' 
                            : item.type === 'assigned'
                              ? 'var(--color-info)'
                              : 'var(--color-success)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {item.vehicle}
                          {item.isVip && (
                            <Star size={12} style={{ marginLeft: '0.5rem', color: 'var(--color-accent)' }} />
                          )}
                          {item.isPriority && (
                            <Zap size={12} style={{ marginLeft: '0.25rem', color: 'var(--color-error)' }} />
                          )}
                        </div>
                        <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>
                          {item.plate}
                        </div>
                      </div>
                      <div>
                        <span className={`badge badge-${
                          item.type === 'pending' ? 'warning' : 
                          item.type === 'assigned' ? 'info' : 'success'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {formatTime(item.time)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Stats */}
          <div className="flex flex-col gap-md">
            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <h2>Quick Actions</h2>
              </div>
              <div className="card-body">
                <div className="flex flex-col gap-sm">
                  <Link to="/queue" className="btn btn-accent btn-lg" style={{ justifyContent: 'flex-start' }}>
                    <ClipboardList size={20} />
                    Manage Queue
                    {stats.pendingRequests > 0 && (
                      <span className="badge badge-error" style={{ marginLeft: 'auto' }}>
                        {stats.pendingRequests}
                      </span>
                    )}
                  </Link>
                  <Link to="/hooks" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                    <Grid3X3 size={20} />
                    Hook Board
                  </Link>
                  <Link to="/drivers" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                    <Users size={20} />
                    Manage Drivers
                  </Link>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="card">
              <div className="card-header">
                <h2>Today's Performance</h2>
              </div>
              <div className="card-body compact">
                <div className="flex flex-col gap-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Avg Wait Time</span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {stats.avgWaitTime > 0 ? `${stats.avgWaitTime} min` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Retrievals</span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {stats.completedToday}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Revenue</span>
                    <span className="font-mono text-success" style={{ fontWeight: 600 }}>
                      ${stats.revenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Hook Utilization</span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {Math.round((stats.parkedVehicles / stats.hooksTotal) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Missing import
import { Grid3X3, ClipboardList } from 'lucide-react';
