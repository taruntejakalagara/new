import { useState, useEffect, useCallback } from 'react';
import { 
  Car, Users, Clock, CheckCircle, Activity,
  Building2, RefreshCw, Wifi, WifiOff, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, REFRESH_INTERVALS } from '../config/api';

function formatTimeEST(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000 / 60);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return date.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

function VenueCard({ venue, isOnline, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: '#1e293b',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #334155',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#6366f1';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#334155';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Building2 size={24} color="#94a3b8" />
          </div>
          <div>
            <h3 style={{ color: 'white', fontWeight: '600', margin: '0 0 4px 0', fontSize: '16px' }}>
              {venue.name}
            </h3>
            <span style={{ color: '#64748b', fontSize: '13px' }}>{venue.shortName || venue.slug}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%',
            background: isOnline ? '#10b981' : '#ef4444',
            boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444'
          }} />
          <ChevronRight size={20} color="#64748b" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '12px 8px', 
          background: '#0f172a', 
          borderRadius: '10px' 
        }}>
          <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'white' }}>
            {venue.parked || 0}
          </p>
          <span style={{ color: '#64748b', fontSize: '12px' }}>Parked</span>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '12px 8px', 
          background: '#0f172a', 
          borderRadius: '10px' 
        }}>
          <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#fbbf24' }}>
            {venue.pending || 0}
          </p>
          <span style={{ color: '#64748b', fontSize: '12px' }}>Queue</span>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '12px 8px', 
          background: '#0f172a', 
          borderRadius: '10px' 
        }}>
          <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#34d399' }}>
            {venue.drivers || 0}
          </p>
          <span style={{ color: '#64748b', fontSize: '12px' }}>Drivers</span>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }) {
  const configs = {
    checkin: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', Icon: Car },
    pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', Icon: Clock },
    request: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', Icon: Clock },
    complete: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', Icon: CheckCircle },
  };
  const config = configs[activity.type] || configs.checkin;
  const Icon = config.Icon;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '10px',
      marginBottom: '6px',
      transition: 'background 0.2s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.3)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={18} color={config.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ 
          color: 'white', 
          fontSize: '14px', 
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{activity.message}</p>
        <span style={{ color: '#64748b', fontSize: '12px' }}>{activity.venue} • {activity.time}</span>
      </div>
    </div>
  );
}

function SystemHealth({ health }) {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid #334155',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '15px' }}>System Health</h3>
        <span style={{ 
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '500',
          background: health.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: health.status === 'healthy' ? '#34d399' : '#f87171'
        }}>
          {health.status === 'healthy' ? 'All Systems Go' : 'Issues Detected'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '14px' }}>
            <Wifi size={16} color="#64748b" />
            <span>API Server</span>
          </div>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%',
            background: health.api ? '#10b981' : '#ef4444',
            boxShadow: health.api ? '0 0 8px #10b981' : '0 0 8px #ef4444'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '14px' }}>
            <Activity size={16} color="#64748b" />
            <span>Database</span>
          </div>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%',
            background: health.database ? '#10b981' : '#ef4444',
            boxShadow: health.database ? '0 0 8px #10b981' : '0 0 8px #ef4444'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '14px' }}>
            <RefreshCw size={16} color="#64748b" />
            <span>Response Time</span>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{health.responseTime}ms</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [activities, setActivities] = useState([]);
  const [health, setHealth] = useState({ status: 'checking', api: false, database: false, responseTime: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const startTime = Date.now();
      
      // Fetch all data in parallel
      const [statsRes, driversRes, venuesRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/stats`),
        fetch(`${API_BASE_URL}/drivers`),
        fetch(`${API_BASE_URL}/venues`),
        fetch(`${API_BASE_URL}/queue`),
      ]);
      
      const [statsData, driversData, venuesData, queueData] = await Promise.all([
        statsRes.json(),
        driversRes.json(),
        venuesRes.json(),
        queueRes.json(),
      ]);
      
      const responseTime = Date.now() - startTime;
      
      // Calculate stats
      const parked = statsData.success ? (statsData.parked || 0) : 0;
      const pending = queueData.success ? (queueData.requests || []).filter(r => r.status === 'pending').length : 0;
      const onlineDrivers = (driversData.drivers || []).filter(
        d => d.status === 'online' || d.status === 'active' || d.status === 'available' || d.status === 'busy'
      ).length;
      
      // Build venues with stats
      let venueList = [];
      if (venuesData.success && venuesData.venues && venuesData.venues.length > 0) {
        venueList = venuesData.venues.map(v => ({
          ...v,
          parked: parked,
          pending: pending,
          drivers: onlineDrivers,
        }));
      } else {
        // Default venue if none exist
        venueList = [{
          id: 1,
          name: 'Fairmont Pittsburgh',
          slug: 'fairmont-pittsburgh',
          shortName: 'fairmont-pittsburgh',
          parked: parked,
          pending: pending,
          drivers: onlineDrivers,
        }];
      }
      
      setVenues(venueList);
      setHealth({ api: true, database: true, responseTime, status: 'healthy' });
      setIsConnected(true);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setHealth(prev => ({ ...prev, api: false, status: 'unhealthy' }));
      setIsConnected(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const [vehiclesRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/vehicles`),
        fetch(`${API_BASE_URL}/queue`),
      ]);
      
      const [vehiclesData, queueData] = await Promise.all([
        vehiclesRes.json(),
        queueRes.json(),
      ]);
      
      const newActivities = [];
      const vehicles = vehiclesData.vehicles || [];
      vehicles.slice(0, 5).forEach(v => {
        newActivities.push({
          id: `v-${v.id}`,
          type: 'checkin',
          message: `${v.license_plate || 'Vehicle'} → Hook #${v.hook_number}`,
          venue: 'Fairmont',
          time: formatTimeEST(v.check_in_time),
          timestamp: new Date(v.check_in_time).getTime(),
        });
      });
      
      const requests = queueData.requests || [];
      requests.forEach(r => {
        newActivities.push({
          id: `r-${r.id}`,
          type: r.status === 'pending' ? 'pending' : 'complete',
          message: `${r.is_priority ? '⚡ ' : ''}${r.license_plate || 'Retrieval'} - ${r.status}`,
          venue: 'Fairmont',
          time: formatTimeEST(r.requested_at),
          timestamp: new Date(r.requested_at).getTime(),
        });
      });
      
      newActivities.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(newActivities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchData();
    fetchActivity();
    
    // Set up intervals
    const dataInterval = setInterval(fetchData, REFRESH_INTERVALS.STATS);
    const activityInterval = setInterval(fetchActivity, REFRESH_INTERVALS.LIVE_FEED);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(activityInterval);
    };
  }, [fetchData, fetchActivity]);

  const handleRefresh = () => {
    fetchData();
    fetchActivity();
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: 'white', margin: '0 0 6px 0' }}>
            Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Venue overview • EST timezone
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '14px',
            color: isConnected ? '#34d399' : '#f87171' 
          }}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            Updated {formatTimeEST(lastUpdate)}
          </span>
          <button 
            onClick={handleRefresh}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Venues */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: 0 }}>Venues</h2>
            <span style={{ color: '#64748b', fontSize: '13px' }}>{venues.length} venue(s)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {venues.map((venue, index) => (
              <VenueCard
                key={venue.id || index}
                venue={venue}
                isOnline={isConnected}
                onClick={() => navigate(`/venues/${venue.id || 1}`)}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* System Health */}
          <SystemHealth health={health} />

          {/* Live Activity */}
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '15px' }}>Live Activity</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px' }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  animation: 'pulse 2s infinite',
                }} />
                Live
              </div>
            </div>
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
