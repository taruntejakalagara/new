import { useState, useEffect } from 'react';
import { 
  AlertTriangle, AlertCircle, CheckCircle, XCircle,
  Clock, Car, Users, Wifi, WifiOff, RefreshCw,
  ChevronRight, X, Wrench
} from 'lucide-react';
import { API_BASE_URL, ALERT_THRESHOLDS } from '../config/api';

function AlertCard({ alert, onDismiss, onFix }) {
  const severityConfig = {
    critical: { 
      bg: 'bg-red-500/10', 
      border: 'border-red-500/30',
      icon: XCircle, 
      iconColor: 'text-red-400',
      badge: 'badge-error'
    },
    warning: { 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/30',
      icon: AlertTriangle, 
      iconColor: 'text-amber-400',
      badge: 'badge-warning'
    },
    info: { 
      bg: 'bg-blue-500/10', 
      border: 'border-blue-500/30',
      icon: AlertCircle, 
      iconColor: 'text-blue-400',
      badge: 'badge-info'
    },
  };

  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`rounded-xl p-4 ${config.bg} border ${config.border} ${alert.isNew ? 'animate-slide-in' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon size={24} className={config.iconColor} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${config.badge}`}>{alert.severity}</span>
            <span className="text-xs text-slate-500">{alert.time}</span>
          </div>
          <h4 className="font-medium text-white mb-1">{alert.title}</h4>
          <p className="text-sm text-slate-400">{alert.message}</p>
          
          {alert.details && (
            <div className="mt-3 p-2 rounded-lg bg-slate-900/50 text-xs text-slate-500 font-mono">
              {alert.details}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {alert.canFix && (
            <button 
              onClick={() => onFix(alert)}
              className="btn btn-primary text-sm py-1.5"
            >
              <Wrench size={14} />
              Fix
            </button>
          )}
          <button 
            onClick={() => onDismiss(alert.id)}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, onClick, variant = 'default' }) {
  const variants = {
    default: 'hover:bg-slate-800',
    danger: 'hover:bg-red-500/20',
    success: 'hover:bg-emerald-500/20',
  };

  return (
    <button 
      onClick={onClick}
      className={`card card-hover p-4 text-left w-full ${variants[variant]}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-700">
          <Icon size={20} className="text-slate-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-white">{label}</h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <ChevronRight size={18} className="text-slate-600" />
      </div>
    </button>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const checkForAlerts = async () => {
    try {
      const newAlerts = [];
      
      // Check API health
      try {
        const healthRes = await fetch(`${API_BASE_URL}/health`);
        if (!healthRes.ok) {
          newAlerts.push({
            id: 'api-down',
            severity: 'critical',
            title: 'API Server Unreachable',
            message: 'Cannot connect to the backend server. All services may be affected.',
            time: 'Just now',
            canFix: true,
          });
        }
      } catch (e) {
        newAlerts.push({
          id: 'api-error',
          severity: 'critical',
          title: 'API Connection Error',
          message: e.message,
          time: 'Just now',
          canFix: true,
        });
      }

      // Check queue length
      try {
        const queueRes = await fetch(`${API_BASE_URL}/queue`);
        const queueData = await queueRes.json();
        const pendingCount = (queueData.requests || []).filter(r => r.status === 'pending').length;
        
        if (pendingCount >= ALERT_THRESHOLDS.HIGH_QUEUE_COUNT) {
          newAlerts.push({
            id: 'high-queue',
            severity: 'warning',
            title: 'High Queue Volume',
            message: `${pendingCount} retrieval requests pending. Consider adding more drivers.`,
            time: 'Just now',
            canFix: false,
          });
        }
      } catch (e) {
        console.error('Queue check failed:', e);
      }

      // Check for long wait times
      try {
        const statsRes = await fetch(`${API_BASE_URL}/stats`);
        const statsData = await statsRes.json();
        const avgWait = statsData.stats?.avgWaitTime || statsData.avgWaitTime || 0;
        
        if (avgWait > ALERT_THRESHOLDS.LONG_WAIT_MINUTES) {
          newAlerts.push({
            id: 'long-wait',
            severity: 'warning',
            title: 'Long Wait Times',
            message: `Average wait time is ${avgWait} minutes, above the ${ALERT_THRESHOLDS.LONG_WAIT_MINUTES} minute threshold.`,
            time: 'Just now',
            canFix: false,
          });
        }
      } catch (e) {
        console.error('Stats check failed:', e);
      }

      // Check hooks availability
      try {
        const hooksRes = await fetch(`${API_BASE_URL}/hooks`);
        const hooksData = await hooksRes.json();
        const hooks = hooksData.hooks || [];
        const available = hooks.filter(h => h.status === 'available').length;
        const total = hooks.length || 50;
        const availablePercent = (available / total) * 100;
        
        if (availablePercent < ALERT_THRESHOLDS.LOW_HOOKS_PERCENT) {
          newAlerts.push({
            id: 'low-hooks',
            severity: 'warning',
            title: 'Low Hook Availability',
            message: `Only ${available} of ${total} hooks available (${Math.round(availablePercent)}%)`,
            time: 'Just now',
            canFix: false,
          });
        }
      } catch (e) {
        console.error('Hooks check failed:', e);
      }

      // If no alerts, add a success message
      if (newAlerts.length === 0) {
        newAlerts.push({
          id: 'all-good',
          severity: 'info',
          title: 'All Systems Operational',
          message: 'No issues detected. All services running normally.',
          time: 'Just now',
          canFix: false,
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error checking alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkForAlerts();
    const interval = setInterval(checkForAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const handleFix = async (alert) => {
    if (alert.id === 'api-down' || alert.id === 'api-error') {
      // Try to reconnect
      checkForAlerts();
    }
  };

  const clearStuckRequests = async () => {
    if (!confirm('This will cancel all pending requests. Continue?')) return;
    
    try {
      // API call to clear stuck requests
      alert('Stuck requests cleared (API endpoint needed)');
    } catch (e) {
      alert('Failed to clear requests: ' + e.message);
    }
  };

  const filteredAlerts = alerts.filter(a => 
    filter === 'all' || a.severity === filter
  );

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts & Issues</h1>
          <p className="text-slate-500">System health and troubleshooting</p>
        </div>
        <button onClick={checkForAlerts} className="btn btn-ghost">
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <XCircle size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{criticalCount}</p>
            <p className="text-xs text-slate-500">Critical</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{warningCount}</p>
            <p className="text-xs text-slate-500">Warnings</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <CheckCircle size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{criticalCount === 0 && warningCount === 0 ? 'Yes' : 'No'}</p>
            <p className="text-xs text-slate-500">All Clear</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {['all', 'critical', 'warning', 'info'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === f 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-500 mt-4">Checking systems...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert} 
                  onDismiss={handleDismiss}
                  onFix={handleFix}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-white">Quick Actions</h3>
          <div className="space-y-2">
            <QuickAction
              icon={RefreshCw}
              label="Restart Services"
              description="Restart the backend server"
              onClick={() => alert('Restart API endpoint needed')}
            />
            <QuickAction
              icon={XCircle}
              label="Clear Stuck Requests"
              description="Cancel all pending retrievals"
              onClick={clearStuckRequests}
              variant="danger"
            />
            <QuickAction
              icon={Wifi}
              label="Test Connection"
              description="Verify API connectivity"
              onClick={checkForAlerts}
              variant="success"
            />
            <QuickAction
              icon={Clock}
              label="Reset Wait Times"
              description="Clear wait time statistics"
              onClick={() => alert('Reset endpoint needed')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
