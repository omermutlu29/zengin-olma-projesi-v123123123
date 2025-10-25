import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthWrapper';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Current path'den active menu'yu belirle
  const getActiveMenu = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/teams')) return 'teams';
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/scenarios')) return 'scenarios';
    if (path.startsWith('/executions')) return 'executions';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/studio')) return 'scenarios'; // Studio da scenarios altında
    return 'dashboard';
  };
  
  const activeMenu = getActiveMenu();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'projects', label: 'Projects', icon: '📁', path: '/projects' },
    { id: 'teams', label: 'Teams', icon: '👥', path: '/teams' },
    { id: 'users', label: 'Users', icon: '👤', path: '/users' },
    { id: 'scenarios', label: 'Scenarios', icon: '🔧', path: '/scenarios' },
    { id: 'executions', label: 'Executions', icon: '⚡', path: '/executions' },
    { id: 'analytics', label: 'Analytics', icon: '📈', path: '/analytics' },
  ];

  const handleMenuClick = (item) => {
    navigate(item.path);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="company-logo">
            <div className="logo-icon">🚀</div>
            {!sidebarCollapsed && (
              <div className="logo-text">
                <span className="company-name">Scenario Studio</span>
                <span className="company-tagline">Enterprise</span>
              </div>
            )}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="user-info">
                <div className="user-name">{user?.fullName || user?.username}</div>
                <div className="user-role">{user?.roles?.[0] || 'User'}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="header-left">
            <div className="breadcrumb">
              <span className="breadcrumb-item">Scenario Studio</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {menuItems.find(item => item.id === activeMenu)?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="header-right">
            <div className="header-actions">
              <button className="action-btn" title="Notifications">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="notification-badge">3</span>
              </button>

              <button className="action-btn" title="Settings">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>

              <div className="user-menu">
                <button className="user-menu-trigger">
                  <div className="user-avatar-small">
                    {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </div>
                  <span className="user-name-small">{user?.fullName || user?.username}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                <div className="user-menu-dropdown">
                  <button className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Profile
                  </button>
                  <button className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Settings
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={logout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2"/>
                      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
