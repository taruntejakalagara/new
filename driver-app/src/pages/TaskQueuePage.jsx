import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Car, ArrowLeft, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

// Check for active task
const getActiveTask = () => {
  try {
    const saved = localStorage.getItem('activeRetrievalTask');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export default function TaskQueuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'retrieval';
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    fetchTasks();
    checkActiveTask();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [type]);

  const checkActiveTask = () => {
    const task = getActiveTask();
    setActiveTask(task);
  };

  const fetchTasks = async () => {
    try {
      const endpoint = type === 'retrieval' 
        ? `${API_BASE_URL}/queue` 
        : `${API_BASE_URL}/pending-handovers`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        const dataKey = type === 'retrieval' ? 'requests' : 'handovers';
        setTasks(data[dataKey] || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    checkActiveTask();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleAccept = async (task) => {
    // Check if there's already an active task
    if (activeTask) {
      alert('You already have an active task. Complete it first before accepting a new one.');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/queue/${task.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: localStorage.getItem('driverId') }),
      });
      
      navigate('/retrieval-flow', { state: { request: task } });
    } catch (error) {
      console.error('Error accepting task:', error);
      alert('Failed to accept task');
    }
  };

  const getWaitTime = (requestedAt) => {
    if (!requestedAt) return null;
    const minutes = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const pageTitle = type === 'retrieval' ? 'Retrieval Queue' : 'Pending Handovers';
  const hasActiveTask = !!activeTask;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-icon btn-ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="mb-0">{pageTitle}</h1>
          <p style={{ fontSize: '0.875rem' }}>
            {tasks.length} {tasks.length === 1 ? 'request' : 'requests'}
          </p>
        </div>
        <button 
          className="btn btn-icon btn-ghost" 
          onClick={handleRefresh}
        >
          <RefreshCw size={20} className={refreshing ? 'spinner' : ''} />
        </button>
      </div>

      {/* Active Task Warning */}
      {hasActiveTask && type === 'retrieval' && (
        <div 
          className="alert mb-md"
          style={{ 
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--color-warning)',
          }}
        >
          <AlertCircle size={18} />
          <span>You have an active task. Complete it before accepting new ones.</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-sm mb-lg">
        <button
          onClick={() => navigate('/tasks?type=retrieval')}
          className={`btn flex-1 ${type === 'retrieval' ? 'btn-primary' : 'btn-outline'}`}
        >
          <ClipboardList size={18} />
          Queue
        </button>
        <button
          onClick={() => navigate('/tasks?type=handover')}
          className={`btn flex-1 ${type === 'handover' ? 'btn-primary' : 'btn-outline'}`}
        >
          <Clock size={18} />
          Handovers
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner spinner-lg" style={{ color: 'var(--color-accent)' }} />
        </div>
      ) : tasks.length === 0 ? (
        /* Empty State */
        <div className="empty-state fade-in">
          <div className="empty-state-icon">
            <ClipboardList size={32} />
          </div>
          <h3 className="mb-sm">No Active Tasks</h3>
          <p>
            {type === 'retrieval' 
              ? 'New retrieval requests will appear here'
              : 'Completed retrievals ready for handover will appear here'
            }
          </p>
        </div>
      ) : (
        /* Task List */
        <div className="flex flex-col gap-md">
          {tasks.map((task, index) => (
            <div 
              key={task.id} 
              className="card card-compact slide-up"
              style={{ 
                animationDelay: `${index * 0.05}s`,
                opacity: hasActiveTask && type === 'retrieval' ? 0.6 : 1,
              }}
            >
              {/* Vehicle Info */}
              <div className="flex items-start gap-md mb-md">
                <div className="vehicle-icon">
                  <Car size={24} />
                </div>
                <div className="flex-1">
                  <div className="vehicle-name">
                    {task.make || 'Unknown'} {task.model || ''}
                  </div>
                  <div className="vehicle-details">
                    {task.color && `${task.color} • `}
                    <span className="vehicle-plate">{task.license_plate}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div 
                    className="hook-number hook-number-sm"
                    style={{ fontSize: '2rem', lineHeight: 1 }}
                  >
                    #{task.hook_number}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Hook
                  </div>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between mb-md">
                {/* Payment Badge */}
                <div className={`payment-badge ${task.payment_method === 'online' ? 'payment-badge-online' : 'payment-badge-cash'}`}>
                  {task.payment_method === 'online' ? '💳 Paid' : '💵 Cash'} 
                  {task.amount && ` • $${task.amount.toFixed(2)}`}
                </div>

                {/* Wait Time */}
                {task.requested_at && (
                  <div className="flex items-center gap-xs text-muted" style={{ fontSize: '0.875rem' }}>
                    <Clock size={14} />
                    {getWaitTime(task.requested_at)}
                  </div>
                )}
              </div>

              {/* Priority Badge */}
              {task.is_priority && (
                <div className="alert alert-warning mb-md" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                  <span>⚡ Priority Request</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => type === 'retrieval' ? handleAccept(task) : navigate('/retrieval-flow', { state: { request: task } })}
                disabled={hasActiveTask && type === 'retrieval'}
                className={`btn btn-lg btn-block ${type === 'retrieval' ? 'btn-primary' : 'btn-success'}`}
                style={{
                  opacity: hasActiveTask && type === 'retrieval' ? 0.5 : 1,
                  cursor: hasActiveTask && type === 'retrieval' ? 'not-allowed' : 'pointer',
                }}
              >
                {type === 'retrieval' 
                  ? (hasActiveTask ? 'Complete Active Task First' : 'Accept Task')
                  : 'Complete Handover'
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
