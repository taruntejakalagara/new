import { useState, useEffect } from 'react';
import { 
  Activity, Car, Clock, CheckCircle, XCircle, 
  RefreshCw, Pause, Play, Filter, Zap
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS } from '../config/api';

const styles = {
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    margin: '4px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  btnWarning: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#fbbf24',
  },
  btnSuccess: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
  },
  btnGhost: {
    background: 'transparent',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    color: '#94a3b8',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '12px 16px',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: 'white',
  },
  statLabel: {
    color: '#64748b',
    fontSize: '12px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  filterBtn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  filterBtnActive: {
    background: '#6366f1',
    color: 'white',
  },
  filterBtnInactive: {
    background: 'rgba(30, 41, 59, 0.8)',
    color: '#94a3b8',
  },
  feedCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    overflow: 'hidden',
  },
  feedContainer: {
    maxHeight: 'calc(100vh - 380px)',
    overflowY: 'auto',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
    transition: 'background 0.2s',
  },
  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: '500',
  },
  activityMessage: {
    color: 'white',
    fontSize: '14px',
    margin: '0 0 4px 0',
  },
  activityDetails: {
    color: '#64748b',
    fontSize: '12px',
    margin: 0,
  },
  activityMeta: {
    textAlign: 'right',
    flexShrink: 0,
  },
  activityTime: {
    color: '#64748b',
    fontSize: '12px',
  },
  activityDriver: {
    color: '#94a3b8',
    fontSize: '12px',
    marginTop: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
  },
};

