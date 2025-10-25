import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`http://localhost:3001/api/admin/projects?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      } else {
        setError('Failed to load projects');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/admin/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setProjects(projects.filter(p => p._id !== projectId));
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  if (loading) {
    return (
      <div className="projects-loading">
        <span className="spinner" /> Loading projects...
      </div>
    );
  }

  return (
    <div className="projects">
      <div className="projects-header">
        <h1>📁 Projects</h1>
        <div className="projects-actions">
          <Link to="/projects/new" className="btn btn-primary">
            + New Project
          </Link>
        </div>
      </div>

      <div className="projects-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="projects-list">
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects found</p>
            <Link to="/projects/new" className="btn btn-primary">
              Create First Project
            </Link>
          </div>
        ) : (
          projects.map(project => (
            <div key={project._id} className="project-card">
              <div className="project-header">
                <h3>{project.name}</h3>
                <div className="project-status">
                  <span className={`status-badge status-${project.status}`}>
                    {project.status}
                  </span>
                </div>
              </div>
              
              <div className="project-content">
                <p>{project.description || 'No description'}</p>
                
                <div className="project-meta">
                  <div className="meta-item">
                    <strong>Owner:</strong> {project.owner?.firstName} {project.owner?.lastName}
                  </div>
                  <div className="meta-item">
                    <strong>Teams:</strong> {project.teams?.length || 0}
                  </div>
                  <div className="meta-item">
                    <strong>Created:</strong> {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="project-stats">
                  <div className="stat">
                    <span className="stat-label">Scenarios:</span>
                    <span className="stat-value">{project.stats?.scenarioCount || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Executions:</span>
                    <span className="stat-value">{project.stats?.executionCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="project-actions">
                <Link to={`/projects/${project._id}`} className="btn btn-sm">
                  View
                </Link>
                <Link to={`/projects/${project._id}/edit`} className="btn btn-sm btn-secondary">
                  Edit
                </Link>
                <Link to={`/studio/${project._id}`} className="btn btn-sm btn-primary">
                  Studio
                </Link>
                <button
                  onClick={() => handleDelete(project._id)}
                  className="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
