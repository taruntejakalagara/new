import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit2, Trash2, Check, X, RefreshCw,
  Shield, ShieldOff, AlertCircle, CheckCircle, Search
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function ManagersPage() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'manager',
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/managers`);
      const data = await response.json();
      if (data.success) {
        setManagers(data.managers || []);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      showMessage('error', 'Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const openCreateModal = () => {
    setEditingManager(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'manager',
    });
    setShowModal(true);
  };

  const openEditModal = (manager) => {
    setEditingManager(manager);
    setFormData({
      username: manager.username,
      password: '', // Don't populate password for edit
      fullName: manager.full_name || manager.fullName || '',
      email: manager.email || '',
      role: manager.role || 'manager',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingManager 
        ? `${API_BASE_URL}/managers/${editingManager.id}`
        : `${API_BASE_URL}/managers`;
      
      const method = editingManager ? 'PUT' : 'POST';
      
      // Don't send empty password on edit
      const payload = { ...formData };
      if (editingManager && !payload.password) {
        delete payload.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', editingManager ? 'Manager updated!' : 'Manager created!');
        setShowModal(false);
        fetchManagers();
      } else {
        showMessage('error', data.message || 'Operation failed');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    }
  };

  const toggleStatus = async (manager) => {
    const newStatus = manager.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`${API_BASE_URL}/managers/${manager.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', `Manager ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        fetchManagers();
      } else {
        showMessage('error', data.message || 'Failed to update status');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    }
  };

  const deleteManager = async (manager) => {
    if (!confirm(`Are you sure you want to delete ${manager.full_name || manager.username}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/managers/${manager.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Manager deleted');
        fetchManagers();
      } else {
        showMessage('error', data.message || 'Failed to delete manager');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    }
  };

  const filteredManagers = managers.filter(m => 
    (m.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="spinner lg" />
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-title">
          <h1>Managers</h1>
          <p>Manage station managers and administrators</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={fetchManagers}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="btn btn-accent" onClick={openCreateModal}>
            <Plus size={18} />
            Add Manager
          </button>
        </div>
      </header>

      <div className="page-content">
        {message.text && (
          <div className={`alert alert-${message.type} mb-lg`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {message.text}
          </div>
        )}

        {/* Search */}
        <div className="card mb-lg">
          <div className="card-body">
            <div className="search-input-wrapper">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search managers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Managers Table */}
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                      No managers found
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((manager) => (
                    <tr key={manager.id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div 
                            className="avatar"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: manager.status === 'active' 
                                ? 'var(--color-accent)' 
                                : '#9ca3af',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '0.875rem',
                            }}
                          >
                            {(manager.full_name || manager.username || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: '500' }}>
                            {manager.full_name || manager.username}
                          </span>
                        </div>
                      </td>
                      <td>{manager.username}</td>
                      <td>{manager.email || '-'}</td>
                      <td>
                        <span 
                          className="badge"
                          style={{
                            background: manager.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                            color: manager.role === 'admin' ? '#1d4ed8' : '#4b5563',
                          }}
                        >
                          {manager.role || 'manager'}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="badge"
                          style={{
                            background: manager.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: manager.status === 'active' ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {manager.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-xs">
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => openEditModal(manager)}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => toggleStatus(manager)}
                            title={manager.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {manager.status === 'active' ? (
                              <ShieldOff size={16} />
                            ) : (
                              <Shield size={16} />
                            )}
                          </button>
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => deleteManager(manager)}
                            title="Delete"
                            style={{ color: '#dc2626' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingManager ? 'Edit Manager' : 'Add New Manager'}</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="jsmith"
                    required
                    disabled={!!editingManager}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editingManager ? 'New Password (leave blank to keep current)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required={!editingManager}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent">
                  {editingManager ? 'Update' : 'Create'} Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .search-input-wrapper {
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .search-input {
          padding-left: 2.75rem !important;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: white;
          border-radius: 1rem;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .modal-body {
          padding: 1.5rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </>
  );
}
