import { useState, useEffect } from 'react';
import { 
  Clock, Users, Play, Square, RefreshCw,
  Calendar, Plus, User, AlertCircle
} from 'lucide-react';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

export default function ShiftsPage() {
  const [drivers, setDrivers] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [driversRes, shiftsRes] = await Promise.all([
        fetch(`${API_BASE_URL}${ENDPOINTS.DRIVERS}`).then(r => r.json()),
        fetch(`${API_BASE_URL}${ENDPOINTS.SHIFT_ACTIVE}`).then(r => r.json()).catch(() => ({ shifts: [] })),
      ]);

      setDrivers(driversRes.drivers || []);
      setActiveShifts(shiftsRes.shifts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async (driverId) => {
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.SHIFT_START}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      fetchData();
      setShowStartModal(false);
    } catch (error) {
      console.error('Error starting shift:', error);
      alert('Failed to start shift');
    }
  };

  const handleEndShift = async (shiftId, driverId) => {
    if (!confirm('End this driver\'s shift?')) return;

    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.SHIFT_END}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, driverId }),
      });
      fetchData();
    } catch (error) {
      console.error('Error ending shift:', error);
      alert('Failed to end shift');
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '--';
    const minutes = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get drivers not currently on shift
  const driversOnShift = new Set(activeShifts.map(s => s.driver_id));
  const availableDrivers = drivers.filter(d => !driversOnShift.has(d.id));

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
          <h1>Shifts</h1>
          <p>{activeShifts.length} active shifts</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-icon" onClick={fetchData}>
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-accent" onClick={() => setShowStartModal(true)}>
            <Plus size={18} />
            Start Shift
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Active Shifts */}
        <div className="card mb-lg">
          <div className="card-header">
            <h2>Active Shifts</h2>
            <span className="badge badge-success">{activeShifts.length} On Duty</span>
          </div>
          <div className="card-body flush">
            {activeShifts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Clock size={24} />
                </div>
                <h3>No Active Shifts</h3>
                <p>Start a shift to clock drivers in</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th>Retrievals</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeShifts.map((shift) => (
                    <tr key={shift.id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div className="driver-avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
                            {shift.driver_name?.charAt(0) || 'D'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{shift.driver_name}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              @{shift.driver_username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono">{formatTime(shift.started_at)}</span>
                      </td>
                      <td>
                        <span className="font-mono">{formatDuration(shift.started_at)}</span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 600 }}>
                          {shift.retrievals || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${shift.current_task ? 'badge-warning' : 'badge-success'}`}>
                          {shift.current_task ? 'On Task' : 'Available'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => handleEndShift(shift.id, shift.driver_id)}
                        >
                          <Square size={14} />
                          End Shift
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Today's Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
          <div className="stat-card">
            <div className="stat-label">Total Hours Today</div>
            <div className="stat-value">
              {activeShifts.reduce((sum, s) => {
                const mins = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 60000);
                return sum + mins / 60;
              }, 0).toFixed(1)}h
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Retrievals</div>
            <div className="stat-value">
              {activeShifts.reduce((sum, s) => sum + (s.retrievals || 0), 0)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg per Driver</div>
            <div className="stat-value">
              {activeShifts.length > 0 
                ? (activeShifts.reduce((sum, s) => sum + (s.retrievals || 0), 0) / activeShifts.length).toFixed(1)
                : 0
              }
            </div>
          </div>
        </div>
      </div>

      {/* Start Shift Modal */}
      {showStartModal && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start Driver Shift</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowStartModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {availableDrivers.length === 0 ? (
                <div className="alert alert-warning">
                  <AlertCircle className="alert-icon" />
                  <span>All drivers are already on shift</span>
                </div>
              ) : (
                <div className="flex flex-col gap-sm">
                  {availableDrivers.map((driver) => (
                    <button
                      key={driver.id}
                      className="btn btn-outline btn-lg"
                      style={{ justifyContent: 'flex-start' }}
                      onClick={() => handleStartShift(driver.id)}
                    >
                      <div className="driver-avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
                        {driver.full_name?.charAt(0) || driver.username?.charAt(0)}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div>{driver.full_name || driver.username}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                          @{driver.username}
                        </div>
                      </div>
                      <Play size={18} style={{ marginLeft: 'auto', color: 'var(--color-success)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
