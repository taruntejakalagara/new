import { useState, useEffect } from 'react';
import { 
  Settings, DollarSign, Users, Save, RefreshCw,
  CheckCircle, AlertCircle, Percent, Clock
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Pricing
    pricingModel: 'flat', // flat, hourly, tiered
    flatRate: 15,
    hourlyRate: 5,
    hourlyMinimum: 10,
    priorityFee: 10,
    
    // Tips
    tipPolicy: 'individual', // individual, pooled
    suggestedTips: [3, 5, 10],
    
    // Operations
    maxHooks: 50,
    retrievalTimeout: 15, // minutes
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateSuggestedTip = (index, value) => {
    const newTips = [...settings.suggestedTips];
    newTips[index] = parseInt(value) || 0;
    setSettings(prev => ({ ...prev, suggestedTips: newTips }));
  };

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="spinner lg" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-title">
          <h1>Settings</h1>
          <p>Configure pricing, tips, and operations</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={fetchSettings}>
            <RefreshCw size={18} />
            Reset
          </button>
          <button 
            className="btn btn-accent" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="spinner" style={{ width: 18, height: 18 }} />
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          {/* Pricing Settings */}
          <div className="card">
            <div className="card-header">
              <DollarSign size={20} style={{ color: 'var(--color-accent)' }} />
              <h3>Pricing</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Pricing Model</label>
                <select
                  className="form-select"
                  value={settings.pricingModel}
                  onChange={(e) => updateSetting('pricingModel', e.target.value)}
                >
                  <option value="flat">Flat Rate</option>
                  <option value="hourly">Hourly Rate</option>
                  <option value="tiered">Tiered (Flat + Hourly)</option>
                </select>
              </div>

              {(settings.pricingModel === 'flat' || settings.pricingModel === 'tiered') && (
                <div className="form-group">
                  <label className="form-label">Flat Rate ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.flatRate}
                    onChange={(e) => updateSetting('flatRate', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.50"
                  />
                </div>
              )}

              {(settings.pricingModel === 'hourly' || settings.pricingModel === 'tiered') && (
                <>
                  <div className="form-group">
                    <label className="form-label">Hourly Rate ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.hourlyRate}
                      onChange={(e) => updateSetting('hourlyRate', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.50"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimum Charge ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.hourlyMinimum}
                      onChange={(e) => updateSetting('hourlyMinimum', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.50"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Priority Retrieval Fee ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.priorityFee}
                  onChange={(e) => updateSetting('priorityFee', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.50"
                />
                <p className="form-hint">Additional fee for priority retrieval requests</p>
              </div>
            </div>
          </div>

          {/* Tip Settings */}
          <div className="card">
            <div className="card-header">
              <Percent size={20} style={{ color: 'var(--color-accent)' }} />
              <h3>Tips</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Tip Distribution</label>
                <select
                  className="form-select"
                  value={settings.tipPolicy}
                  onChange={(e) => updateSetting('tipPolicy', e.target.value)}
                >
                  <option value="individual">Individual (Driver keeps tips)</option>
                  <option value="pooled">Pooled (Split among all drivers)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Suggested Tip Amounts ($)</label>
                <div className="flex gap-sm">
                  {settings.suggestedTips.map((tip, index) => (
                    <input
                      key={index}
                      type="number"
                      className="form-input"
                      style={{ width: '80px' }}
                      value={tip}
                      onChange={(e) => updateSuggestedTip(index, e.target.value)}
                      min="0"
                    />
                  ))}
                </div>
                <p className="form-hint">Shown as quick-select options for customers</p>
              </div>
            </div>
          </div>

          {/* Operations Settings */}
          <div className="card">
            <div className="card-header">
              <Settings size={20} style={{ color: 'var(--color-accent)' }} />
              <h3>Operations</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Maximum Key Hooks</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.maxHooks}
                  onChange={(e) => updateSetting('maxHooks', parseInt(e.target.value) || 0)}
                  min="1"
                  max="200"
                />
                <p className="form-hint">Total available hooks for key storage</p>
              </div>

              <div className="form-group">
                <label className="form-label">Retrieval Timeout (minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.retrievalTimeout}
                  onChange={(e) => updateSetting('retrievalTimeout', parseInt(e.target.value) || 0)}
                  min="5"
                  max="60"
                />
                <p className="form-hint">Time before retrieval request expires</p>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="card">
            <div className="card-header">
              <Clock size={20} style={{ color: 'var(--color-accent)' }} />
              <h3>Current Configuration</h3>
            </div>
            <div className="card-body">
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Pricing Model</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>
                    {settings.pricingModel}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Base Price</span>
                  <span className="info-value">${settings.flatRate.toFixed(2)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Priority Fee</span>
                  <span className="info-value">${settings.priorityFee.toFixed(2)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Tip Policy</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>
                    {settings.tipPolicy}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Max Hooks</span>
                  <span className="info-value">{settings.maxHooks}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
