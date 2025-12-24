import { useState, useEffect } from 'react';
import { 
  AlertTriangle, XCircle, AlertCircle, Info, RefreshCw, 
  Clock, Filter, Download, Trash2, Search, ChevronDown,
  ChevronRight, Copy, CheckCircle
} from 'lucide-react';
import { API_BASE_URL, toEST, getCurrentEST } from '../config/api';

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);
  const [currentTime, setCurrentTime] = useState(getCurrentEST());
  const [copiedId, setCopiedId] = useState(null);

  const severityLevels = [
    { key: 'all', label: 'All Logs', color: '#64748b' },
    { key: 'error', label: 'Errors', color: '#ef4444', icon: XCircle },
    { key: 'warning', label: 'Warnings', color: '#f59e0b', icon: AlertTriangle },
    { key: 'info', label: 'Info', color: '#3b82f6', icon: Info },
  ];

  useEffect(() => {
    fetchLogs();
    const timeInterval = setInterval(() => setCurrentTime(getCurrentEST()), 1000);
    const logInterval = setInterval(fetchLogs, 10000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(logInterval);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filter, searchQuery]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/system/logs`);
      const data = await response.json();
      
      if (data.success && data.logs) {
        setLogs(data.logs);
      } else {
        generateDemoLogs();
      }
    } catch (error) {
      generateDemoLogs();
    } finally {
      setLoading(false);
    }
  };

  const generateDemoLogs = () => {
    const demoLogs = [
      {
        id: 1,
        level: 'error',
        message: 'Payment processing failed',
        details: 'Card declined: Insufficient funds',
        source: 'PaymentService',
        endpoint: 'POST /api/payments/charge',
        venue: 'Fairmont Pittsburgh',
        ticket: 'A-045',
        stack: 'Error: Card declined\n    at PaymentService.charge (/src/services/payment.js:45)\n    at async /src/routes/api.js:234',
        timestamp: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: 2,
        level: 'error',
        message: 'Database connection timeout',
        details: 'Query exceeded 30s timeout limit',
        source: 'Database',
        endpoint: 'GET /api/vehicles',
        stack: 'SqliteError: SQLITE_BUSY\n    at Database.prepare (/node_modules/better-sqlite3/lib/methods/wrappers.js:5)',
        timestamp: new Date(Date.now() - 180000).toISOString()
      },
      {
        id: 3,
        level: 'warning',
        message: 'High memory usage detected',
        details: 'Memory usage at 85% (1.7GB / 2GB)',
        source: 'System',
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 4,
        level: 'warning',
        message: 'Slow API response',
        details: 'Response time: 2.5s (threshold: 1s)',
        source: 'API',
        endpoint: 'GET /api/analytics',
        timestamp: new Date(Date.now() - 450000).toISOString()
      },
      {
        id: 5,
        level: 'error',
        message: 'WebSocket connection lost',
        details: 'Station iPad disconnected unexpectedly',
        source: 'WebSocket',
        venue: 'Omni William Penn',
        timestamp: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: 6,
        level: 'info',
        message: 'Server started successfully',
        details: 'Listening on port 4000',
        source: 'Server',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 7,
        level: 'info',
        message: 'Database migration completed',
        details: 'Added managers.password column',
        source: 'Database',
        timestamp: new Date(Date.now() - 3700000).toISOString()
      },
      {
        id: 8,
        level: 'error',
        message: 'Invalid ticket number format',
        details: 'Received: "null", Expected: "X-###"',
        source: 'Validation',
        endpoint: 'POST /api/retrieval',
        venue: 'Westin Convention',
        timestamp: new Date(Date.now() - 900000).toISOString()
      },
    ];
    
    setLogs(demoLogs);
  };

  const applyFilters = () => {
    let result = [...logs];
    
    if (filter !== 'all') {
      result = result.filter(log => log.level === filter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query) ||
        log.source?.toLowerCase().includes(query) ||
        log.endpoint?.toLowerCase().includes(query)
      );
    }
    
    setFilteredLogs(result);
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const copyToClipboard = (log) => {
    const text = `${log.level.toUpperCase()}: ${log.message}\n${log.details || ''}\n${log.stack || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityIcon = (level) => {
    switch (level) {
      case 'error': return <XCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'info': return <Info size={18} />;
      default: return <AlertCircle size={18} />;
    }
  };

  const getSeverityColor = (level) => {
    switch (level) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warningCount = logs.filter(l => l.level === 'warning').length;

  return (
    <div className="error-logs-page">
      <header className="page-header">
        <div>
          <h1>Error Logs</h1>
          <p className="current-time"><Clock size={14} />{currentTime}</p>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={exportLogs}>
            <Download size={18} />
            Export
          </button>
          <button className="action-btn" onClick={clearLogs}>
            <Trash2 size={18} />
            Clear
          </button>
          <button className="action-btn primary" onClick={fetchLogs}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat error">
          <XCircle size={20} />
          <span className="count">{errorCount}</span>
          <span className="label">Errors</span>
        </div>
        <div className="stat warning">
          <AlertTriangle size={20} />
          <span className="count">{warningCount}</span>
          <span className="label">Warnings</span>
        </div>
        <div className="stat total">
          <AlertCircle size={20} />
          <span className="count">{logs.length}</span>
          <span className="label">Total Logs</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          {severityLevels.map(({ key, label, color }) => (
            <button
              key={key}
              className={`filter-btn ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
              style={filter === key ? { borderColor: color, color } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} />
            <h3>No logs found</h3>
            <p>{filter !== 'all' ? 'Try changing the filter' : 'System running smoothly'}</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`log-item ${log.level} ${expandedLog === log.id ? 'expanded' : ''}`}
            >
              <div 
                className="log-header"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div 
                  className="log-icon"
                  style={{ color: getSeverityColor(log.level) }}
                >
                  {getSeverityIcon(log.level)}
                </div>
                <div className="log-main">
                  <span className="log-message">{log.message}</span>
                  <div className="log-meta">
                    <span className="source">{log.source}</span>
                    {log.venue && <span className="venue">{log.venue}</span>}
                    {log.endpoint && <span className="endpoint">{log.endpoint}</span>}
                  </div>
                </div>
                <span className="log-time">{formatTime(log.timestamp)}</span>
                <div className="log-actions">
                  <button 
                    className="copy-btn"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(log); }}
                  >
                    {copiedId === log.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                  </button>
                  {expandedLog === log.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>
              
              {expandedLog === log.id && (
                <div className="log-details">
                  {log.details && (
                    <div className="detail-row">
                      <span className="detail-label">Details:</span>
                      <span className="detail-value">{log.details}</span>
                    </div>
                  )}
                  {log.ticket && (
                    <div className="detail-row">
                      <span className="detail-label">Ticket:</span>
                      <span className="detail-value">{log.ticket}</span>
                    </div>
                  )}
                  {log.stack && (
                    <div className="stack-trace">
                      <span className="detail-label">Stack Trace:</span>
                      <pre>{log.stack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        .error-logs-page { padding: 2rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .current-time { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; }
        .header-actions { display: flex; gap: 0.5rem; }
        .action-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; cursor: pointer; }
        .action-btn:hover { background: #f8fafc; }
        .action-btn.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .stats-bar { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .stat { display: flex; align-items: center; gap: 0.5rem; background: white; padding: 0.75rem 1.25rem; border-radius: 10px; border: 1px solid #e2e8f0; }
        .stat.error { color: #ef4444; }
        .stat.warning { color: #f59e0b; }
        .stat.total { color: #64748b; }
        .stat .count { font-size: 1.25rem; font-weight: 700; }
        .stat .label { font-size: 0.8125rem; color: #64748b; }

        .filters-bar { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .search-box { display: flex; align-items: center; gap: 0.75rem; flex: 1; background: white; padding: 0.625rem 1rem; border-radius: 10px; border: 1px solid #e2e8f0; }
        .search-box svg { color: #9ca3af; }
        .search-box input { flex: 1; border: none; outline: none; font-size: 0.9375rem; }
        .filter-buttons { display: flex; gap: 0.5rem; }
        .filter-btn { padding: 0.5rem 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.8125rem; cursor: pointer; transition: all 0.2s; }
        .filter-btn:hover { border-color: #3b82f6; }
        .filter-btn.active { background: #f8fafc; font-weight: 500; }

        .logs-container { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .log-item { border-bottom: 1px solid #f1f5f9; }
        .log-item:last-child { border-bottom: none; }
        .log-item.error { border-left: 3px solid #ef4444; }
        .log-item.warning { border-left: 3px solid #f59e0b; }
        .log-item.info { border-left: 3px solid #3b82f6; }
        
        .log-header { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; cursor: pointer; transition: background 0.2s; }
        .log-header:hover { background: #f8fafc; }
        .log-icon { margin-top: 2px; }
        .log-main { flex: 1; min-width: 0; }
        .log-message { display: block; font-weight: 500; color: #1e293b; margin-bottom: 0.25rem; }
        .log-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .log-meta span { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 4px; }
        .log-meta .source { background: #f1f5f9; color: #64748b; }
        .log-meta .venue { background: #dbeafe; color: #1d4ed8; }
        .log-meta .endpoint { background: #fef3c7; color: #92400e; font-family: monospace; }
        .log-time { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; }
        .log-actions { display: flex; align-items: center; gap: 0.5rem; }
        .copy-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0.25rem; }
        .copy-btn:hover { color: #3b82f6; }

        .log-details { padding: 0 1rem 1rem 3rem; }
        .detail-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.875rem; }
        .detail-label { color: #64748b; min-width: 80px; }
        .detail-value { color: #1e293b; }
        .stack-trace { margin-top: 0.75rem; }
        .stack-trace pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px; font-size: 0.75rem; overflow-x: auto; margin-top: 0.5rem; }

        .empty-state { text-align: center; padding: 4rem 2rem; color: #22c55e; }
        .empty-state svg { margin-bottom: 1rem; }
        .empty-state h3 { font-size: 1rem; color: #1e293b; margin-bottom: 0.25rem; }
        .empty-state p { font-size: 0.875rem; color: #64748b; }
      `}</style>
    </div>
  );
}
