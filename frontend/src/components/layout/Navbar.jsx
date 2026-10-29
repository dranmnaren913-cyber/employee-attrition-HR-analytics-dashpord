import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Sun, Moon, Bell, User, LogOut, 
  ShieldAlert, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function Navbar({ onToggleSidebar, isSidebarCollapsed }) {
  const { user, role, logout, theme, toggleTheme } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const notificationRequestId = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const loadNotifications = async () => {
    const requestId = ++notificationRequestId.current;
    setNotificationsLoading(true);
    setNotificationsError('');

    try {
      const { data } = await api.get('/analytics/overview/');
      if (requestId !== notificationRequestId.current) return;
      const highRiskCount = Number(data?.kpis?.high_risk_count || 0);
      setNotifications(highRiskCount > 0 ? [{
        id: 'high-risk',
        title: 'High Attrition Risk Alert',
        description: `${highRiskCount} active ${highRiskCount === 1 ? 'employee needs' : 'employees need'} a retention follow-up.`,
      }] : []);
    } catch {
      if (requestId === notificationRequestId.current) {
        setNotificationsError('Could not load system notifications.');
      }
    } finally {
      if (requestId === notificationRequestId.current) setNotificationsLoading(false);
    }
  };

  const toggleNotifications = () => {
    if (notificationsOpen) {
      notificationRequestId.current += 1;
      setNotificationsOpen(false);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsOpen(true);
    loadNotifications();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/employees?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const roleBadgeClass = () => {
    switch (role) {
      case 'HR_ADMIN': return 'badge-danger';
      case 'MANAGER': return 'badge-primary';
      default: return 'badge-success';
    }
  };

  const roleDisplayName = () => {
    switch (role) {
      case 'HR_ADMIN': return 'HR Admin';
      case 'MANAGER': return 'Manager';
      default: return 'Employee';
    }
  };

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <form onSubmit={handleSearchSubmit} className="nav-search-form">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search employee ID, name, email or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nav-search-input"
          />
        </form>
      </div>

      <div className="navbar-right">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn-icon theme-btn"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications Popover */}
        <div className="popover-wrapper">
          <button
            type="button"
            onClick={toggleNotifications}
            className="btn-icon relative"
            title="Notifications"
            aria-expanded={notificationsOpen}
            aria-controls="system-notifications"
          >
            <Bell size={18} />
            {notifications.length > 0 && <span className="notification-dot" />}
          </button>

          {notificationsOpen && (
            <div className="popover-dropdown notifications-dropdown" id="system-notifications">
              <div className="dropdown-header">
                <h4>System Notifications</h4>
                {notifications.length > 0 && <span className="badge badge-primary">{notifications.length}</span>}
              </div>
              <div className="notification-list" aria-live="polite">
                {notificationsLoading ? (
                  <p className="notification-item notif-desc" role="status">Loading notifications...</p>
                ) : notificationsError ? (
                  <div className="notification-item" role="alert">
                    <p className="notif-desc">{notificationsError}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={loadNotifications}>
                      Retry
                    </button>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div className="notification-item unread" key={notification.id}>
                      <ShieldAlert size={16} className="text-danger" />
                      <div>
                        <p className="notif-title">{notification.title}</p>
                        <p className="notif-desc">{notification.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="notification-item notif-desc">No active notifications.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="popover-wrapper">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="user-profile-btn"
          >
            <div className="user-avatar">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="user-info-text">
              <span className="user-name">{user?.full_name || user?.email}</span>
              <span className={`badge ${roleBadgeClass()}`}>{roleDisplayName()}</span>
            </div>
            <ChevronDown size={14} className="chevron" />
          </button>

          {dropdownOpen && (
            <div className="popover-dropdown user-dropdown">
              <div className="dropdown-user-header">
                <strong>{user?.full_name}</strong>
                <span>{user?.email}</span>
              </div>
              <div className="dropdown-divider" />
              <Link
                to="/profile"
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                <User size={16} /> My Profile
              </Link>
              <div className="dropdown-divider" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="dropdown-item text-danger"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .navbar-container {
          height: var(--header-height);
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .navbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          max-width: 500px;
        }
        .nav-search-form {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-dim);
          pointer-events: none;
        }
        .nav-search-input {
          width: 100%;
          padding: 9px 14px 9px 38px;
          background-color: var(--bg-surface-alt);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          color: var(--text-main);
          outline: none;
          transition: all var(--transition-fast);
        }
        .nav-search-input:focus {
          background-color: var(--bg-surface);
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .academic-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--purple-text);
          background-color: var(--purple-light);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          letter-spacing: 0.02em;
        }
        @media (max-width: 768px) {
          .academic-tag { display: none; }
          .navbar-left { max-width: 220px; }
        }
        .popover-wrapper {
          position: relative;
        }
        .notification-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--danger);
          border: 2px solid var(--bg-surface);
        }
        .popover-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: 1000;
          min-width: 240px;
          animation: fadeIn 0.15s ease-out;
        }
        .notifications-dropdown {
          width: 320px;
        }
        .dropdown-header {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
        }
        .dropdown-header h4 {
          font-size: 0.875rem;
          font-weight: 600;
        }
        .notification-list {
          max-height: 280px;
          overflow-y: auto;
        }
        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.8rem;
          align-items: flex-start;
        }
        .notification-item.unread {
          background-color: var(--primary-light);
        }
        .notif-title {
          font-weight: 600;
          color: var(--text-main);
        }
        .notif-desc {
          color: var(--text-muted);
          font-size: 0.75rem;
          margin-top: 2px;
        }
        .user-profile-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: 1px solid var(--border-color);
          padding: 4px 10px 4px 5px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .user-profile-btn:hover {
          background-color: var(--bg-surface-alt);
        }
        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--purple));
          color: #FFF;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }
        .user-info-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .user-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-main);
          max-width: 140px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropdown-user-header {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
        }
        .dropdown-user-header strong {
          font-size: 0.9rem;
        }
        .dropdown-user-header span {
          font-size: 0.775rem;
          color: var(--text-muted);
        }
        .dropdown-divider {
          height: 1px;
          background-color: var(--border-color);
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          font-size: 0.85rem;
          color: var(--text-main);
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
        }
        .dropdown-item:hover {
          background-color: var(--bg-surface-alt);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
