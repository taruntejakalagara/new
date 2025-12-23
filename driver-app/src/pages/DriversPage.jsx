import { useState, useEffect } from 'react';
import { 
  Users, RefreshCw, Plus, Search, Trash2,
  CheckCircle, XCircle, Clock, Car, Edit2
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS, ENDPOINTS } from '../config/api';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, REFRESH_INTERVALS.DRIVERS);
    return () => clearInterval(interval);
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVERS}`);
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (driverId, currentStatus) => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVER_STATUS(driverId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchDrivers();
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
  };

  const handleDeleteDriver = async (driverId, driverName) => {
    if (!confirm(`Remove ${driverName} from the system? This cannot be undone.`)) return;

    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.DRIVER_DELETE(driverId)}`, {
        method: 'DELETE',
      });
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to remove driver');
    }
  };

  const filteredDrivers = drivers.filter(d => 
    (d.full_name || d.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = drivers.filter(d => d.status === 'online' || d.status === 'busy').length;
  const busyCount = drivers.filter(d => d.status === 'busy').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'online':
        return <span className="badge badge-success"><CheckCircle size={10} /> Online</span>;
      case 'busy':
        return <span className="badge badge-warning"><Clock size={10} /> On Task</span>;
      case 'offline':
        return <span className="badge badge-neutral"><XCircle size={10} /> Offline</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

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
          <h1>Drivers</h1>
          <p>{activeCount} active • {busyCount} on task</p>
        </div>
        <div className="page-header-actions">
          <div className="search-input">
            <Search size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 200 }}
            />
          </div>
          <button className="btn btn-ghost btn-icon" onClick={fetchDrivers}>
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-accent" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Driver
          </button>
        </div>
      </header>

      <div className="page-content">
        {filteredDrivers.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users size={24} />
              </div>
              <h3>No Drivers</h3>
              <p>Add drivers to get started</p>
              <button className="btn btn-accent mt-md" onClick={() => setShowAddModal(true)}>
                <Plus size={18} />
                Add First Driver
              </button>
            </div>
          </div>
        ) : (
          <div className="drivers-grid">
            {filteredDrivers.map((driver) => (
              <div key={driver.id} className={`driver-card ${driver.status === 'offline' ? 'offline' : ''}`}>
                <div className="driver-header">
                  <div className="driver-avatar">
                    {(driver.full_name || driver.username || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div className="driver-info">
                    <div className="driver-name">{driver.full_name || driver.username}</div>
                    <div className="driver-shift">@{driver.username}</div>
                  </div>
                  {getStatusBadge(driver.status)}
                </div>

                {/* Current Task */}
                {driver.current_task && (
                  <div className="driver-body">
                    <div className="driver-task">
                      <div className="driver-task-label">Current Task</div>
                      <div className="driver-task-vehicle">
                        {driver.current_task.make} {driver.current_task.model}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Hook #{driver.current_task.hook_number}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                {!driver.current_task && (
                  <div className="driver-body">
                    <div className="driver-stats">
                      <div className="driver-stat">
                        <div className="driver-stat-value">{driver.completed_today || 0}</div>
                        <div className="driver-stat-label">Today</div>
                      </div>
                      <div className="driver-stat">
                        <div className="driver-stat-value">{driver.completed_total || 0}</div>
                        <div className="driver-stat-label">Total</div>
                      </div>
                      <div className="driver-stat">
                        <div className="driver-stat-value">{driver.avg_time || '--'}</div>
                        <div className="driver-stat-label">Avg Min</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="driver-footer">
                  <div className="flex items-center gap-sm">
                    <span style={{ fontSize: '0.875rem' }}>Active</span>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={driver.status === 'online' || driver.status === 'busy'}
                        onChange={() => handleToggleStatus(driver.id, driver.status)}
                        disabled={driver.status === 'busy'}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-thumb" />
                    </label>
                  </div>
                  <div className="flex gap-xs">
                    <button 
                      className="btn btn-ghost btn-icon sm"
                      onClick={() => setEditingDriver(driver)}
                      title="Edit driver"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-icon sm"
                      onClick={() => handleDeleteDriver(driver.id, driver.full_name || driver.username)}
                      title="Remove driver"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Driver Modal */}
      {showAddModal && (
        <DriverModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => { setShowAddModal(false); fetchDrivers(); }}
        />
      )}

      {/* Edit Driver Modal */}
      {editingDriver && (
        <DriverModal 
          driver={editingDriver}
          onClose={() => setEditingDriver(null)} 
          onSuccess={() => { setEditingDriver(null); fetchDrivers(); }}
        />
      )}
    </>
  );
}

function DriverModal({ driver, onClose, onSuccess }) {
  const isEdit = !!driver;
  const [formData, setFormData] = useState({
    username: driver?.username || '',
    password: '',
    fullName: driver?.full_name || '',
    phone: driver?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEdit 
        ? `${API_BASE_URL}/drivers/${driver.id}`
        : `${API_BASE_URL}${ENDPOINTS.DRIVER_REGISTER}`;
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const body = isEdit
        ? { fullName: formData.fullName, phone: formData.phone }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Driver' : 'Add New Driver'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error mb-md">
                <XCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {!isEdit && (
              <>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? (
                <span className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                isEdit ? 'Save Changes' : 'Add Driver'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
