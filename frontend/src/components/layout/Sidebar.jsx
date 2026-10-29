import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingDown,
  Award,
  IndianRupee,
  Smile,
  Cpu,
  FileSpreadsheet,
  ArrowUpDown,
  User,
  UserPlus,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isCollapsed, onToggleCollapse }) {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { label: 'Employees', path: '/employees', icon: Users, roles: ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { label: 'Departments', path: '/departments', icon: Building2, roles: ['HR_ADMIN', 'MANAGER'] },
    { label: 'Attrition Analytics', path: '/analytics/attrition', icon: TrendingDown, roles: ['HR_ADMIN', 'MANAGER'] },
    { label: 'Performance', path: '/analytics/performance', icon: Award, roles: ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { label: 'Salary Analytics', path: '/analytics/salary', icon: IndianRupee, roles: ['HR_ADMIN'] },
    { label: 'Satisfaction', path: '/analytics/satisfaction', icon: Smile, roles: ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { label: 'Attrition AI / ML', path: '/predictions', icon: Cpu, roles: ['HR_ADMIN', 'MANAGER'] },
    { label: 'Reports', path: '/reports', icon: FileSpreadsheet, roles: ['HR_ADMIN', 'MANAGER'] },
    { label: 'Import / Export', path: '/import-export', icon: ArrowUpDown, roles: ['HR_ADMIN'] },
    { label: 'Manage Accounts', path: '/accounts', icon: UserPlus, roles: ['HR_ADMIN'] },
    { label: 'Create Employee Account', path: '/accounts', icon: UserPlus, roles: ['MANAGER'] },
    { label: 'Profile', path: '/profile', icon: User, roles: ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role || 'EMPLOYEE'));

  return (
    <aside className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <Activity size={22} color="#FFFFFF" />
        </div>
        {!isCollapsed && (
          <div className="brand-info">
            <span className="brand-name">HR Analytics</span>
            <span className="brand-sub">Attrition Intelligence</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="collapse-toggle-btn"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="sidebar-scrollable">
        <div className="nav-section-title">
          {!isCollapsed && <span>MAIN NAVIGATION</span>}
        </div>
        <nav className="sidebar-nav">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={19} className="link-icon" />
                {!isCollapsed && <span className="link-label">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Logout */}
      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="sidebar-logout-btn"
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={19} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>

      <style>{`
        .sidebar-container {
          width: var(--sidebar-width);
          background-color: var(--bg-surface);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          transition: width var(--transition-normal);
          z-index: 101;
          flex-shrink: 0;
        }
        .sidebar-container.collapsed {
          width: var(--sidebar-collapsed-width);
        }
        .sidebar-brand {
          height: var(--header-height);
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          position: relative;
        }
        .brand-logo-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #2563EB, #7C3AED);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
        }
        .brand-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          white-space: nowrap;
        }
        .brand-name {
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-main);
        }
        .brand-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .collapse-toggle-btn {
          margin-left: auto;
          background: var(--bg-surface-alt);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }
        .collapse-toggle-btn:hover {
          color: var(--text-main);
          background: var(--bg-surface-hover);
        }
        .collapsed .collapse-toggle-btn {
          position: absolute;
          right: -13px;
          top: calc(var(--header-height) / 2 - 13px);
          background: var(--bg-surface);
          box-shadow: var(--shadow-sm);
        }
        .sidebar-scrollable {
          flex: 1;
          overflow-y: auto;
          padding: 16px 10px;
        }
        .nav-section-title {
          font-size: 0.675rem;
          font-weight: 700;
          color: var(--text-dim);
          letter-spacing: 0.08em;
          padding: 8px 12px;
          margin-bottom: 4px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 600;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .sidebar-link:hover {
          background-color: var(--bg-surface-alt);
          color: var(--text-main);
        }
        .sidebar-link.active {
          background-color: var(--primary-light);
          color: var(--primary);
        }
        .collapsed .sidebar-link {
          justify-content: center;
          padding: 12px;
        }
        .link-icon {
          flex-shrink: 0;
        }
        .sidebar-footer {
          padding: 14px;
          border-top: 1px solid var(--border-color);
        }
        .sidebar-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: none;
          color: var(--danger);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .sidebar-logout-btn:hover {
          background-color: var(--danger-light);
        }
        .collapsed .sidebar-logout-btn {
          justify-content: center;
          padding: 10px;
        }
      `}</style>
    </aside>
  );
}
