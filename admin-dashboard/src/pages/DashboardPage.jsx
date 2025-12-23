import { useState, useEffect } from 'react';
import { 
  Car, Users, Clock, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Activity, ArrowUpRight,
  Building2, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS } from '../config/api';

function StatCard({ title, value, change, icon: Icon, color, subtext }) {
  const colorClasses = {
    indigo: 'bg-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon size={22} />
        </div>
        {change && (
          <span className={`text-xs font-medium flex items-center gap-1 ${change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <ArrowUpRight size={14} className={change < 0 ? 'rotate-180' : ''} />
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <h3 className="text-slate-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}

function VenueCard({ venue, stats, isOnline }) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
            <Building2 size={20} className="text-slate-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">{venue.name}</h4>
            <p className="text-xs text-slate-500">{venue.shortName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'status-online' : 'status-offline'}`}></span>
          <span className="text-xs text-slate-500">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <p className="text-lg font-bold text-white">{stats?.parked || 0}</p>
          <p className="text-xs text-slate-500">Parked</p>
        </div>
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <p className="text-lg font-bold text-amber-400">{stats?.queue || 0}</p>
          <p className="text-xs text-slate-500">Queue</p>
        </div>
        <div className="text-center p-2 bg-slate-900/50 rounded-lg">
          <p className="text-lg font-bold text-emerald-400">{stats?.drivers || 0}</p>
          <p className="text-xs text-slate-500">Drivers</p>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }) {
  const icons = {
    checkin: { icon: Car, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    request: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    complete: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    login: { icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  const config = icons[activity.type] || icons.checkin;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-lg transition-colors animate-slide-in">
      <div className={`p-2 rounded-lg ${config.bg}`}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{activity.message}</p>
        <p className="text-xs text-slate-500">{activity.venue} • {activity.time}</p>
      </div>
    </div>
  );
}

function SystemHealth({ health }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">System Health</h3>
        <span className={`badge ${health.status === 'healthy' ? 'badge-success' : 'badge-error'}`}>
          {health.status === 'healthy' ? 'All Systems Go' : 'Issues Detected'}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-slate-500" />
            <span className="text-sm text-slate-400">API Server</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${health.api ? 'status-online' : 'status-offline'}`}></span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-slate-500" />
            <span className="text-sm text-slate-400">Database</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${health.database ? 'status-online' : 'status-offline'}`}></span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-slate-500" />
            <span className="text-sm text-slate-400">Response Time</span>
          </div>
          <span className="text-sm text-slate-400">{health.responseTime}ms</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeDrivers: 0,
    pendingRequests: 0,
    avgWaitTime: 0,
  });
  const [venues, setVenues] = useState([]);
  const [activities, setActivities] = useState([]);
  const [health, setHealth] = useState({ status: 'checking', api: false, database: false, responseTime: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch overall stats
  const fetchStats = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/stats`);
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.success) {
        setStats({
          totalVehicles: data.stats?.totalParked || data.totalParked || 0,
          activeDrivers: data.stats?.activeDrivers || data.activeDrivers || 0,
          pendingRequests: data.stats?.pendingRequests || data.pendingRequests || 0,
          avgWaitTime: data.stats?.avgWaitTime || data.avgWaitTime || 0,
        });
      }
      
      setHealth(prev => ({ ...prev, api: true, database: true, responseTime, status: 'healthy' }));
      setIsConnected(true);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
      setHealth(prev => ({ ...prev, api: false, status: 'unhealthy' }));
      setIsConnected(false);
    }
  };

  // Fetch venues
  const fetchVenues = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/venues`);
      const data = await response.json();
      if (data.success && data.venues) {
        setVenues(data.venues);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  // Fetch recent activity
  const fetchActivity = async () => {
    try {
      // Fetch vehicles for check-ins
      const vehiclesRes = await fetch(`${API_BASE_URL}/vehicles`);
      const vehiclesData = await vehiclesRes.json();
      
      // Fetch queue for requests
      const queueRes = await fetch(`${API_BASE_URL}/queue`);
      const queueData = await queueRes.json();
      
      // Combine into activity feed
      const newActivities = [];
      
      // Add recent vehicles
      const vehicles = vehiclesData.vehicles || [];
      vehicles.slice(0, 3).forEach(v => {
        newActivities.push({
          id: `v-${v.id}`,
          type: 'checkin',
          message: `${v.make || 'Vehicle'} ${v.model || ''} checked in (${v.license_plate || 'No plate'})`,
          venue: 'Fairmont',
          time: formatTime(v.check_in_time),
        });
      });
      
      // Add queue items
      const requests = queueData.requests || [];
      requests.slice(0, 3).forEach(r => {
        newActivities.push({
          id: `r-${r.id}`,
          type: r.status === 'pending' ? 'request' : 'complete',
          message: `Retrieval ${r.status} for ${r.unique_card_id?.slice(0, 12) || 'unknown'}`,
          venue: 'Fairmont',
          time: formatTime(r.requested_at),
        });
      });
      
      setActivities(newActivities.slice(0, 6));
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchStats();
    fetchVenues();
    fetchActivity();

    const statsInterval = setInterval(fetchStats, REFRESH_INTERVALS.STATS);
    const activityInterval = setInterval(fetchActivity, REFRESH_INTERVALS.LIVE_FEED);
    const venuesInterval = setInterval(fetchVenues, REFRESH_INTERVALS.VENUES);

    return () => {
      clearInterval(statsInterval);
      clearInterval(activityInterval);
      clearInterval(venuesInterval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500">Real-time overview of all venues</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-2 text-sm ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Updated {formatTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Vehicles Parked"
          value={stats.totalVehicles}
          icon={Car}
          color="indigo"
          subtext="Across all venues"
        />
        <StatCard
          title="Active Drivers"
          value={stats.activeDrivers}
          icon={Users}
          color="emerald"
          subtext="Currently online"
        />
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          icon={Clock}
          color="amber"
          subtext="In queue"
        />
        <StatCard
          title="Avg Wait Time"
          value={`${stats.avgWaitTime || 0}m`}
          icon={TrendingUp}
          color="indigo"
          subtext="Last hour"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venues */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Venues</h2>
            <button className="btn btn-ghost text-sm">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.length > 0 ? (
              venues.map((venue, index) => (
                <VenueCard
                  key={venue.id || index}
                  venue={venue}
                  stats={{ parked: stats.totalVehicles, queue: stats.pendingRequests, drivers: stats.activeDrivers }}
                  isOnline={isConnected}
                />
              ))
            ) : (
              <VenueCard
                venue={{ name: 'Fairmont Pittsburgh', shortName: 'Fairmont' }}
                stats={{ parked: stats.totalVehicles, queue: stats.pendingRequests, drivers: stats.activeDrivers }}
                isOnline={isConnected}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* System Health */}
          <SystemHealth health={health} />

          {/* Live Activity */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">Live Activity</h3>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot"></span>
                Live
              </span>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <p className="text-center text-slate-500 py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
