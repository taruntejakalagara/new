import { useState, useEffect } from 'react';
import { 
  RefreshCw, Grid3X3, Car, Key, Star, 
  XCircle, Eye, EyeOff, Camera
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS, ENDPOINTS } from '../config/api';

export default function HookBoardPage() {
  const [hooks, setHooks] = useState([]);
  const [stats, setStats] = useState({ total: 50, available: 0, occupied: 0, reserved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedHook, setSelectedHook] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState({});

  useEffect(() => {
    fetchHooks();
    const interval = setInterval(fetchHooks, REFRESH_INTERVALS.HOOKS);
    return () => clearInterval(interval);
  }, []);

  const fetchHooks = async () => {
    try {
      const [hooksRes, statsRes, heatmapRes] = await Promise.all([
        fetch(`${API_BASE_URL}${ENDPOINTS.HOOKS}`).then(r => r.json()),
        fetch(`${API_BASE_URL}${ENDPOINTS.HOOKS_STATS}`).then(r => r.json()),
        fetch(`${API_BASE_URL}${ENDPOINTS.HOOK_HEATMAP}`).then(r => r.json()).catch(() => ({ heatmap: {} })),
      ]);

      setHooks(hooksRes.hooks || []);
      setStats(statsRes.stats || { total: 50, available: 50, occupied: 0, reserved: 0 });
      setHeatmapData(heatmapRes.heatmap || {});
    } catch (error) {
      console.error('Error fetching hooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseHook = async (hookNumber) => {
    if (!confirm(`Release hook #${hookNumber}? This will mark the spot as available.`)) return;
    
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.HOOK_RELEASE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook_number: hookNumber }),
      });
      setSelectedHook(null);
      fetchHooks();
    } catch (error) {
      console.error('Error releasing hook:', error);
    }
  };

  // Generate grid of hooks
  const hookGrid = Array.from({ length: stats.total || 50 }, (_, i) => {
    const hookNum = i + 1;
    return hooks.find(h => h.hook_number === hookNum) || {
      hook_number: hookNum,
      status: 'available',
    };
  });

  // Calculate heatmap intensity (0-1)
  const getHeatmapIntensity = (hookNumber) => {
    const usage = heatmapData[hookNumber] || 0;
    const maxUsage = Math.max(...Object.values(heatmapData), 1);
    return usage / maxUsage;
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
          <h1>Hook Board</h1>
          <p>{stats.available} available • {stats.occupied} occupied</p>
        </div>
        <div className="page-header-actions">
          <button 
            className={`btn ${showHeatmap ? 'btn-accent' : 'btn-outline'}`}
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            {showHeatmap ? <EyeOff size={18} /> : <Eye size={18} />}
            {showHeatmap ? 'Hide' : 'Show'} Heatmap
          </button>
          <button className="btn btn-ghost btn-icon" onClick={fetchHooks}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Legend */}
        <div className="card mb-md">
          <div className="card-body compact">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-lg">
                <div className="flex items-center gap-sm">
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--color-success-light)', border: '2px solid var(--color-success)' }} />
                  <span style={{ fontSize: '0.75rem' }}>Available ({stats.available})</span>
                </div>
                <div className="flex items-center gap-sm">
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '0.75rem' }}>Occupied ({stats.occupied})</span>
                </div>
                <div className="flex items-center gap-sm">
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--color-warning-light)', border: '2px solid var(--color-warning)' }} />
                  <span style={{ fontSize: '0.75rem' }}>Reserved ({stats.reserved || 0})</span>
                </div>
                <div className="flex items-center gap-sm">
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--color-info-light)', border: '2px solid var(--color-info)' }} />
                  <span style={{ fontSize: '0.75rem' }}>Retrieving</span>
                </div>
              </div>
              {showHeatmap && (
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Usage:</span>
                  <div style={{ 
                    width: 80, 
                    height: 12, 
                    borderRadius: 6,
                    background: 'linear-gradient(90deg, rgba(197,165,114,0.1) 0%, var(--color-accent) 100%)',
                  }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>High</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hook Grid */}
        <div className="card">
          <div className="card-body">
            <div className="hook-grid">
              {hookGrid.map((hook) => {
                const intensity = showHeatmap ? getHeatmapIntensity(hook.hook_number) : 0;
                
                return (
                  <div
                    key={hook.hook_number}
                    className={`hook-cell ${hook.status} ${hook.is_vip ? 'vip' : ''}`}
                    onClick={() => setSelectedHook(hook)}
                    title={hook.license_plate ? `${hook.license_plate}` : `Hook #${hook.hook_number}`}
                    style={{
                      position: 'relative',
                    }}
                  >
                    {/* Heatmap overlay */}
                    {showHeatmap && (
                      <div 
                        className="hook-heatmap"
                        style={{
                          background: `rgba(197, 165, 114, ${intensity * 0.5})`,
                        }}
                      />
                    )}
                    
                    <span style={{ position: 'relative', zIndex: 1 }}>{hook.hook_number}</span>
                    {hook.license_plate && (
                      <span className="hook-plate" style={{ position: 'relative', zIndex: 1 }}>
                        {hook.license_plate.slice(-4)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {showHeatmap && (
          <div className="card mt-md">
            <div className="card-header">
              <h2>💡 Suggestions</h2>
            </div>
            <div className="card-body">
              <div className="flex flex-col gap-sm">
                {(() => {
                  const lowUsage = Object.entries(heatmapData)
                    .filter(([_, v]) => v < 5)
                    .map(([k]) => k);
                  
                  if (lowUsage.length > 10) {
                    return (
                      <div className="alert alert-info">
                        Hooks {lowUsage.slice(0, 5).join(', ')}... are rarely used. Consider reorganizing or reducing hook count.
                      </div>
                    );
                  }
                  return (
                    <div className="text-muted">
                      Hook usage is well distributed. No changes recommended.
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hook Detail Modal */}
      {selectedHook && (
        <div className="modal-overlay" onClick={() => setSelectedHook(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Hook #{selectedHook.hook_number}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedHook(null)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="flex items-center gap-sm mb-md">
                <span className={`badge ${
                  selectedHook.status === 'available' ? 'badge-success' :
                  selectedHook.status === 'occupied' ? 'badge-info' :
                  selectedHook.status === 'reserved' ? 'badge-warning' :
                  selectedHook.status === 'retrieving' ? 'badge-info' : 'badge-neutral'
                }`}>
                  {selectedHook.status}
                </span>
                {selectedHook.is_vip && (
                  <span className="badge badge-vip">
                    <Star size={10} /> VIP
                  </span>
                )}
              </div>

              {selectedHook.status === 'occupied' && selectedHook.license_plate && (
                <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
                  <div className="flex items-center gap-sm text-muted mb-sm" style={{ fontSize: '0.75rem' }}>
                    <Car size={14} />
                    Vehicle Info
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                    {selectedHook.make || 'Unknown'} {selectedHook.model || ''}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.875rem', marginTop: 4 }}>
                    {selectedHook.license_plate}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                    {selectedHook.color || 'Unknown color'}
                  </div>
                  
                  {selectedHook.unique_card_id && (
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--color-border)' }}>
                      Card: {selectedHook.unique_card_id}
                    </div>
                  )}

                  {selectedHook.has_photos && (
                    <button className="btn btn-outline btn-sm mt-md w-full">
                      <Camera size={14} />
                      View Photos
                    </button>
                  )}
                </div>
              )}

              {selectedHook.status === 'available' && (
                <div className="text-center" style={{ padding: 'var(--space-xl)' }}>
                  <div style={{ 
                    width: 64, 
                    height: 64, 
                    background: 'var(--color-success-light)', 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-md)',
                  }}>
                    <Key size={28} style={{ color: 'var(--color-success)' }} />
                  </div>
                  <p className="text-muted">This hook is available</p>
                </div>
              )}

              {showHeatmap && (
                <div className="mt-md pt-md" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Usage (last 30 days): <strong>{heatmapData[selectedHook.hook_number] || 0}</strong> times
                  </div>
                </div>
              )}
            </div>

            {selectedHook.status !== 'available' && (
              <div className="modal-footer">
                <button 
                  className="btn btn-error"
                  onClick={() => handleReleaseHook(selectedHook.hook_number)}
                >
                  Release Hook
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
