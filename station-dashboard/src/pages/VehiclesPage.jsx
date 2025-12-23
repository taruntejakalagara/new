import { useState, useEffect } from 'react';
import { 
  Car, Search, RefreshCw, Clock, Star, Camera,
  AlertCircle, Zap, XCircle
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS, ENDPOINTS } from '../config/api';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('parked');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showPhotos, setShowPhotos] = useState(false);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, REFRESH_INTERVALS.VEHICLES);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.VEHICLES}?status=${filter}`);
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (vehicleId) => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.VEHICLE_PHOTOS(vehicleId)}`);
      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      setPhotos([]);
    }
  };

  const handleCreatePriorityRequest = async (vehicle) => {
    if (!confirm(`Create priority retrieval for ${vehicle.license_plate}?`)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_card_id: vehicle.unique_card_id,
          is_priority: true,
          payment_method: 'cash',
          amount: 15,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Priority retrieval request created! Driver will be notified.');
      } else {
        alert(data.message || 'Failed to create request');
      }
      fetchVehicles();
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request');
    }
  };

  const handleToggleVIP = async (vehicleId, isVip) => {
    try {
      await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVip: !isVip }),
      });
      fetchVehicles();
    } catch (error) {
      console.error('Error updating VIP status:', error);
    }
  };

  const handleViewPhotos = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowPhotos(true);
    await fetchPhotos(vehicle.id);
  };

  const filteredVehicles = vehicles.filter(v => {
    const query = searchQuery.toLowerCase();
    return (
      (v.license_plate || '').toLowerCase().includes(query) ||
      (v.make || '').toLowerCase().includes(query) ||
      (v.model || '').toLowerCase().includes(query) ||
      (v.unique_card_id || '').toLowerCase().includes(query) ||
      String(v.hook_number || '').includes(query)
    );
  });

  // Format duration from check-in time (database stores UTC without Z)
  const formatDuration = (timeStr) => {
    if (!timeStr) return '--';
    
    // Database stores UTC time without 'Z', so we add it
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr.replace(' ', 'T') + 'Z';
    const checkInDate = new Date(utcTime);
    
    if (isNaN(checkInDate.getTime())) return '--';
    
    const now = Date.now();
    const diffMs = now - checkInDate.getTime();
    const minutes = Math.floor(diffMs / 60000);
    
    if (minutes < 0) return '--';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format time in EST
  const formatTime = (timeStr) => {
    if (!timeStr) return '--';
    
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr.replace(' ', 'T') + 'Z';
    const date = new Date(utcTime);
    
    if (isNaN(date.getTime())) return '--';
    
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  // Helper to display vehicle info
  const getVehicleDisplay = (vehicle) => {
    const hasMake = vehicle.make && vehicle.make !== 'Unknown';
    const hasModel = vehicle.model && vehicle.model !== 'Unknown';
    
    if (hasMake || hasModel) {
      return {
        primary: `${hasMake ? vehicle.make : ''} ${hasModel ? vehicle.model : ''}`.trim(),
        secondary: vehicle.color && vehicle.color !== 'Unknown' ? vehicle.color : null
      };
    }
    
    return {
      primary: vehicle.license_plate || 'No Plate',
      secondary: vehicle.color && vehicle.color !== 'Unknown' ? vehicle.color : null
    };
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
          <h1>Vehicles</h1>
          <p>{vehicles.filter(v => v.status === 'parked').length} currently parked</p>
        </div>
        <div className="page-header-actions">
          <div className="search-input">
            <Search size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Search plate, hook, make..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 240 }}
            />
          </div>
          
          <div className="tabs">
            {[
              { value: 'parked', label: 'Parked' },
              { value: 'retrieved', label: 'Retrieved' },
              { value: 'all', label: 'All' },
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
          
          <button className="btn btn-ghost btn-icon" onClick={fetchVehicles}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div className="page-content">
        {filteredVehicles.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Car size={24} />
              </div>
              <h3>No Vehicles</h3>
              <p>{searchQuery ? 'No vehicles match your search' : 'No vehicles in the system'}</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Hook</th>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Check-in</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  const display = getVehicleDisplay(vehicle);
                  
                  return (
                    <tr key={vehicle.id}>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                          #{vehicle.hook_number || '--'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {display.primary}
                            </div>
                            {display.secondary && (
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {display.secondary}
                              </div>
                            )}
                          </div>
                          {vehicle.is_vip && (
                            <span className="badge badge-vip">
                              <Star size={10} /> VIP
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 500 }}>
                          {vehicle.license_plate || '--'}
                        </span>
                      </td>
                      <td>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                          {formatTime(vehicle.check_in_time)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          vehicle.status === 'parked' ? 'badge-success' :
                          vehicle.status === 'retrieving' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>
                          {vehicle.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-xs text-muted">
                          <Clock size={14} />
                          <span className="font-mono">{formatDuration(vehicle.check_in_time)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-xs">
                          {vehicle.has_photos && (
                            <button
                              className="btn btn-ghost btn-icon sm"
                              onClick={() => handleViewPhotos(vehicle)}
                              title="View photos"
                            >
                              <Camera size={14} />
                            </button>
                          )}
                          <button
                            className={`btn btn-ghost btn-icon sm ${vehicle.is_vip ? 'text-accent' : ''}`}
                            onClick={() => handleToggleVIP(vehicle.id, vehicle.is_vip)}
                            title={vehicle.is_vip ? 'Remove VIP' : 'Mark as VIP'}
                          >
                            <Star size={14} fill={vehicle.is_vip ? 'currentColor' : 'none'} />
                          </button>
                          {vehicle.status === 'parked' && (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleCreatePriorityRequest(vehicle)}
                              title="Create priority retrieval"
                            >
                              <Zap size={14} />
                              Priority
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {showPhotos && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setShowPhotos(false)}>
          <div className="modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Camera size={18} style={{ marginRight: 8 }} />
                {selectedVehicle.license_plate} Photos
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPhotos(false)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {photos.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Camera size={24} />
                  </div>
                  <h3>No Photos</h3>
                  <p>No damage photos were taken for this vehicle</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
                  {photos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img
                        src={photo.url}
                        alt={`Vehicle photo ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-surface-alt)',
                        }}
                      />
                      <div 
                        style={{ 
                          position: 'absolute', 
                          bottom: 8, 
                          left: 8,
                          padding: '4px 8px',
                          background: 'rgba(0,0,0,0.7)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          color: 'white',
                        }}
                      >
                        {photo.label || `Photo ${index + 1}`}
                      </div>
                      {photo.has_damage && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8,
                            padding: '4px 8px',
                            background: 'var(--color-error)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: 'white',
                          }}
                        >
                          DAMAGE DETECTED
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {selectedVehicle.damage_notes && (
                <div className="alert alert-warning mt-md">
                  <AlertCircle className="alert-icon" />
                  <div>
                    <strong>Damage Notes:</strong>
                    <div>{selectedVehicle.damage_notes}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div className="text-muted" style={{ fontSize: '0.75rem', marginRight: 'auto' }}>
                Checked in: {formatTime(selectedVehicle.check_in_time)} EST
              </div>
              <button className="btn btn-ghost" onClick={() => setShowPhotos(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
