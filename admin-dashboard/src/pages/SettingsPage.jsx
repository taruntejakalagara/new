import { useState, useEffect } from 'react';
import { 
  Settings, Wifi, Database, Bell, Shield, 
  Save, RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

function SettingSection({ title, description, children }) {
  return (
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ConnectionTest({ url, label }) {
  const [status, setStatus] = useState('checking');
  const [responseTime, setResponseTime] = useState(null);

  const testConnection = async () => {
    setStatus('checking');
    const start = Date.now();
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        setStatus('connected');
        setResponseTime(Date.now() - start);
      } else {
        setStatus('error');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => {
    testConnection();
  }, [url]);

  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Wifi size={18} className="text-slate-500" />
        <div>
          <p className="text-sm text-white">{label}</p>
          <p className="text-xs text-slate-500 font-mono">{url}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {status === 'checking' && (
          <div className="flex items-center gap-2 text-slate-400">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Testing...</span>
          </div>
        )}
        {status === 'connected' && (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle size={16} />
            <span className="text-sm">{responseTime}ms</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">Failed</span>
          </div>
        )}
        <button onClick={testConnection} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(API_BASE_URL.replace('/api', ''));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('digitalkey_api_url', apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-500">Configure your admin dashboard</p>
        </div>
        <button onClick={handleSave} className="btn btn-primary">
          {saved ? <CheckCircle size={18} /> : <Save size={18} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <SettingSection title="Connection Settings" description="Configure API server connection">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">API Server URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="http://192.168.1.100:4000"
            />
          </div>
          <ConnectionTest url={apiUrl} label="API Server" />
        </div>
      </SettingSection>

      <SettingSection title="System Information" description="Current system configuration">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Dashboard Version</p>
            <p className="text-sm text-white font-mono">1.0.0</p>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">API Endpoint</p>
            <p className="text-sm text-white font-mono truncate">{API_BASE_URL}</p>
          </div>
        </div>
      </SettingSection>
    </div>
  );
}
