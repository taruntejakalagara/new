import { useState, useEffect } from 'react';
import { 
  Activity, Database, Wifi, Server, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, Clock,
  HardDrive, Cpu, Users, Zap
} from 'lucide-react';
import { API_BASE_URL, getCurrentEST } from '../config/api';

export default function SystemHealthPage() {
  const [health, setHealth] = useState({
    api: { status: 'checking', latency: 0 },
    database: { status: 'checking', tables: 0, size: '0 KB' },
    websocket: { status: 'checking', connections: 0 },
  });
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeDrivers: 0,
    todayCheckIns: 0,
    pendingRequests: 0
  });
  const [tables, setTables] = useState([]);
  const [currentTime, setCurrentTime] = useState(getCurrentEST());
  const [lastCheck, setLastCheck] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    checkHealth();
    const timeInterval = setInterval(() => setCurrentTime(getCurrentEST()), 1000);
    
    let healthInterval;
    if (autoRefresh) {
      healthInterval = setInterval(checkHealth, 5000);
    }
    
    return () => {
      clearInterval(timeInterval);
      if (healthInterval) clearInterval(healthInterval);
    };
  }, [autoRefresh]);

  const checkHealth = async () => {
    const startTime = Date.now();
    
    // Check API Health
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const latency = Date.now() - startTime;
      const data = await response.json();
      
      setHealth(prev => ({
        ...prev,
        api: { 
          status: response.ok ? 'healthy' : 'degraded', 
          latency,
          uptime: data.uptime
        }
      }));
    } catch (error) {
      setHealth(prev => ({
        ...prev,
        api: { status: 'down', latency: 0, error: error.message }
      }));
    }

    // Check Database & Get Stats
    try {
      const response = await fetch(`${API_BASE_URL}/system/info`);
      const data = await response.json();
      
      if (data.success) {
        setHealth(prev => ({
          ...prev,
          database: { 
            status: 'healthy', 
            tables: data.tables?.length || 0,
            size: data.dbSize || 'Unknown'
          }
        }));
        setTables(data.tables || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      setHealth(prev => ({
        ...prev,
        database: { status: 'error', error: error.message }
      }));
    }

    // Check WebSocket (simulated - would need actual WS endpoint)
    try {
      const response = await fetch(`${API_BASE_URL}/system/websocket`);
      const data = await response.json();
      setHealth(prev => ({
        ...prev,
        websocket: { 
          status: data.success ? 'healthy' : 'degraded',
          connections: data.connections || 0
        }
      }));
    } catch {
      setHealth(prev => ({
        ...prev,
        websocket: { status: 'unknown', connections: 0 }
      }));
    }

    setLastCheck(new Date());
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={20} className="text-green" />;
      case 'degraded': return <AlertTriangle size={20} className="text-yellow" />;
      case 'down': case 'error': return <XCircle size={20} className="text-red" />;
      default: return <RefreshCw size={20} className="spin" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'degraded': return '#f59e0b';
      case 'down': case 'error': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="system-health-page">
      <header className="page-header">
        <div>
          <h1>System Health</h1>
          <p className="current-time"><Clock size={14} />{currentTime}</p>
        </div>
        <div className="header-actions">
          <label className="auto-refresh">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
            />
            Auto-refresh (5s)
          </label>
          <button className="refresh-btn" onClick={checkHealth}>
            <RefreshCw size={18} />
            Check Now
          </button>
        </div>
      </header>

      {lastCheck && (
        <p className="last-check">Last checked: {lastCheck.toLocaleTimeString()}</p>
      )}

      {/* Health Status Cards */}
      <div className="health-grid">
        {/* API Status */}
        <div className="health-card">
          <div className="health-header">
            <Server size={24} />
            <h3>API Server</h3>
            {getStatusIcon(health.api.status)}
          </div>
          <div className="health-details">
            <div className="health-stat">
              <span>Status</span>
              <strong style={{ color: getStatusColor(health.api.status) }}>
                {health.api.status.toUpperCase()}
              </strong>
            </div>
            <div className="health-stat">
              <span>Latency</span>
              <strong>{health.api.latency}ms</strong>
            </div>
            <div className="health-stat">
              <span>Endpoint</span>
              <code>{API_BASE_URL}</code>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="health-card">
          <div className="health-header">
            <Database size={24} />
            <h3>Database</h3>
            {getStatusIcon(health.database.status)}
          </div>
          <div className="health-details">
            <div className="health-stat">
              <span>Status</span>
              <strong style={{ color: getStatusColor(health.database.status) }}>
                {health.database.status.toUpperCase()}
              </strong>
            </div>
            <div className="health-stat">
              <span>Tables</span>
              <strong>{health.database.tables}</strong>
            </div>
            <div className="health-stat">
              <span>Size</span>
              <strong>{health.database.size}</strong>
            </div>
          </div>
        </div>

        {/* WebSocket Status */}
        <div className="health-card">
          <div className="health-header">
            <Wifi size={24} />
            <h3>WebSocket</h3>
            {getStatusIcon(health.websocket.status)}
          </div>
          <div className="health-details">
            <div className="health-stat">
              <span>Status</span>
              <strong style={{ color: getStatusColor(health.websocket.status) }}>
                {health.websocket.status.toUpperCase()}
              </strong>
            </div>
            <div className="health-stat">
              <span>Connections</span>
              <strong>{health.websocket.connections}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-section">
        <h2>Current System Stats</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <Zap size={20} />
            <div>
              <span className="stat-value">{stats.todayCheckIns || 0}</span>
              <span className="stat-label">Today's Check-ins</span>
            </div>
          </div>
          <div className="stat-box">
            <HardDrive size={20} />
            <div>
              <span className="stat-value">{stats.totalVehicles || 0}</span>
              <span className="stat-label">Vehicles Parked</span>
            </div>
          </div>
          <div className="stat-box">
            <Users size={20} />
            <div>
              <span className="stat-value">{stats.activeDrivers || 0}</span>
              <span className="stat-label">Active Drivers</span>
            </div>
          </div>
          <div className="stat-box">
            <Activity size={20} />
            <div>
              <span className="stat-value">{stats.pendingRequests || 0}</span>
              <span className="stat-label">Pending Requests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Tables */}
      <div className="tables-section">
        <h2>Database Tables</h2>
        <div className="tables-grid">
          {tables.length > 0 ? tables.map((table, i) => (
            <div key={i} className="table-card">
              <Database size={16} />
              <span className="table-name">{table.name}</span>
              <span className="table-count">{table.count} rows</span>
            </div>
          )) : (
            <p className="no-data">Loading tables...</p>
          )}
        </div>
      </div>

      <style>{`
        .system-health-page { padding: 2rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .current-time { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; }
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        .auto-refresh { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #64748b; cursor: pointer; }
        .auto-refresh input { cursor: pointer; }
        .refresh-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
        .last-check { font-size: 0.8125rem; color: #94a3b8; margin-bottom: 1.5rem; }
        
        .health-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .health-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; }
        .health-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9; }
        .health-header h3 { flex: 1; font-size: 1rem; font-weight: 600; color: #1e293b; }
        .health-header svg:first-child { color: #3b82f6; }
        .health-details { display: flex; flex-direction: column; gap: 0.75rem; }
        .health-stat { display: flex; justify-content: space-between; font-size: 0.875rem; }
        .health-stat span { color: #64748b; }
        .health-stat strong { color: #1e293b; }
        .health-stat code { font-size: 0.75rem; background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 4px; }
        
        .text-green { color: #22c55e; }
        .text-yellow { color: #f59e0b; }
        .text-red { color: #ef4444; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .stats-section, .tables-section { margin-bottom: 2rem; }
        .stats-section h2, .tables-section h2 { font-size: 1rem; font-weight: 600; color: #1e293b; margin-bottom: 1rem; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .stat-box { display: flex; align-items: center; gap: 1rem; background: white; padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid #e2e8f0; }
        .stat-box svg { color: #3b82f6; }
        .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 0.8125rem; color: #64748b; }
        
        .tables-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
        .table-card { display: flex; align-items: center; gap: 0.5rem; background: white; padding: 0.625rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.875rem; }
        .table-card svg { color: #64748b; }
        .table-name { font-weight: 500; color: #1e293b; }
        .table-count { color: #64748b; font-size: 0.75rem; background: #f1f5f9; padding: 0.125rem 0.5rem; border-radius: 4px; }
        .no-data { color: #94a3b8; font-size: 0.875rem; }

        @media (max-width: 1024px) {
          .health-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
