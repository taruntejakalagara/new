import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, ClipboardList, Clock, LogOut, 
  ChevronRight, Smartphone, RefreshCw, AlertCircle, Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

// Helper to get/set active task in localStorage
const getLocalActiveTask = () => {
  try {
    const saved = localStorage.getItem('activeRetrievalTask');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveLocalActiveTask = (task, step, vehicle) => {
  const activeTask = {
    task,
    step,
    vehicle,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem('activeRetrievalTask', JSON.stringify(activeTask));
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { driver, logout } = useAuth();
  const { theme } = useTheme();
  
  const [stats, setStats] = useState({
    completedToday: 0,
    activeTasks: 0,
    pendingHandovers: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [myAssignedTasks, setMyAssignedTasks] = useState([]);

  useEffect(() => {
    fetchStats();
    checkActiveTask();
    const interval = setInterval(() => {
      fetchStats();
      checkActiveTask();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkActiveTask = async () => {
    const driverId = localStorage.getItem('driverId');
    
    // First check localStorage
    const localTask = getLocalActiveTask();
    
    // Then fetch from server to see if driver has any assigned tasks
    try {
      const response = await fetch(`${API_BASE_URL}/queue?driverId=${driverId}`);
      const data = await response.json();
      
      if (data.success && data.requests) {
        // Find tasks assigned to this driver that are in progress
        const myTasks = data.requests.filter(r => 
          r.assigned_driver_id == driverId && 
          ['assigned', 'keys_picked', 'walking', 'driving', 'ready'].includes(r.status)
        );
        
        setMyAssignedTasks(myTasks);
        
        if (myTasks.length > 0) {
          const serverTask = myTasks[0]; // Get the most recent one
          
          // Map server status to local step
          const stepMap = {
            'assigned': 'accepted',
            'keys_picked': 'keys_picked',
            'walking': 'walking_to_car',
            'driving': 'driving_to_valet',
            'ready': 'car_ready',
          };
          
          const vehicle = {
            license_plate: serverTask.license_plate,
            make: serverTask.make,
            model: serverTask.model,
            color: serverTask.color,
            hook_number: serverTask.hook_number,
            parking_spot: serverTask.parking_spot,
            customer_phone: serverTask.customer_phone,
          };
          
          // Update localStorage with server data
          saveLocalActiveTask(serverTask, stepMap[serverTask.status] || 'accepted', vehicle);
          
          setActiveTask({
            task: serverTask,
            step: stepMap[serverTask.status] || 'accepted',
            vehicle,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
    }
    
    // Fall back to localStorage if server fetch fails
    if (localTask) {
      setActiveTask(localTask);
    } else {
      setActiveTask(null);
    }
  };

  const fetchStats = async () => {
    try {
      const driverId = localStorage.getItem('driverId');
      
      const [statsRes, queueRes, handoversRes] = await Promise.all([
        fetch(`${API_BASE_URL}/drivers/stats/${driverId}`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/queue`).then(r => r.json()).catch(() => ({ requests: [] })),
        fetch(`${API_BASE_URL}/pending-handovers`).then(r => r.json()).catch(() => ({ handovers: [] })),
      ]);

      // Count only pending tasks (not assigned to anyone)
      const pendingTasks = queueRes.requests?.filter(r => 
        r.status === 'pending'
      ).length || 0;

      setStats({
        completedToday: statsRes.stats?.completedToday || 0,
        activeTasks: pendingTasks,
        pendingHandovers: handoversRes.handovers?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    await checkActiveTask();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handleResumeTask = () => {
    if (activeTask) {
      navigate('/retrieval-flow', { state: { request: activeTask.task } });
    }
  };

  const ActionCard = ({ icon: Icon, title, subtitle, count, onClick, accent, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="card card-compact flex items-center gap-md w-full text-left mb-md"
      style={{ 
        background: accent ? 'var(--color-primary)' : 'var(--color-surface)',
        color: accent ? 'white' : 'inherit',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ 
          background: accent ? 'rgba(255,255,255,0.15)' : 'var(--color-surface-alt)'
        }}
      >
        <Icon size={24} style={{ color: accent ? 'white' : 'var(--color-primary)' }} />
      </div>
      
      <div className="flex-1">
        <div className="font-semibold" style={{ fontSize: '1rem' }}>{title}</div>
        <div style={{ 
          fontSize: '0.875rem', 
          opacity: accent ? 0.8 : 0.6 
        }}>
          {subtitle}
        </div>
      </div>

      {count > 0 ? (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
          style={{ 
            background: accent ? 'white' : 'var(--color-accent)',
            color: accent ? 'var(--color-primary)' : 'white',
            fontSize: '0.875rem'
          }}
        >
          {count}
        </div>
      ) : (
        <ChevronRight size={20} style={{ opacity: 0.4 }} />
      )}
    </button>
  );

  // Check if driver has an active task
  const hasActiveTask = !!activeTask;

  return (
    <div className="page">
      {/* Header */}
      <div className="flex justify-between items-start mb-lg fade-in">
        <div>
          <h1 className="mb-xs">Welcome back</h1>
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>
            {driver?.fullName || 'Driver'}
          </p>
        </div>
        
        <div className="flex gap-sm">
          <button 
            className="btn btn-icon btn-ghost" 
            onClick={handleRefresh}
            style={{ width: 44, height: 44, minHeight: 44 }}
          >
            <RefreshCw 
              size={20} 
              className={refreshing ? 'spinner' : ''} 
            />
          </button>
          <button 
            className="btn btn-icon btn-ghost" 
            onClick={handleLogout}
            style={{ width: 44, height: 44, minHeight: 44 }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Active Task Banner */}
      {hasActiveTask && (
        <div 
          className="card mb-lg slide-up"
          style={{ 
            background: 'linear-gradient(135deg, var(--color-warning) 0%, #f97316 100%)',
            color: 'white',
            padding: 'var(--space-md)',
          }}
        >
          <div className="flex items-center gap-md">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <div className="font-bold">Active Task In Progress</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                {activeTask.vehicle?.license_plate || 'Vehicle'} • Hook #{activeTask.vehicle?.hook_number}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'capitalize' }}>
                Status: {activeTask.step?.replace(/_/g, ' ') || activeTask.task?.status}
              </div>
            </div>
            <button 
              onClick={handleResumeTask}
              className="btn"
              style={{ 
                background: 'white', 
                color: 'var(--color-warning)',
                minHeight: 40,
              }}
            >
              <Play size={18} />
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex gap-md mb-lg slide-up">
        <div className="card card-compact flex-1 text-center">
          <div 
            className="font-display font-bold mb-xs"
            style={{ fontSize: '2rem', color: 'var(--color-success)' }}
          >
            {stats.completedToday}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Completed
          </div>
        </div>
        
        <div className="card card-compact flex-1 text-center">
          <div 
            className="font-display font-bold mb-xs"
            style={{ fontSize: '2rem', color: 'var(--color-warning)' }}
          >
            {stats.activeTasks}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            In Queue
          </div>
        </div>
        
        <div className="card card-compact flex-1 text-center">
          <div 
            className="font-display font-bold mb-xs"
            style={{ fontSize: '2rem', color: 'var(--color-accent)' }}
          >
            {stats.pendingHandovers}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Handovers
          </div>
        </div>
      </div>

      {/* Primary Action */}
      <div className="mb-md slide-up" style={{ animationDelay: '0.1s' }}>
        <ActionCard
          icon={Smartphone}
          title="Check In Vehicle"
          subtitle={hasActiveTask ? "Complete active task first" : "Tap NFC card to start"}
          onClick={() => navigate('/nfc-checkin')}
          accent={!hasActiveTask}
          disabled={hasActiveTask}
        />
      </div>

      {/* Secondary Actions */}
      <div className="slide-up" style={{ animationDelay: '0.2s' }}>
        <ActionCard
          icon={ClipboardList}
          title="Retrieval Queue"
          subtitle={hasActiveTask ? "Complete active task first" : "View pending requests"}
          count={hasActiveTask ? 0 : stats.activeTasks}
          onClick={() => navigate('/tasks?type=retrieval')}
          disabled={hasActiveTask}
        />

        <ActionCard
          icon={Clock}
          title="Pending Handovers"
          subtitle="Complete customer pickups"
          count={stats.pendingHandovers}
          onClick={() => navigate('/pending-handovers')}
        />

        <ActionCard
          icon={Car}
          title="NFC Quick Retrieve"
          subtitle={hasActiveTask ? "Complete active task first" : "Scan card to retrieve"}
          onClick={() => navigate('/nfc-retrieval')}
          disabled={hasActiveTask}
        />
      </div>

      {/* Venue Badge */}
      <div className="text-center mt-lg" style={{ paddingTop: 'var(--space-lg)' }}>
        <div 
          className="badge badge-info"
          style={{ background: 'var(--color-surface-alt)' }}
        >
          {theme.name}
        </div>
      </div>
    </div>
  );
}
