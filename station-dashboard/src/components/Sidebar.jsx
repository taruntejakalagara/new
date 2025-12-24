import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Car, 
  Grid3X3, 
  BarChart3,
  Receipt,
  Clock,
  LogOut,
  Bell,
  Volume2,
  Smartphone,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VENUE, APP_VERSION } from '../config/api';

export default function Sidebar({ queueCount = 0, alertCount = 0 }) {
  const { manager, logout, shiftConfig } = useAuth();

  const navSections = [
    {
      title: 'Operations',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/queue', icon: ClipboardList, label: 'Queue', badge: queueCount },
        { to: '/operations', icon: Smartphone, label: 'Check-in / Retrieval' },
        { to: '/hooks', icon: Grid3X3, label: 'Hook Board' },
        { to: '/vehicles', icon: Car, label: 'Vehicles' },
      ],
    },
    {
      title: 'Management',
      items: [
        { to: '/drivers', icon: Users, label: 'Drivers' },
        { to: '/shifts', icon: Clock, label: 'Shifts' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/closeout', icon: Receipt, label: 'Closeout' },
      ],
    },
  ];

  const handleLogout = () => {
    if (confirm('End this shift and log out?')) {
      logout();
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          {VENUE.name.charAt(0)}
        </div>
        <div className="sidebar-brand-text">
          <h1>{VENUE.name}</h1>
          <p>Valet Station</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                end={to === '/'}
              >
                <Icon size={18} />
                <span>{label}</span>
                {badge > 0 && <span className="nav-badge">{badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Shift Info */}
      <div style={{ padding: '0 var(--space-md)', marginBottom: 'var(--space-md)' }}>
        <div 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: '0.75rem',
          }}
        >
          <div className="flex items-center justify-between mb-xs">
            <span style={{ opacity: 0.6 }}>Pricing</span>
            <span style={{ fontWeight: 600 }}>
              {shiftConfig.pricingModel === 'flat' 
                ? `$${shiftConfig.flatRate || 15} flat`
                : shiftConfig.pricingModel === 'hourly'
                  ? `$${shiftConfig.hourlyRate || 5}/hr`
                  : 'Tiered'
              }
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ opacity: 0.6 }}>Tips</span>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
              {shiftConfig.tipPolicy || 'Individual'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {manager?.full_name?.charAt(0) || manager?.username?.charAt(0) || 'M'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {manager?.full_name || manager?.username || 'Manager'}
            </div>
            <div className="sidebar-user-role">Manager</div>
          </div>
          <button 
            className="btn btn-icon btn-ghost" 
            onClick={handleLogout}
            title="End Shift & Logout"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <LogOut size={18} />
          </button>
        </div>
        <div style={{ fontSize: '0.625rem', opacity: 0.4, marginTop: 'var(--space-sm)' }}>
          v{APP_VERSION}
        </div>
      </div>
    </aside>
  );
}
