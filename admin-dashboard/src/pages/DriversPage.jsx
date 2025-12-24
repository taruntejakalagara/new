import { useState, useEffect } from 'react';
import { 
  Users, Search, Phone, Mail, Clock,
  CheckCircle, XCircle, Car, Star, RefreshCw
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

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
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  searchContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '8px',
    padding: '8px 12px',
    border: '1px solid rgba(51, 65, 85, 0.5)',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e2e8f0',
    fontSize: '14px',
  },
  select: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: '14px',
  },
  driversGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  driverCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    transition: 'all 0.2s',
  },
  driverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  driverInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#6366f1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '500',
    fontSize: '14px',
  },
  driverName: {
    color: 'white',
    fontWeight: '500',
    margin: 0,
  },
  driverUsername: {
    color: '#64748b',
    fontSize: '12px',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '500',
  },
  driverDetails: {
    marginBottom: '12px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '8px',
  },
  driverFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid rgba(51, 65, 85, 0.5)',
  },
  driverStats: {
    display: 'flex',
    gap: '16px',
  },
  driverStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
  },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '2px solid rgba(99, 102, 241, 0.3)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
  emptyState: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
    border: '1px solid rgba(51, 65, 85, 0.5)',
  },
};

function formatTimeEST(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function DriverCard({ driver }) {
  const statusColors = {
    online: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
    active: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
    available: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
    busy: { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
    offline: { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171' },
    break: { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
  };

  const statusLabels = {
    online: 'Online',
    active: 'Active',
    available: 'Available',
    busy: 'Busy',
    offline: 'Offline',
    break: 'On Break',
  };

  const statusStyle = statusColors[driver.status] || statusColors.offline;

  return (
    <div style={styles.driverCard}>
      <div style={styles.driverHeader}>
        <div style={styles.driverInfo}>
          <div style={styles.avatar}>
            {(driver.full_name || driver.fullName || driver.username || 'DR').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={styles.driverName}>{driver.full_name || driver.fullName || driver.username}</p>
            <span style={styles.driverUsername}>@{driver.username}</span>
          </div>
        </div>
        <span style={{ ...styles.badge, background: statusStyle.bg, color: statusStyle.color }}>
          {statusLabels[driver.status] || driver.status || 'Unknown'}
        </span>
      </div>

      <div style={styles.driverDetails}>
        {driver.phone && (
          <div style={styles.detailRow}>
            <Phone size={14} />
            <span>{driver.phone}</span>
          </div>
        )}
        {driver.email && (
          <div style={styles.detailRow}>
            <Mail size={14} />
            <span>{driver.email}</span>
          </div>
        )}
        <div style={styles.detailRow}>
          <Clock size={14} />
          <span>Last login: {formatTimeEST(driver.lastLogin)}</span>
        </div>
        {driver.current_task && (
          <div style={{ ...styles.detailRow, color: '#fbbf24' }}>
            <Car size={14} />
            <span>{driver.current_task}</span>
          </div>
        )}
      </div>

      <div style={styles.driverFooter}>
        <div style={styles.driverStats}>
          <div style={{ ...styles.driverStat, color: '#94a3b8' }}>
            <Car size={14} />
            <span>{driver.totalRetrievals || 0}</span>
          </div>
          <div style={{ ...styles.driverStat, color: '#fbbf24' }}>
            <Star size={14} />
            <span>{driver.rating || '5.0'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/drivers`);
      const data = await response.json();
      if (data.success && data.drivers) {
        setDrivers(data.drivers);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = 
      (d.full_name || d.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.phone || '').includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: drivers.length,
    online: drivers.filter(d => d.status === 'online' || d.status === 'active' || d.status === 'available').length,
    busy: drivers.filter(d => d.status === 'busy').length,
    offline: drivers.filter(d => d.status === 'offline').length,
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Drivers</h1>
          <p style={styles.subtitle}>Manage valet drivers • EST timezone</p>
        </div>
        <div style={styles.headerRight}>
          {lastUpdate && (
            <span style={{ color: '#64748b', fontSize: '12px' }}>
              Updated {formatTimeEST(lastUpdate)}
            </span>
          )}
          <button style={styles.refreshBtn} onClick={fetchDrivers}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div>
            <p style={styles.statLabel}>Total Drivers</p>
            <p style={{ ...styles.statValue, color: 'white' }}>{stats.total}</p>
          </div>
          <Users size={24} color="#475569" />
        </div>
        <div style={styles.statCard}>
          <div>
            <p style={styles.statLabel}>Online</p>
            <p style={{ ...styles.statValue, color: '#34d399' }}>{stats.online}</p>
          </div>
          <CheckCircle size={24} color="#059669" />
        </div>
        <div style={styles.statCard}>
          <div>
            <p style={styles.statLabel}>Busy</p>
            <p style={{ ...styles.statValue, color: '#fbbf24' }}>{stats.busy}</p>
          </div>
          <Car size={24} color="#d97706" />
        </div>
        <div style={styles.statCard}>
          <div>
            <p style={styles.statLabel}>Offline</p>
            <p style={{ ...styles.statValue, color: '#f87171' }}>{stats.offline}</p>
          </div>
          <XCircle size={24} color="#dc2626" />
        </div>
      </div>

      {/* Search & Filters */}
      <div style={styles.searchContainer}>
        <div style={styles.searchBox}>
          <Search size={18} color="#64748b" />
          <input 
            type="text"
            placeholder="Search drivers by name, username, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="active">Active</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Drivers Grid */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p style={{ color: '#64748b' }}>Loading drivers...</p>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div style={styles.driversGrid}>
          {filteredDrivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} />
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <Users size={48} color="#475569" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'white', fontWeight: '500', marginBottom: '8px' }}>No drivers found</h3>
          <p style={{ color: '#64748b' }}>Try adjusting your search or filters</p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