function formatTimeEST(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    timeZone: 'America/New_York',
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

function ActivityItem({ activity, isNew }) {
  const configs = {
    checkin: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', Icon: Car, label: 'Check In' },
    pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', Icon: Clock, label: 'Pending' },
    request: { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', Icon: Clock, label: 'Request' },
    assigned: { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', Icon: Car, label: 'Assigned' },
    ready: { bg: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', Icon: CheckCircle, label: 'Ready' },
    completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', Icon: CheckCircle, label: 'Complete' },
    complete: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', Icon: CheckCircle, label: 'Complete' },
    cancelled: { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', Icon: XCircle, label: 'Cancelled' },
  };

  const config = configs[activity.type] || configs.checkin;
  const Icon = config.Icon;

  return (
    <div style={{ 
      ...styles.activityItem, 
      background: isNew ? 'rgba(30, 41, 59, 0.8)' : 'transparent',
      animation: isNew ? 'slideIn 0.3s ease-out' : 'none'
    }}>
      <div style={{ ...styles.activityIcon, background: config.bg }}>
        <Icon size={20} color={config.color} />
      </div>
      
      <div style={styles.activityContent}>
        <div style={styles.activityBadges}>
          <span style={{ ...styles.badge, background: config.bg, color: config.color }}>
            {config.label}
          </span>
          {activity.isPriority && (
            <span style={{ ...styles.badge, background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>
              ⚡ PRIORITY
            </span>
          )}
          <span style={{ color: '#64748b', fontSize: '12px' }}>{activity.venue}</span>
        </div>
        <p style={styles.activityMessage}>{activity.message}</p>
        {activity.details && (
          <p style={styles.activityDetails}>{activity.details}</p>
        )}
      </div>
      
      <div style={styles.activityMeta}>
        <p style={styles.activityTime}>{activity.time}</p>
        {activity.driver && (
          <p style={styles.activityDriver}>Driver: {activity.driver}</p>
        )}
      </div>
    </div>
  );
}

function StatsBar({ stats }) {
  return (
    <div style={styles.statsGrid}>
      <div style={styles.statCard}>
        <div style={{ ...styles.statIcon, background: 'rgba(16, 185, 129, 0.2)' }}>
          <Car size={18} color="#34d399" />
        </div>
        <div>
          <p style={styles.statValue}>{stats.parked}</p>
          <span style={styles.statLabel}>Vehicles Parked</span>
        </div>
      </div>
      <div style={styles.statCard}>
        <div style={{ ...styles.statIcon, background: 'rgba(59, 130, 246, 0.2)' }}>
          <Car size={18} color="#60a5fa" />
        </div>
        <div>
          <p style={styles.statValue}>{stats.checkIns}</p>
          <span style={styles.statLabel}>Check-ins today</span>
        </div>
      </div>
      <div style={styles.statCard}>
        <div style={{ ...styles.statIcon, background: 'rgba(245, 158, 11, 0.2)' }}>
          <Clock size={18} color="#fbbf24" />
        </div>
        <div>
          <p style={styles.statValue}>{stats.pending}</p>
          <span style={styles.statLabel}>Pending requests</span>
        </div>
      </div>
      <div style={styles.statCard}>
        <div style={{ ...styles.statIcon, background: 'rgba(99, 102, 241, 0.2)' }}>
          <Activity size={18} color="#818cf8" />
        </div>
        <div>
          <p style={styles.statValue}>{stats.avgWait || 'N/A'}</p>
          <span style={styles.statLabel}>Avg wait (min)</span>
        </div>
      </div>
    </div>
  );
}

export default function LiveFeedPage() {
  const [activities, setActivities] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ parked: 0, checkIns: 0, pending: 0, avgWait: 0 });

  const fetchActivity = async () => {
    if (isPaused) return;
    
    try {
      const statsRes = await fetch(`${API_BASE_URL}/stats`);
      const statsData = await statsRes.json();
      
      const vehiclesRes = await fetch(`${API_BASE_URL}/vehicles`);
      const vehiclesData = await vehiclesRes.json();
      const vehicles = vehiclesData.vehicles || [];
      
      const queueRes = await fetch(`${API_BASE_URL}/queue`);
      const queueData = await queueRes.json();
      const requests = queueData.requests || [];
      
      setStats({
        parked: statsData.parked || 0,
        checkIns: statsData.today?.checkins || 0,
        pending: statsData.today?.pending || requests.filter(r => r.status === 'pending').length,
        avgWait: statsData.today?.avgWaitMinutes || null,
      });
      
      const newActivities = [];
      
      vehicles.forEach(v => {
        newActivities.push({
          id: `v-${v.id}`,
          type: 'checkin',
          message: `${v.license_plate || 'Vehicle'} (${v.make} ${v.model})`,
          details: `Hook #${v.hook_number} • Seq #${v.sequence_number}`,
          venue: 'Fairmont Pittsburgh',
          time: formatTimeEST(v.check_in_time),
          timestamp: new Date(v.check_in_time).getTime(),
        });
      });
      
      requests.forEach(r => {
        newActivities.push({
          id: `r-${r.id}`,
          type: r.status,
          isPriority: r.is_priority === 1,
          message: `${r.license_plate || 'Vehicle'} - ${r.status.toUpperCase()}`,
          details: `Hook #${r.hook_number} • $${r.amount || 0} ${r.payment_method === 'pay_at_counter' ? '(Pay at counter)' : ''}`,
          venue: 'Fairmont Pittsburgh',
          time: formatTimeEST(r.requested_at),
          timestamp: new Date(r.requested_at).getTime(),
          driver: r.driver_name,
        });
      });
      
      newActivities.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(newActivities.slice(0, 50));
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, REFRESH_INTERVALS.LIVE_FEED);
    return () => clearInterval(interval);
  }, [isPaused]);

  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'checkin') return a.type === 'checkin';
    if (filter === 'request') return ['pending', 'assigned', 'ready'].includes(a.type);
    if (filter === 'complete') return ['completed', 'complete'].includes(a.type);
    return a.type === filter;
  });

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'checkin', label: 'Check-ins' },
    { key: 'request', label: 'Requests' },
    { key: 'complete', label: 'Completed' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>Live Activity Feed</h1>
            <div style={{ 
              ...styles.liveIndicator, 
              color: isPaused ? '#fbbf24' : '#34d399' 
            }}>
              <div style={{ 
                ...styles.liveDot, 
                background: isPaused ? '#fbbf24' : '#34d399' 
              }} />
              {isPaused ? 'Paused' : 'Live'}
            </div>
          </div>
          <p style={styles.subtitle}>Real-time activity • EST timezone</p>
        </div>
        <div style={styles.headerRight}>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            style={{ 
              ...styles.btn, 
              ...(isPaused ? styles.btnSuccess : styles.btnWarning) 
            }}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={fetchActivity} style={{ ...styles.btn, ...styles.btnGhost }}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <div style={styles.filterRow}>
        <Filter size={16} color="#64748b" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{ 
              ...styles.filterBtn, 
              ...(filter === f.key ? styles.filterBtnActive : styles.filterBtnInactive) 
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <div style={styles.feedCard}>
        <div style={styles.feedContainer}>
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                isNew={index === 0 && !isPaused}
              />
            ))
          ) : (
            <div style={styles.emptyState}>
              <Activity size={48} color="#475569" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: 'white', fontWeight: '500', marginBottom: '8px' }}>No activity</h3>
              <p style={{ color: '#64748b' }}>Activity will appear here in real-time</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
