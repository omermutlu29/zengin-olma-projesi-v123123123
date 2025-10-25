import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Scenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState('name'); // 'name', 'url', 'node'
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [lockedScenarios, setLockedScenarios] = useState(new Set());

  useEffect(() => {
    fetchScenarios();
    fetchLockedScenarios();
  }, [search, statusFilter, searchType]);

  // Lock durumlarını kontrol et
  useEffect(() => {
    const interval = setInterval(fetchLockedScenarios, 5000); // 5 saniyede bir kontrol et
    return () => clearInterval(interval);
  }, []);

  const fetchScenarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
        params.append('searchType', searchType);
      }
      if (statusFilter) params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`http://localhost:3001/api/scenarios?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios || []);
      } else {
        setError('Failed to load scenarios');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLockedScenarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/scenarios/locks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLockedScenarios(new Set(data.lockedScenarios || []));
      }
    } catch (error) {
      console.error('Failed to fetch lock status:', error);
    }
  };

  const handleDelete = async (scenarioId) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/scenarios/${scenarioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setScenarios(scenarios.filter(s => s._id !== scenarioId));
      } else {
        alert('Failed to delete scenario');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleExecute = async (scenarioId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/execution/start/${scenarioId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variables: {},
          settings: {}
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Execution started with ID: ${result.executionId}`);
      } else {
        const error = await response.json();
        alert('Failed to start execution: ' + error.error);
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleOpenStudio = (scenarioId, projectId) => {
    const studioUrl = `/studio/${projectId || 'new'}/${scenarioId}`;
    window.open(studioUrl, '_blank');
  };

  const handleLockScenario = async (scenarioId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/scenarios/${scenarioId}/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchLockedScenarios();
        alert('Scenario locked successfully');
      } else {
        const error = await response.json();
        alert('Failed to lock scenario: ' + error.error);
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleUnlockScenario = async (scenarioId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/scenarios/${scenarioId}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchLockedScenarios();
        alert('Scenario unlocked successfully');
      } else {
        const error = await response.json();
        alert('Failed to unlock scenario: ' + error.error);
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="scenarios-loading">
        <span className="spinner" /> Loading scenarios...
      </div>
    );
  }

  return (
    <div className="scenarios">
      <div className="scenarios-header">
        <h1>🔧 Scenarios</h1>
        <div className="scenarios-actions">
          <Link to="/studio" className="btn btn-primary">
            + New Scenario
          </Link>
        </div>
      </div>

      <div className="scenarios-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search scenarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="filter-select"
          >
            <option value="name">Search by Name</option>
            <option value="url">Search by URL</option>
            <option value="node">Search by Node</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="ready">Ready</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="scenarios-table-container">
        {scenarios.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔧</div>
            <h3>No scenarios found</h3>
            <p>Create your first scenario to get started with testing.</p>
            <Link to="/studio" className="btn btn-primary">
              Create First Scenario
            </Link>
          </div>
        ) : (
          <table className="scenarios-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')} className="sortable">
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('project')} className="sortable">
                  Project {sortBy === 'project' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('nodes')} className="sortable">
                  Nodes {sortBy === 'nodes' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('owner')} className="sortable">
                  Owner {sortBy === 'owner' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('createdAt')} className="sortable">
                  Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Lock Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map(scenario => {
                const isLocked = lockedScenarios.has(scenario._id);
                const lockInfo = scenario.lockInfo;
                
                return (
                  <tr key={scenario._id} className={isLocked ? 'locked' : ''}>
                    <td>
                      <div className="scenario-name">
                        <strong>{scenario.name}</strong>
                        {scenario.description && (
                          <div className="scenario-description">
                            {scenario.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${scenario.status || 'ready'}`}>
                        {scenario.status === 'ready' && '✅ Ready'}
                        {scenario.status === 'running' && '🔄 Running'}
                        {scenario.status === 'completed' && '✅ Completed'}
                        {scenario.status === 'failed' && '❌ Failed'}
                        {!scenario.status && '✅ Ready'}
                      </span>
                    </td>
                    <td>
                      <div className="project-info">
                        {scenario.project?.name || 'No project'}
                      </div>
                    </td>
                    <td>
                      <div className="nodes-count">
                        {scenario.nodes?.length || 0} nodes
                      </div>
                    </td>
                    <td>
                      <div className="owner-info">
                        {scenario.owner?.firstName} {scenario.owner?.lastName}
                      </div>
                    </td>
                    <td>
                      <div className="created-date">
                        {new Date(scenario.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div className="lock-status">
                        {isLocked ? (
                          <div className="locked-info">
                            <span className="lock-icon">🔒</span>
                            <div className="lock-details">
                              <div className="locked-by">
                                Locked by {lockInfo?.lockedBy?.firstName} {lockInfo?.lockedBy?.lastName}
                              </div>
                              <div className="locked-time">
                                {new Date(lockInfo?.lockedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="unlocked">🔓 Available</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="scenario-actions">
                        <button
                          onClick={() => handleOpenStudio(scenario._id, scenario.project?._id)}
                          className="btn btn-sm btn-primary"
                          title="Open in new tab"
                        >
                          🎬 Studio
                        </button>
                        <button
                          onClick={() => handleExecute(scenario._id)}
                          className="btn btn-sm btn-success"
                          disabled={scenario.status === 'running'}
                          title="Execute scenario"
                        >
                          {scenario.status === 'running' ? '🔄 Running...' : '⚡ Execute'}
                        </button>
                        {isLocked ? (
                          <button
                            onClick={() => handleUnlockScenario(scenario._id)}
                            className="btn btn-sm btn-warning"
                            title="Unlock scenario"
                          >
                            🔓 Unlock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLockScenario(scenario._id)}
                            className="btn btn-sm btn-secondary"
                            title="Lock scenario"
                          >
                            🔒 Lock
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(scenario._id)}
                          className="btn btn-sm btn-danger"
                          disabled={isLocked}
                          title="Delete scenario"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
