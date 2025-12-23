import { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Phone, Mail, Clock,
  CheckCircle, XCircle, MoreVertical, Car, Star
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

function DriverCard({ driver }) {
  const statusColors = {
    active: 'badge-success',
    online: 'badge-success',
    offline: 'badge-error',
    busy: 'badge-warning',
  };

  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {driver.fullName?.slice(0, 2).toUpperCase() || driver.username?.slice(0, 2).toUpperCase() || 'DR'}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-white">{driver.fullName || driver.username}</h4>
            <p className="text-xs text-slate-500">@{driver.username}</p>
          </div>
        </div>
        <span className={`badge ${statusColors[driver.status] || 'badge-info'}`}>
          {driver.status || 'Active'}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {driver.phone && (
          <div className="flex items-center gap-2 text-slate-400">
            <Phone size={14} />
            <span>{driver.phone}</span>
          </div>
        )}
        {driver.email && (
          <div className="flex items-center gap-2 text-slate-400">
            <Mail size={14} />
            <span>{driver.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-slate-400">
          <Clock size={14} />
          <span>Last login: {driver.lastLogin ? new Date(driver.lastLogin).toLocaleDateString() : 'Never'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-slate-400">
            <Car size={14} />
            <span className="text-sm">{driver.totalRetrievals || 0}</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Star size={14} />
            <span className="text-sm">{driver.rating || '5.0'}</span>
          </div>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/drivers`);
      const data = await response.json();
      if (data.success && data.drivers) {
        setDrivers(data.drivers);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = 
      d.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: drivers.length,
    online: drivers.filter(d => d.status === 'online').length,
    active: drivers.filter(d => d.status === 'active').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-slate-500">Manage valet drivers across venues</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Drivers</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Users size={24} className="text-slate-600" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Online Now</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.online}</p>
            </div>
            <CheckCircle size={24} className="text-emerald-600" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Active</p>
              <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
            </div>
            <Car size={24} className="text-blue-600" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text"
            placeholder="Search drivers by name, username, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="active">Active</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Drivers Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 mt-4">Loading drivers...</p>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <Users size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No drivers found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
