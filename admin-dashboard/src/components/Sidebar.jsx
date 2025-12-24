import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Activity,
  AlertTriangle,
  Database,
  Wrench,
  Server,
  LogOut,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/venues', icon: Building2, label: 'Venues' },
    
    // Developer Tools Section
    { type: 'divider', label: 'Developer Tools' },
    { path: '/system-health', icon: Server, label: 'System Health' },
    { path: '/activity', icon: Activity, label: 'Activity Feed' },
    { path: '/errors', icon: AlertTriangle, label: 'Error Logs' },
    { path: '/database', icon: Database, label: 'Database Explorer' },
    { path: '/debug', icon: Wrench, label: 'Debug Tools' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Shield size={24} />
        </div>
        <div className="logo-text">
          <span className="logo-title">Dev Admin</span>
          <span className="logo-subtitle">The Digital Key</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          if (item.type === 'divider') {
            return (
              <div key={index} className="nav-divider">
                <span>{item.label}</span>
              </div>
            );
          }
          
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.fullName?.charAt(0) || 'D'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.fullName || 'Developer'}</span>
            <span className="user-role">Admin</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
        }

        .sidebar-logo {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .logo-icon {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .logo-subtitle {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }

        .nav-divider {
          padding: 1rem 1rem 0.5rem;
          margin-top: 0.5rem;
        }

        .nav-divider span {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          color: #94a3b8;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s;
          font-weight: 500;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .nav-item.active {
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          color: white;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .user-role {
          color: #64748b;
          font-size: 0.75rem;
        }

        .logout-btn {
          background: rgba(239, 68, 68, 0.1);
          border: none;
          padding: 0.5rem;
          border-radius: 6px;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </aside>
  );
}
