import { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
  X, CheckCircle, AlertCircle, Mail, Phone, Shield, User
} from 'lucide-react';
import { API_BASE_URL, toEST } from '../config/api';

export default function ManagersPage() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    username: '', password: '', full_name: '', email: '', phone: '', role: 'manager', venue_id: ''
  });

  useEffect(() => { fetchManagers(); }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/managers`);
      const data = await response.json();
      if (data.success) setManagers(data.managers);
      else setManagers([
        { id: 1, username: 'admin', full_name: 'Admin User', email: 'admin@valet.com', role: 'admin', status: 'active', created_at: new Date().toISOString() },
        { id: 2, username: 'manager1', full_name: 'John Manager', email: 'john@valet.com', role: 'manager', status: 'active', created_at: new Date().toISOString() }
      ]);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingManager ? `${API_BASE_URL}/managers/${editingManager.id}` : `${API_BASE_URL}/managers`;
      const response = await fetch(url, {
        method: editingManager ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: editingManager ? 'Manager updated!' : 'Manager created!' });
        fetchManagers(); closeModal();
      } else setMessage({ type: 'error', text: data.message || 'Failed' });
    } catch { setMessage({ type: 'error', text: 'Network error' }); }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const toggleStatus = async (manager) => {
    try {
      await fetch(`${API_BASE_URL}/managers/${manager.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: manager.status === 'active' ? 'inactive' : 'active' })
      });
      fetchManagers();
    } catch (error) { console.error('Error:', error); }
  };

  const deleteManager = async (id) => {
    if (!confirm('Delete this manager?')) return;
    try {
      await fetch(`${API_BASE_URL}/managers/${id}`, { method: 'DELETE' });
      fetchManagers();
      setMessage({ type: 'success', text: 'Deleted!' });
    } catch { setMessage({ type: 'error', text: 'Failed' }); }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const openModal = (manager = null) => {
    setEditingManager(manager);
    setFormData(manager ? {
      username: manager.username, password: '', full_name: manager.full_name,
      email: manager.email || '', phone: manager.phone || '', role: manager.role, venue_id: manager.venue_id || ''
    } : { username: '', password: '', full_name: '', email: '', phone: '', role: 'manager', venue_id: '' });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingManager(null); };

  const filteredManagers = managers.filter(m =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="managers-page">
      <header className="page-header">
        <div><h1>Managers</h1><p>Manage administrators and managers</p></div>
        <button className="add-btn" onClick={() => openModal()}><Plus size={18} />Add Manager</button>
      </header>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="managers-table">
        <div className="table-header">
          <span>Manager</span><span>Role</span><span>Status</span><span>Created</span><span>Actions</span>
        </div>
        {filteredManagers.map(manager => (
          <div key={manager.id} className="table-row">
            <div className="manager-info">
              <div className="avatar">{manager.full_name?.charAt(0) || 'M'}</div>
              <div><span className="name">{manager.full_name}</span><span className="username">@{manager.username}</span></div>
            </div>
            <div className={`role ${manager.role}`}><Shield size={14} />{manager.role}</div>
            <div className={`status ${manager.status}`}>{manager.status}</div>
            <div className="created">{toEST(manager.created_at)}</div>
            <div className="actions">
              <button className="action-btn" onClick={() => toggleStatus(manager)}>
                {manager.status === 'active' ? <ToggleRight size={18} className="active" /> : <ToggleLeft size={18} />}
              </button>
              <button className="action-btn" onClick={() => openModal(manager)}><Edit2 size={16} /></button>
              <button className="action-btn delete" onClick={() => deleteManager(manager.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingManager ? 'Edit' : 'Add'} Manager</h2>
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{editingManager ? 'New Password' : 'Password'}</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!editingManager} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-submit">{editingManager ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .managers-page { padding: 2rem; }
        .page-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .page-header p { color: #64748b; font-size: 0.875rem; }
        .add-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
        .message { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .message.success { background: #dcfce7; color: #16a34a; }
        .message.error { background: #fef2f2; color: #dc2626; }
        .search-bar { display: flex; align-items: center; gap: 0.75rem; background: white; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
        .search-bar svg { color: #9ca3af; }
        .search-bar input { flex: 1; border: none; outline: none; font-size: 0.9375rem; }
        .managers-table { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr; gap: 1rem; padding: 0.875rem 1.25rem; background: #f8fafc; font-weight: 600; color: #64748b; font-size: 0.8125rem; }
        .table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; align-items: center; }
        .manager-info { display: flex; align-items: center; gap: 0.75rem; }
        .avatar { width: 38px; height: 38px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
        .manager-info .name { display: block; font-weight: 500; color: #1e293b; }
        .manager-info .username { font-size: 0.8125rem; color: #64748b; }
        .role { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; text-transform: capitalize; }
        .role.admin { background: #fef3c7; color: #d97706; }
        .role.manager { background: #dbeafe; color: #2563eb; }
        .status { padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; width: fit-content; }
        .status.active { background: #dcfce7; color: #16a34a; }
        .status.inactive { background: #f1f5f9; color: #64748b; }
        .created { font-size: 0.8125rem; color: #64748b; }
        .actions { display: flex; gap: 0.5rem; }
        .action-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; border-radius: 6px; color: #64748b; cursor: pointer; }
        .action-btn:hover { background: #e2e8f0; color: #1e293b; }
        .action-btn .active { color: #22c55e; }
        .action-btn.delete:hover { background: #fef2f2; color: #dc2626; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal { background: white; border-radius: 16px; width: 100%; max-width: 540px; }
        .modal-header { display: flex; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .modal-header h2 { font-size: 1.125rem; font-weight: 600; }
        .close-btn { background: none; border: none; color: #64748b; cursor: pointer; }
        .modal form { padding: 1.5rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 0.8125rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .form-group input, .form-group select { padding: 0.625rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9375rem; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; }
        .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
        .btn-cancel { padding: 0.625rem 1.25rem; background: #f1f5f9; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
        .btn-submit { padding: 0.625rem 1.25rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
      `}</style>
    </div>
  );
}
