import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Car, Users, Clock, TrendingUp,
  CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS } from '../config/api';

function formatTimeEST(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatTimeShort(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [venue, setVenue] = useState({ name: 'Loading...', slug: '' });
  const [stats, setStats] = useState({
    parked: 0,
    activeDrivers: 0,
    pendingRequests: 0,
    avgWaitTime: 0,
    hooksUsed: 0,
    maxHooks: 50,
    todayCheckins: 0,
    todayRetrievals: 0,
  });
  const [drivers, setDrivers] = useState([]);
  const [queue, setQueue] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [statsRes, driversRes, queueRes, vehiclesRes, venuesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/stats`),
        fetch(`${API_BASE_URL}/drivers`),
        fetch(`${API_BASE_URL}/queue`),
        fetch(`${API_BASE_URL}/vehicles`),
        fetch(`${API_BASE_URL}/venues`),
      ]);

      const [statsData, driversData, queueData, vehiclesData, venuesData] = await Promise.all([
        statsRes.json(),
        driversRes.json(),
        queueRes.json(),
        vehiclesRes.json(),
        venuesRes.json(),
      ]);

      // Set venue info
      if (venuesData.success && venuesData.venues && venuesData.venues.length > 0) {
        const venueData = venuesData.venues.find(v => v.id === parseInt(id)) || venuesData.venues[0];
        setVenue(venueData);
      } else {
        setVenue({ name: 'Fairmont Pittsburgh', slug: 'fairmont-pittsburgh' });
      }

      // Process drivers
      const driversList = driversData.drivers || [];
      const activeDrivers = driversList.filter(
        d => d.status === 'online' || d.status === 'active' || d.status === 'available' || d.status === 'busy'
      );
      setDrivers(driversList);

      // Process queue
      const queueList = queueData.requests || [];
      const pendingQueue = queueList.filter(r => r.status === 'pending');
      setQueue(queueList);

      // Process vehicles
      const vehiclesList = vehiclesData.vehicles || [];
      setVehicles(vehiclesList);

      // Set stats
      setStats({
        parked: statsData.parked || vehiclesList.filter(v => v.status === 'parked').length || vehiclesList.length,
        activeDrivers: activeDrivers.length,
        pendingRequests: pendingQueue.length,
        avgWaitTime: statsData.today?.avgWaitMinutes || 0,
        hooksUsed: statsData.parked || vehiclesList.length,
        maxHooks: 50,
        todayCheckins: statsData.today?.checkins || 0,
        todayRetrievals: statsData.today?.retrievals || 0,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching venue data:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVALS.STATS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'available':
        return '#10b981';
      case 'busy':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'active': return 'Active';
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return status || 'Unknown';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color="#94a3b8" />
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>
            {venue.name}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            {formatTimeEST(lastUpdate)}
          </span>
          <button
            onClick={fetchData}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={18} color="#94a3b8" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Car size={26} color="#3b82f6" />
          </div>
          <div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>{stats.parked}</p>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Vehicles Parked</span>
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users size={26} color="#f59e0b" />
          </div>
          <div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>{stats.activeDrivers}</p>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Active Drivers</span>
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(249, 115, 22, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clock size={26} color="#f97316" />
          </div>
          <div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>{stats.pendingRequests}</p>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Pending Requests</span>
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrendingUp size={26} color="#8b5cf6" />
          </div>
          <div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>{stats.avgWaitTime}m</p>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Avg Wait Time</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #334155',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
      }}>
        <div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Hooks Used</p>
          <p style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {stats.hooksUsed} / {stats.maxHooks}
          </p>
          <div style={{
            height: '6px',
            background: '#334155',
            borderRadius: '3px',
            marginTop: '8px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(stats.hooksUsed / stats.maxHooks) * 100}%`,
              background: stats.hooksUsed / stats.maxHooks > 0.8 ? '#ef4444' : '#10b981',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
        <div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Today's Check-ins</p>
          <p style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{stats.todayCheckins}</p>
        </div>
        <div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Today's Retrievals</p>
          <p style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{stats.todayRetrievals}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'drivers', label: `Drivers (${drivers.length})` },
          { key: 'queue', label: `Queue (${queue.filter(q => q.status === 'pending').length})` },
          { key: 'vehicles', label: `Vehicles (${vehicles.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              background: activeTab === tab.key ? '#6366f1' : '#1e293b',
              color: activeTab === tab.key ? 'white' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Active Drivers */}
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #334155',
          }}>
            <h3 style={{ color: 'white', fontWeight: '600', margin: '0 0 16px 0' }}>Active Drivers</h3>
            {drivers.filter(d => d.status === 'online' || d.status === 'active' || d.status === 'available' || d.status === 'busy').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {drivers
                  .filter(d => d.status === 'online' || d.status === 'active' || d.status === 'available' || d.status === 'busy')
                  .map((driver) => (
                    <div
                      key={driver.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: '#0f172a',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: getStatusColor(driver.status),
                          boxShadow: `0 0 8px ${getStatusColor(driver.status)}`,
                        }} />
                        <div>
                          <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>
                            {driver.full_name || driver.fullName || driver.username}
                          </p>
                          <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0 0 0' }}>
                            {getStatusLabel(driver.status)} {driver.current_task ? `• ${driver.current_task}` : ''}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        background: '#334155',
                        borderRadius: '6px',
                        color: '#94a3b8',
                        fontSize: '12px',
                      }}>
                        Last: {formatTimeShort(driver.lastLogin)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: '#0f172a',
                borderRadius: '10px',
              }}>
                <Users size={32} color="#475569" style={{ marginBottom: '8px' }} />
                <p style={{ color: '#64748b', margin: 0 }}>No active drivers</p>
              </div>
            )}
          </div>

          {/* Pending Requests */}
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #334155',
          }}>
            <h3 style={{ color: 'white', fontWeight: '600', margin: '0 0 16px 0' }}>Pending Requests</h3>
            {queue.filter(q => q.status === 'pending').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {queue
                  .filter(q => q.status === 'pending')
                  .map((request) => (
                    <div
                      key={request.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: request.is_priority ? 'rgba(245, 158, 11, 0.1)' : '#0f172a',
                        borderRadius: '10px',
                        border: request.is_priority ? '1px solid rgba(245, 158, 11, 0.3)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>
                            {request.license_plate || `Hook #${request.hook_number}`}
                          </p>
                          {request.is_priority === 1 && (
                            <span style={{
                              padding: '2px 6px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#f59e0b',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600',
                            }}>
                              PRIORITY
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                          Hook #{request.hook_number} • ${request.amount || 0}
                        </p>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>
                        {formatTimeShort(request.requested_at)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '10px',
              }}>
                <CheckCircle size={32} color="#10b981" style={{ marginBottom: '8px' }} />
                <p style={{ color: '#10b981', margin: 0 }}>No pending requests</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #334155',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {drivers.map((driver) => (
              <div
                key={driver.id}
                style={{
                  padding: '16px',
                  background: '#0f172a',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px',
                  }}>
                    {(driver.full_name || driver.username || 'D').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>
                      {driver.full_name || driver.fullName || driver.username}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0 0 0' }}>
                      @{driver.username}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: `${getStatusColor(driver.status)}20`,
                    color: getStatusColor(driver.status),
                  }}>
                    {getStatusLabel(driver.status)}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>
                    {driver.phone || 'No phone'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {drivers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Users size={48} color="#475569" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#64748b' }}>No drivers registered</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'queue' && (
        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #334155',
        }}>
          {queue.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queue.map((request) => (
                <div
                  key={request.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#0f172a',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: request.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {request.status === 'pending' ? (
                        <Clock size={22} color="#f59e0b" />
                      ) : (
                        <CheckCircle size={22} color="#10b981" />
                      )}
                    </div>
                    <div>
                      <p style={{ color: 'white', fontWeight: '500', margin: 0 }}>
                        {request.license_plate || `Card ${request.unique_card_id?.slice(0, 12)}`}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Hook #{request.hook_number} • {request.driver_name ? `Driver: ${request.driver_name}` : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: request.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: request.status === 'pending' ? '#f59e0b' : '#10b981',
                    }}>
                      {request.status.toUpperCase()}
                    </span>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: '8px 0 0 0' }}>
                      ${request.amount || 0} • {formatTimeShort(request.requested_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <CheckCircle size={48} color="#10b981" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#64748b' }}>Queue is empty</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #334155',
        }}>
          {vehicles.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Hook</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>License Plate</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Vehicle</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Color</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Check-in Time</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', color: 'white', fontWeight: '600' }}>#{vehicle.hook_number}</td>
                      <td style={{ padding: '12px', color: 'white' }}>{vehicle.license_plate || 'N/A'}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{vehicle.make} {vehicle.model}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{vehicle.color || 'N/A'}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{formatTimeShort(vehicle.check_in_time)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                        }}>
                          {vehicle.status || 'Parked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Car size={48} color="#475569" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#64748b' }}>No vehicles parked</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
