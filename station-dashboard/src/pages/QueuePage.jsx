import { useState, useEffect } from 'react';
import { 
  Clock, User, Car, RefreshCw, AlertCircle, 
  CheckCircle, XCircle, Star, Zap, Bell, Phone,
  MapPin, MessageSquare, Key, Footprints, Navigation
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS, ENDPOINTS } from '../config/api';

// Status display config
const STATUS_CONFIG = {
  pending: { label: 'Pending', badge: 'warning', icon: Clock },
  assigned: { label: 'Assigned', badge: 'info', icon: User },
  keys_picked: { label: 'Keys Picked', badge: 'info', icon: Key },
  walking: { label: 'Walking to Car', badge: 'info', icon: Footprints },
  driving: { label: 'Driving', badge: 'accent', icon: Navigation },
  ready: { label: 'Car Ready', badge: 'success', icon: CheckCircle },
  completed: { label: 'Completed', badge: 'success', icon: CheckCircle },
};

export default function QueuePage() {
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVALS.QUEUE);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [queueRes, driversRes] = await Promise.all([
        fetch(`${API_BASE_URL}${ENDPOINTS.QUEUE}`).then(r => r.json()),
        fetch(`${API_BASE_URL}${ENDPOINTS.DRIVERS}`).then(r => r.json()),
      ]);

      setRequests(queueRes.requests || []);
      setDrivers(driversRes.drivers?.filter(d => d.status === 'available') || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async (requestId, driverId) => {
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.ASSIGN_DRIVER(requestId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      setAssigningId(null);
      fetchData();
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver');
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Cancel this retrieval request?')) return;
    
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.CANCEL_REQUEST(requestId)}`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const handleNotifyCustomer = async (requestId) => {
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.CUSTOMER_NOTIFIED(requestId)}`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Error notifying customer:', error);
    }
  };

  const getWaitTime = (requestedAt) => {
    if (!requestedAt) return { text: '--', status: 'normal' };
    const minutes = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 60000);
    if (minutes < 1) return { text: '<1m', status: 'normal' };
    if (minutes >= 60) return { text: `${Math.floor(minutes/60)}h ${minutes%60}m`, status: 'critical' };
    if (minutes > 5) return { text: `${minutes}m`, status: 'critical' };
    if (minutes > 3) return { text: `${minutes}m`, status: 'warning' };
    return { text: `${minutes}m`, status: 'normal' };
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'in_progress') return ['assigned', 'keys_picked', 'walking', 'driving'].includes(r.status);
    if (filter === 'ready') return r.status === 'ready';
    if (filter === 'priority') return r.is_priority || r.is_vip;
    return r.status !== 'completed'; // 'all' excludes completed
  });

  // Sort: priority/VIP first, then by wait time
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (a.is_priority && !b.is_priority) return -1;
    if (!a.is_priority && b.is_priority) return 1;
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;
    return new Date(a.requested_at) - new Date(b.requested_at);
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const inProgressCount = requests.filter(r => ['assigned', 'keys_picked', 'walking', 'driving'].includes(r.status)).length;
  const readyCount = requests.filter(r => r.status === 'ready').length;

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
          <h1>Retrieval Queue</h1>
          <p>{pendingCount} pending • {inProgressCount} in progress • {readyCount} ready</p>
        </div>
        <div className="page-header-actions">
          <div className="tabs">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: `Pending (${pendingCount})` },
              { value: 'in_progress', label: `In Progress (${inProgressCount})` },
              { value: 'ready', label: `Ready (${readyCount})` },
              { value: 'priority', label: '⚡ Priority' },
            ].map((tab) => (
              <button
                key={tab.value}
                className={`tab ${filter === tab.value ? 'active' : ''}`}
                onClick={() => setFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={fetchData}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Available Drivers Bar */}
        {drivers.length > 0 && (
          <div className="card mb-md">
            <div className="card-body compact">
              <div className="flex items-center gap-md">
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  AVAILABLE ({drivers.length})
                </span>
                <div className="flex flex-wrap gap-xs">
                  {drivers.map(d => (
                    <span key={d.id} className="badge badge-success">
                      {d.full_name || d.username}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queue List */}
        <div className="card">
          {sortedRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Clock size={24} />
              </div>
              <h3>No Requests</h3>
              <p>Retrieval requests will appear here</p>
            </div>
          ) : (
            <div className="queue-list">
              {sortedRequests.map((request) => {
                const waitTime = getWaitTime(request.requested_at);
                const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div 
                    key={request.id} 
                    className={`queue-item ${request.is_priority ? 'priority' : ''} ${request.is_vip ? 'vip' : ''}`}
                  >
                    {/* Hook Number */}
                    <div className="queue-hook">#{request.hook_number}</div>

                    {/* Vehicle Info */}
                    <div className="queue-vehicle">
                      <div className="queue-vehicle-name">
                        {request.make || 'Unknown'} {request.model || ''}
                        {request.is_vip && (
                          <span className="badge badge-vip" style={{ marginLeft: 8 }}>
                            <Star size={10} /> VIP
                          </span>
                        )}
                        {request.is_priority && (
                          <span className="badge badge-error" style={{ marginLeft: 4 }}>
                            <Zap size={10} /> PRIORITY
                          </span>
                        )}
                      </div>
                      <div className="queue-vehicle-plate">
                        {request.license_plate} • {request.color || 'Unknown'}
                      </div>
                    </div>

                    {/* Driver Info */}
                    <div className="queue-customer">
                      {request.driver_name ? (
                        <>
                          <div className="queue-customer-name">
                            <User size={12} style={{ marginRight: 4 }} />
                            {request.driver_name}
                          </div>
                          <div className="queue-customer-status">
                            <StatusIcon size={12} style={{ marginRight: 4 }} />
                            {statusConfig.label}
                          </div>
                        </>
                      ) : (
                        <div className="queue-customer-status text-muted">
                          No driver assigned
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`badge badge-${statusConfig.badge}`}>
                        <StatusIcon size={12} style={{ marginRight: 4 }} />
                        {statusConfig.label}
                      </span>
                      {request.status === 'ready' && (
                        <div className="text-success" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                          Ready for pickup!
                        </div>
                      )}
                    </div>

                    {/* Wait Time */}
                    <div className={`queue-time ${waitTime.status}`}>
                      <Clock size={14} />
                      {waitTime.text}
                    </div>

                    {/* Actions */}
                    <div className="queue-actions">
                      {request.status === 'pending' && (
                        assigningId === request.id ? (
                          <select
                            autoFocus
                            className="form-input form-select"
                            style={{ width: 140, padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                            onChange={(e) => {
                              if (e.target.value) handleAssignDriver(request.id, e.target.value);
                            }}
                            onBlur={() => setAssigningId(null)}
                          >
                            <option value="">Select driver</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>{d.full_name || d.username}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={() => setAssigningId(request.id)}
                          >
                            <User size={14} />
                            Assign
                          </button>
                        )
                      )}

                      {request.status === 'ready' && !request.customer_notified && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleNotifyCustomer(request.id)}
                          title="Notify customer car is ready"
                        >
                          <Bell size={14} />
                          Notify
                        </button>
                      )}

                      {request.status === 'ready' && request.customer_notified && (
                        <span className="badge badge-success">
                          <CheckCircle size={12} /> Notified
                        </span>
                      )}

                      {request.status !== 'ready' && request.status !== 'completed' && (
                        <button
                          className="btn btn-ghost btn-icon sm"
                          onClick={() => handleCancelRequest(request.id)}
                          title="Cancel request"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
