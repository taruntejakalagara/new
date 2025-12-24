import { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, CheckCircle, AlertCircle,
  DollarSign, Clock, Users, Bell
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    pricingModel: 'flat',
    flatRate: 15,
    hourlyRate: 5,
    priorityFee: 10,
    maxHooks: 50,
    retrievalTimeout: 15,
    tipPolicy: 'individual',
    suggestedTips: [3, 5, 10]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      const data = await response.json();
      if (data.success && data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (data.success) setMessage({ type: 'success', text: 'Settings saved!' });
      else setMessage({ type: 'error', text: data.message || 'Failed' });
    } catch { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setSaving(false); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
  };

  if (loading) return <div className="loading"><RefreshCw size={32} className="spin" /></div>;

  return (
    <div className="settings-page">
      <header className="page-header">
        <div><h1>Settings</h1><p>Configure system settings</p></div>
        <div className="header-actions">
          <button className="btn-reset" onClick={fetchSettings}><RefreshCw size={18} />Reset</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : <><Save size={18} />Save Changes</>}
          </button>
        </div>
      </header>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="settings-grid">
        {/* Pricing Settings */}
        <div className="settings-card">
          <div className="card-header"><DollarSign size={20} /><h3>Pricing</h3></div>
          <div className="card-content">
            <div className="form-group">
              <label>Pricing Model</label>
              <select value={settings.pricingModel} onChange={(e) => setSettings({...settings, pricingModel: e.target.value})}>
                <option value="flat">Flat Rate</option>
                <option value="hourly">Hourly</option>
                <option value="tiered">Tiered</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Flat Rate ($)</label>
                <input type="number" value={settings.flatRate} onChange={(e) => setSettings({...settings, flatRate: parseFloat(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Hourly Rate ($)</label>
                <input type="number" value={settings.hourlyRate} onChange={(e) => setSettings({...settings, hourlyRate: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="form-group">
              <label>Priority Fee ($)</label>
              <input type="number" value={settings.priorityFee} onChange={(e) => setSettings({...settings, priorityFee: parseFloat(e.target.value)})} />
            </div>
          </div>
        </div>

        {/* Operations Settings */}
        <div className="settings-card">
          <div className="card-header"><Clock size={20} /><h3>Operations</h3></div>
          <div className="card-content">
            <div className="form-group">
              <label>Max Hooks per Station</label>
              <input type="number" value={settings.maxHooks} onChange={(e) => setSettings({...settings, maxHooks: parseInt(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>Retrieval Timeout (minutes)</label>
              <input type="number" value={settings.retrievalTimeout} onChange={(e) => setSettings({...settings, retrievalTimeout: parseInt(e.target.value)})} />
            </div>
          </div>
        </div>

        {/* Tips Settings */}
        <div className="settings-card">
          <div className="card-header"><Users size={20} /><h3>Tips</h3></div>
          <div className="card-content">
            <div className="form-group">
              <label>Tip Policy</label>
              <select value={settings.tipPolicy} onChange={(e) => setSettings({...settings, tipPolicy: e.target.value})}>
                <option value="individual">Individual (per driver)</option>
                <option value="pooled">Pooled (shared)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Suggested Tip Amounts ($)</label>
              <div className="tip-inputs">
                {settings.suggestedTips.map((tip, i) => (
                  <input key={i} type="number" value={tip} 
                    onChange={(e) => {
                      const newTips = [...settings.suggestedTips];
                      newTips[i] = parseInt(e.target.value);
                      setSettings({...settings, suggestedTips: newTips});
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-page { padding: 2rem; }
        .loading { display: flex; justify-content: center; align-items: center; height: 50vh; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }

        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .page-header p { color: #64748b; font-size: 0.875rem; }
        .header-actions { display: flex; gap: 0.75rem; }
        .btn-reset { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-weight: 500; cursor: pointer; }
        .btn-save { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
        .btn-save:disabled { opacity: 0.7; }

        .message { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
        .message.success { background: #dcfce7; color: #16a34a; }
        .message.error { background: #fef2f2; color: #dc2626; }

        .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; }
        .settings-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .card-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .card-header h3 { font-size: 1rem; font-weight: 600; color: #1e293b; }
        .card-header svg { color: #3b82f6; }
        .card-content { padding: 1.25rem; }

        .form-group { margin-bottom: 1rem; }
        .form-group:last-child { margin-bottom: 0; }
        .form-group label { display: block; font-size: 0.8125rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .form-group input, .form-group select { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9375rem; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .tip-inputs { display: flex; gap: 0.75rem; }
        .tip-inputs input { width: 80px; text-align: center; }
      `}</style>
    </div>
  );
}
