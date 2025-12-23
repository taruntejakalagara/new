import { useState, useEffect, useRef } from 'react';
import { 
  Activity, Car, Clock, CheckCircle, XCircle, 
  Users, ArrowRight, RefreshCw, Pause, Play,
  AlertTriangle, Filter
} from 'lucide-react';
import { API_BASE_URL, REFRESH_INTERVALS } from '../config/api';

function ActivityItem({ activity, isNew }) {
  const icons = {
    checkin: { icon: Car, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Check In' },
    request: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Request' },
    assigned: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Assigned' },
    ready: { icon: CheckCircle, color: 'text-indigo-400', bg: 'bg-indigo-500/20', label: 'Ready' },
    complete: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Complete' },
    cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelled' },
    error: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Error' },
  };

  const config = icons[activity.type] || icons.checkin;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-4 p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${isNew ? 'animate-slide-in bg-slate-800/50' : ''}`}>
      <div className={`p-2.5 rounded-xl ${config.bg}`}>
        <Icon size={20} className={config.color} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`badge ${config.bg} ${config.color}`}>{config.label}</span>
          <span className="text-xs text-slate-500">{activity.venue}</span>
        </div>
        <p className="text-sm text-white">{activity.message}</p>
        {activity.details && (
          <p className="text-xs text-slate-500 mt-1">{activity.details}</p>
        )}
      </div>
      
      <div className="text-right">
        <p className="text-xs text-slate-500">{activity.time}</p>
        {activity.duration && (
          <p className="text-xs text-slate-400 mt-1">{activity.duration}</p>
        )}
      </div>
    </div>
  );
}

function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="card p-3 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/20">
          <Car size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">{stats.checkIns}</p>
          <p className="text-xs text-slate-500">Check-ins today</p>
        </div>
      </div>
      <div className="card p-3 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Clock size={18} className="text-amber-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">{stats.pending}</p>
          <p className="text-xs text-slate-500">Pending requests</p>
        </div>
      </div>
      <div className="card p-3 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <CheckCircle size={18} className="text-blue-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">{stats.completed}</p>
          <p className="text-xs text-slate-500">Completed today</p>
        </div>
      </div>
      <div className="card p-3 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/20">
          <Activity size={18} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">{stats.avgWait}m</p>
          <p className="text-xs text-slate-500">Avg wait time</p>
        </div>
      </div>
    </div>
  );
}

export default function LiveFeedPage() {
  const [activities, setActivities] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ checkIns: 0, pending: 0, completed: 0, avgWait: 0 });
  const lastIdRef = useRef(0);

  const fetchActivity = async () => {
    if (isPaused) return;
    
    try {
      // Fetch vehicles
      const vehiclesRes = await fetch(`${API_BASE_URL}/vehicles`);
      const vehiclesData = await vehiclesRes.json();
      const vehicles = vehiclesData.vehicles || [];
      
      // Fetch queue
      const queueRes = await fetch(`${API_BASE_URL}/queue`);
      const queueData = await queueRes.json();
      const requests = queueData.requests || [];
      
      // Fetch stats
      const statsRes = await fetch(`${API_BASE_URL}/stats`);
      const statsData = await statsRes.json();
      
      // Update stats
      setStats({
        checkIns: vehicles.filter(v => {
          const checkIn = new Date(v.check_in_time);
          const today = new Date();
          return checkIn.toDateString() === today.toDateString();
        }).length,
        pending: requests.filter(r => r.status === 'pending').length,
        completed: requests.filter(r => r.status === 'completed').length,
        avgWait: statsData.stats?.avgWaitTime || statsData.avgWaitTime || 0,
      });
      
      // Build activity list
      const newActivities = [];
      
      vehicles.forEach(v => {
        newActivities.push({
          id: `v-${v.id}`,
          type: 'checkin',
          message: `${v.make || 'Vehicle'} ${v.model || ''} checked in`,
          details: `License: ${v.license_plate || 'N/A'} • Hook: ${v.hook_number || 'N/A'}`,
          venue: 'Fairmont Pittsburgh',
          time: formatTime(v.check_in_time),
          timestamp: new Date(v.check_in_time).getTime(),
        });
      });
      
      requests.forEach(r => {
        newActivities.push({
          id: `r-${r.id}`,
          type: r.status,
          message: `Retrieval ${r.status} for card ${r.unique_card_id?.slice(0, 15) || 'unknown'}...`,
          details: r.assigned_driver_id ? `Driver assigned` : null,
          venue: 'Fairmont Pittsburgh',
          time: formatTime(r.requested_at),
          timestamp: new Date(r.requested_at).getTime(),
        });
      });
      
      // Sort by timestamp descending
      newActivities.sort((a, b) => b.timestamp - a.timestamp);
      
      setActivities(newActivities.slice(0, 50));
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, REFRESH_INTERVALS.LIVE_FEED);
    return () => clearInterval(interval);
  }, [isPaused]);

  const filteredActivities = activities.filter(a => 
    filter === 'all' || a.type === filter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Live Activity Feed
            <span className="flex items-center gap-1.5 text-sm font-normal text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot"></span>
              {isPaused ? 'Paused' : 'Live'}
            </span>
          </h1>
          <p className="text-slate-500">Real-time activity across all venues</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`btn ${isPaused ? 'btn-success' : 'btn-warning'}`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={fetchActivity} className="btn btn-ghost">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-slate-500" />
        {['all', 'checkin', 'request', 'assigned', 'ready', 'complete'].map((f) => (
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

      {/* Activity Feed */}
      <div className="card overflow-hidden">
        <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                isNew={index === 0}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Activity size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No activity</h3>
              <p className="text-slate-500">Activity will appear here in real-time</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
