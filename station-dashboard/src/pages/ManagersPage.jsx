import { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Trash2, Edit2, 
  CheckCircle, XCircle, Shield, RefreshCw,
  Mail, Phone, Building
} from 'lucide-react';

const API_BASE_URL = 'http://192.168.12.154:4000/api';

export default function ManagersPage() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/managers`);
      const data = await response.json();
      setManagers(data.managers || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (managerId, managerName) => {
    if (!confirm(`Remove ${managerName} from the system? They will no longer be able to access the station dashboard.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/managers/${managerId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchManagers();
      } else {
        alert('Failed to delete manager');
      }
    } catch (error) {
      console.error('Error deleting manager:', error);
      alert('Failed to delete manager');
    }
  };

  const handleToggleStatus = async (managerId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      await fetch(`${API_BASE_URL}/managers/${managerId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchManagers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredManagers = managers.filter(m => 
    (m.full_name || m.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = managers.filter(m => m.status === 'active').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f1f5f9' }}>Station Managers</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{activeCount} active managers</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search managers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 12px 8px 40px',
                color: '#f1f5f9',
                width: '240px',
              }}
            />
          </div>
          <button 
            onClick={fetchManagers}
            style={{
              background: '#334155',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#f1f5f9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => { setEditingManager(null); setShowModal(true); }}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
            }}
          >
            <Plus size={18} />
            Add Manager
          </button>
        </div>
      </div>

      {/* Managers Table */}
      <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.875rem' }}>Manager</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.875rem' }}>Contact</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.875rem' }}>Venue</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, fontSize: '0.875rem' }}>Last Login</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#94a3b8', fontWeight: 500, fontSize: '0.875rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredManagers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                  <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <p>No managers found</p>
                  <button 
                    onClick={() => setShowModal(true)}
                    style={{
                      background: '#3b82f6',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      color: 'white',
                      cursor: 'pointer',
                      marginTop: '16px',
                    }}
                  >
                    Add First Manager
                  </button>
                </td>
              </tr>
            ) : (
              filteredManagers.map((manager) => (
                <tr key={manager.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                      }}>
                        {(manager.full_name || manager.username || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 500 }}>{manager.full_name || manager.username}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>@{manager.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {manager.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.875rem' }}>
                          <Mail size={14} />
                          {manager.email}
                        </div>
                      )}
                      {manager.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.875rem' }}>
                          <Phone size={14} />
                          {manager.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                      <Building size={14} />
                      {manager.venue_name || 'All Venues'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: manager.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: manager.status === 'active' ? '#22c55e' : '#ef4444',
                    }}>
                      {manager.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {manager.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#64748b', fontSize: '0.875rem' }}>
                    {manager.last_login ? new Date(manager.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleStatus(manager.id, manager.status)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          color: manager.status === 'active' ? '#ef4444' : '#22c55e',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        {manager.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { setEditingManager(manager); setShowModal(true); }}
                        style={{
                          background: 'transparent',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '6px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(manager.id, manager.full_name || manager.username)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '6px',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ManagerModal 
          manager={editingManager}
          onClose={() => { setShowModal(false); setEditingManager(null); }}
          onSuccess={() => { setShowModal(false); setEditingManager(null); fetchManagers(); }}
        />
      )}
    </div>
  );
}

function ManagerModal({ manager, onClose, onSuccess }) {
  const isEdit = !!manager;
  const [formData, setFormData] = useState({
    username: manager?.username || '',
    password: '',
    fullName: manager?.full_name || '',
    email: manager?.email || '',
    phone: manager?.phone || '',
    venueId: manager?.venue_id || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEdit 
        ? `${API_BASE_URL}/managers/${manager.id}`
        : `${API_BASE_URL}/managers`;
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const body = isEdit
        ? { fullName: formData.fullName, email: formData.email, phone: formData.phone, venueId: formData.venueId }
        : { ...formData };

      if (!isEdit && !formData.password) {
        setError('Password is required');
        setLoading(false);
        return;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '1.125rem', fontWeight: 600 }}>
            {isEdit ? 'Edit Manager' : 'Add New Manager'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={16} />
                {error}
              </div>
            )}

            {!isEdit && (
              <>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '6px' }}>Username *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#f1f5f9',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '6px' }}>Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#f1f5f9',
                    }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '6px' }}>Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#f1f5f9',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#f1f5f9',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '6px' }}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#f1f5f9',
                }}
              />
            </div>
          </div>

          <div style={{ padding: '20px', borderTop: '1px solid #334155', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Manager')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

