import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Users, Activity, 
  AlertTriangle, Settings, Bell, Search, Menu,
  ChevronDown, LogOut
} from 'lucide-react';
import { useState } from 'react';

// Pages
import DashboardPage from './pages/DashboardPage';
import VenuesPage from './pages/VenuesPage';
import DriversPage from './pages/DriversPage';
import LiveFeedPage from './pages/LiveFeedPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';

function Sidebar({ collapsed, setCollapsed }) {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/venues', icon: Building2, label: 'Venues' },
    { path: '/drivers', icon: Users, label: 'Drivers' },
    { path: '/live', icon: Activity, label: 'Live Feed' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 z-50 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-slate-800">
        {collapsed ? (
          <span className="text-2xl font-bold text-indigo-500">DK</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">DK</span>
            </div>
            <span className="text-lg font-semibold text-white">Digital Key</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
            `}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 left-0 right-0 mx-3 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
      >
        <Menu size={20} />
      </button>
    </aside>
  );
}

function Header() {
  const [notifications] = useState([
    { id: 1, message: 'New driver registered at Fairmont', time: '2m ago' },
    { id: 2, message: 'High queue at Kimpton (8 requests)', time: '5m ago' },
  ]);

  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 w-80">
        <Search size={18} className="text-slate-500" />
        <input 
          type="text"
          placeholder="Search venues, drivers, vehicles..."
          className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">TA</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">Tarun</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
          <ChevronDown size={16} className="text-slate-500" />
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <Header />
          
          <main className="p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/venues" element={<VenuesPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/live" element={<LiveFeedPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
