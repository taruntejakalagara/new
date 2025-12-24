import { useState, useEffect, useRef } from 'react';
import { 
  Activity, Car, User, Clock, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Filter, Trash2, Download, Pause, Play,
  LogIn, LogOut, CreditCard, Key, Bell, Zap
} from 'lucide-react';
import { API_BASE_URL, toEST, getCurrentEST } from '../config/api';

export default function ActivityFeedPage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(getCurrentEST());
  const [stats, setStats] = useState({ total: 0, errors: 0, checkIns: 0, retrievals: 0 });
  const eventsEndRef = useRef(null);

  const eventTypes = [
    { key: 'all', label: 'All Events', icon: Activity },
    { key: 'checkin', label: 'Check-ins', icon: Car },
    { key: 'retrieval', label: 'Retrievals', icon: Key },
    { key: 'driver', label: 'Drivers', icon: User },
    { key: 'error', label: 'Errors', icon: AlertTriangle },
    { key: 'payment', label: 'Payments', icon: CreditCard },
  ];

  useEffect(() => {
    fetchEvents();
    const timeInterval = setInterval(() => setCurrentTime(getCurrentEST()), 1000);
    
    let eventInterval;
    if (!paused) {
      eventInterval = setInterval(fetchEvents, 3000);
    }
    
    return () => {
      clearInterval(timeInterval);
      if (eventInterval) clearInterval(eventInterval);
    };
  }, [paused]);

  useEffect(() => {
    filterEvents();
  }, [events, filter]);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/system/activity`);
      const data = await response.json();
      
      if (data.success && data.events) {
        setEvents(data.events);
        setStats({
          total: data.events.length,
          errors: data.events.filter(e => e.type === 'error').length,
          checkIns: data.events.filter(e => e.type === 'checkin').length,
          retrievals: data.events.filter(e => e.type === 'retrieval').length
        });
      } else {
        // Generate demo events
        generateDemoEvents();
      }
    } catch (error) {
      generateDemoEvents();
    } finally {
      setLoading(false);
    }
  };

  const generateDemoEvents = () => {
    const demoEvents = [
      { id: 1, type: 'checkin', message: 'Vehicle checked in: Tesla Model 3 (Black)', venue: 'Fairmont Pittsburgh', ticket: 'A-045', timestamp: new Date(Date.now() - 30000).toISOString(), driver: 'John S.' },
      { id: 2, type: 'retrieval', message: 'Retrieval requested: BMW X5', venue: 'Fairmont Pittsburgh', ticket: 'A-032', timestamp: new Date(Date.now() - 60000).toISOString(), status: 'pending' },
      { id: 3, type: 'driver', message: 'Driver logged in', venue: 'Westin Convention', driver: 'Mike J.', timestamp: new Date(Date.now() - 90000).toISOString(), action: 'login' },
      { id: 4, type: 'retrieval', message: 'Vehicle retrieved successfully', venue: 'Fairmont Pittsburgh', ticket: 'A-028', timestamp: new Date(Date.now() - 120000).toISOString(), status: 'completed', driver: 'John S.' },
      { id: 5, type: 'error', message: 'Payment failed: Card declined', venue: 'Westin Convention', ticket: 'B-015', timestamp: new Date(Date.now() - 150000).toISOString(), severity: 'high' },
      { id: 6, type: 'checkin', message: 'Vehicle checked in: Mercedes GLE', venue: 'Omni William Penn', ticket: 'C-012', timestamp: new Date(Date.now() - 180000).toISOString(), driver: 'David W.' },
      { id: 7, type: 'payment', message: 'Payment received: $25.00', venue: 'Fairmont Pittsburgh', ticket: 'A-028', timestamp: new Date(Date.now() - 200000).toISOString(), amount: 25 },
      { id: 8, type: 'driver', message: 'Driver went on break', venue: 'Fairmont Pittsburgh', driver: 'Sarah K.', timestamp: new Date(Date.now() - 250000).toISOString(), action: 'break' },
      { id: 9, type: 'error', message: 'WebSocket disconnected: Station iPad', venue: 'Omni William Penn', timestamp: new Date(Date.now() - 300000).toISOString(), severity: 'medium' },
      { id: 10, type: 'checkin', message: 'Priority check-in: Audi Q7', venue: 'Fairmont Pittsburgh', ticket: 'A-046', timestamp: new Date(Date.now() - 350000).toISOString(), priority: true },
    ];
    
    setEvents(demoEvents);
    setStats({
      total: demoEvents.length,
      errors: demoEvents.filter(e => e.type === 'error').length,
      checkIns: demoEvents.filter(e => e.type === 'checkin').length,
      retrievals: demoEvents.filter(e => e.type === 'retrieval').length
    });
  };

  const filterEvents = () => {
    if (filter === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(e => e.type === filter));
    }
  };

  const clearEvents = () => {
    setEvents([]);
    setFilteredEvents([]);
  };

  const getEventIcon = (event) => {
    switch (event.type) {
      case 'checkin': return <Car size={18} />;
      case 'retrieval': return <Key size={18} />;
      case 'driver': return event.action === 'login' ? <LogIn size={18} /> : <LogOut size={18} />;
      case 'error': return <AlertTriangle size={18} />;
      case 'payment': return <CreditCard size={18} />;
      default: return <Activity size={18} />;
    }
  };

  const getEventColor = (event) => {
    switch (event.type) {
      case 'checkin': return '#3b82f6';
      case 'retrieval': return '#8b5cf6';
      case 'driver': return '#22c55e';
      case 'error': return '#ef4444';
      case 'payment': return '#10b981';
      default: return '#64748b';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    });
  };

  return (
    <div className="activity-feed-page">
      <header className="page-header">
        <div>
          <h1>Live Activity Feed</h1>
          <p className="current-time"><Clock size={14} />{currentTime}</p>
        </div>
        <div className="header-actions">
          <button 
            className={`control-btn ${paused ? 'paused' : ''}`} 
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="control-btn" onClick={clearEvents}>
            <Trash2 size={18} />
            Clear
          </button>
          <button className="control-btn" onClick={fetchEvents}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value text-blue">{stats.checkIns}</span>
          <span className="stat-label">Check-ins</span>
        </div>
        <div className="stat">
          <span className="stat-value text-purple">{stats.retrievals}</span>
          <span className="stat-label">Retrievals</span>
        </div>
        <div className="stat">
          <span className="stat-value text-red">{stats.errors}</span>
          <span className="stat-label">Errors</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {eventTypes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`filter-tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            <Icon size={16} />
            {label}
            {key !== 'all' && (
              <span className="count">
                {events.filter(e => e.type === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="events-container">
        {paused && (
          <div className="paused-banner">
            <Pause size={16} />
            Feed paused - Click Resume to continue
          </div>
        )}
        
        <div className="events-list">
          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              <Activity size={48} />
              <h3>No events yet</h3>
              <p>Events will appear here in real-time</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div 
                key={event.id} 
                className={`event-item ${event.type} ${event.severity === 'high' ? 'high-severity' : ''}`}
              >
                <div 
                  className="event-icon"
                  style={{ backgroundColor: `${getEventColor(event)}15`, color: getEventColor(event) }}
                >
                  {getEventIcon(event)}
                </div>
                <div className="event-content">
                  <p className="event-message">{event.message}</p>
                  <div className="event-meta">
                    <span className="venue">{event.venue}</span>
                    {event.ticket && <span className="ticket">#{event.ticket}</span>}
                    {event.driver && <span className="driver">{event.driver}</span>}
                    {event.priority && <span className="priority"><Zap size={12} />Priority</span>}
                  </div>
                </div>
                <span className="event-time">{formatTime(event.timestamp)}</span>
              </div>
            ))
          )}
          <div ref={eventsEndRef} />
        </div>
      </div>

      <style>{`
        .activity-feed-page { padding: 2rem; display: flex; flex-direction: column; height: calc(100vh - 4rem); }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .current-time { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; }
        .header-actions { display: flex; gap: 0.5rem; }
        .control-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .control-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .control-btn.paused { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .stats-bar { display: flex; gap: 2rem; background: white; padding: 1rem 1.5rem; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1rem; }
        .stat { display: flex; flex-direction: column; }
        .stat-value { font-size: 1.25rem; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 0.75rem; color: #64748b; }
        .text-blue { color: #3b82f6; }
        .text-purple { color: #8b5cf6; }
        .text-red { color: #ef4444; }

        .filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .filter-tab { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.8125rem; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .filter-tab:hover { border-color: #3b82f6; color: #3b82f6; }
        .filter-tab.active { background: #3b82f6; border-color: #3b82f6; color: white; }
        .filter-tab .count { background: rgba(0,0,0,0.1); padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.75rem; }
        .filter-tab.active .count { background: rgba(255,255,255,0.2); }

        .events-container { flex: 1; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; }
        .paused-banner { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem; background: #fef3c7; color: #92400e; font-size: 0.8125rem; font-weight: 500; }
        .events-list { flex: 1; overflow-y: auto; padding: 0.5rem; }
        
        .event-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.875rem; border-radius: 8px; margin-bottom: 0.5rem; transition: background 0.2s; }
        .event-item:hover { background: #f8fafc; }
        .event-item.high-severity { background: #fef2f2; border-left: 3px solid #ef4444; }
        .event-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .event-content { flex: 1; min-width: 0; }
        .event-message { font-size: 0.875rem; font-weight: 500; color: #1e293b; margin-bottom: 0.25rem; }
        .event-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .event-meta span { font-size: 0.75rem; color: #64748b; }
        .event-meta .ticket { background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 4px; }
        .event-meta .priority { display: flex; align-items: center; gap: 0.25rem; color: #f59e0b; font-weight: 500; }
        .event-time { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; }

        .empty-state { text-align: center; padding: 4rem 2rem; color: #94a3b8; }
        .empty-state svg { margin-bottom: 1rem; opacity: 0.5; }
        .empty-state h3 { font-size: 1rem; color: #64748b; margin-bottom: 0.25rem; }
        .empty-state p { font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
