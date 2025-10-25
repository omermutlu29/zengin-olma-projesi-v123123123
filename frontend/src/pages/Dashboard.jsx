import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, API_BASE_URL } from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await apiRequest('/api/admin/dashboard');
      setStats(data);
    } catch (error) {
      setError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <span className="spinner" /> Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <p>Welcome to Scenario Studio Admin Panel</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <h3>{stats?.stats?.totalProjects || 0}</h3>
            <p>Projects</p>
          </div>
          <Link to="/projects" className="stat-link">View All</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats?.stats?.totalTeams || 0}</h3>
            <p>Teams</p>
          </div>
          <Link to="/teams" className="stat-link">View All</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <h3>{stats?.stats?.totalUsers || 0}</h3>
            <p>Users</p>
          </div>
          <Link to="/users" className="stat-link">View All</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎬</div>
          <div className="stat-content">
            <h3>{stats?.stats?.totalScenarios || 0}</h3>
            <p>Scenarios</p>
          </div>
          <Link to="/scenarios" className="stat-link">View All</Link>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Recent Projects</h2>
          {stats?.recent?.projects?.length > 0 ? (
            <div className="recent-list">
              {stats.recent.projects.map(project => (
                <div key={project._id} className="recent-item">
                  <div className="recent-info">
                    <h4>{project.name}</h4>
                    <p>{project.description}</p>
                    <span className="recent-meta">
                      Owner: {project.owner?.firstName} {project.owner?.lastName}
                    </span>
                  </div>
                  <div className="recent-actions">
                    <Link to={`/projects/${project._id}`} className="btn btn-sm">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No recent projects</p>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Recent Scenarios</h2>
          {stats?.recent?.scenarios?.length > 0 ? (
            <div className="recent-list">
              {stats.recent.scenarios.map(scenario => (
                <div key={scenario._id} className="recent-item">
                  <div className="recent-info">
                    <h4>{scenario.name}</h4>
                    <p>{scenario.description}</p>
                    <span className="recent-meta">
                      Project: {scenario.project?.name} | Owner: {scenario.owner?.firstName} {scenario.owner?.lastName}
                    </span>
                  </div>
                  <div className="recent-actions">
                    <Link to={`/studio/${scenario.project?._id}/${scenario._id}`} className="btn btn-sm">
                      Open Studio
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No recent scenarios</p>
          )}
        </div>
      </div>
    </div>
  );
}
