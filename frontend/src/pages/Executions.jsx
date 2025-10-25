import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../components/AuthWrapper';

const Executions = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const { user } = useAuth();

  useEffect(() => {
    fetchExecutions();
  }, [search, statusFilter, sortBy, sortOrder]);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        sortBy,
        sortOrder
      });

      const response = await fetch(`API_BASE_URL/api/execution?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }

      const data = await response.json();
      setExecutions(data.executions || []);
    } catch (err) {
      console.error('Error fetching executions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (executionId) => {
    if (!window.confirm('Are you sure you want to delete this execution?')) {
      return;
    }

    try {
      const response = await fetch(`API_BASE_URL/api/execution/${executionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete execution');
      }

      // Refresh the list
      fetchExecutions();
    } catch (err) {
      console.error('Error deleting execution:', err);
      alert('Failed to delete execution');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'running': '#2196F3',
      'completed': '#4CAF50',
      'failed': '#F44336',
      'cancelled': '#FF9800',
      'pending': '#9E9E9E'
    };

    return (
      <span 
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: statusColors[status] || '#9E9E9E',
          color: 'white'
        }}
      >
        {status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    if (!endTime) return 'Running...';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = end - start;
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        fontSize: '16px',
        color: 'var(--text-secondary)'
      }}>
        Loading executions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        fontSize: '16px',
        color: '#F44336'
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '8px',
          color: 'var(--text)'
        }}>
          Executions
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: '24px' 
        }}>
          Manage and monitor scenario executions
        </p>
      </div>

      {/* Filters */}
      <div className="executions-filters" style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search executions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '14px',
            minWidth: '200px'
          }}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '14px'
          }}
        >
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortBy(field);
            setSortOrder(order);
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '14px'
          }}
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="status-asc">Status A-Z</option>
          <option value="status-desc">Status Z-A</option>
        </select>
      </div>

      {/* Executions Table */}
      <div className="executions-table-container">
        {executions.length === 0 ? (
          <div className="empty-state" style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--text)' }}>No executions found</h3>
            <p>No executions match your current filters.</p>
          </div>
        ) : (
          <table className="executions-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text)' }}>
                  Execution ID
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text)' }}>
                  Scenario
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text)' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text)' }}>
                  Started
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text)' }}>
                  Duration
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text)' }}>
                  Progress
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {executions.map((execution) => (
                <tr key={execution._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                    <code style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {execution._id?.substring(0, 8)}...
                    </code>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                    {execution.scenario?.name || 'Unknown Scenario'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getStatusBadge(execution.status)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                    {formatDate(execution.startedAt)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                    {formatDuration(execution.startedAt, execution.completedAt)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                    {execution.progress ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '60px',
                          height: '4px',
                          backgroundColor: 'var(--border)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${execution.progress.percentage || 0}%`,
                            height: '100%',
                            backgroundColor: execution.status === 'completed' ? '#4CAF50' : '#2196F3',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {execution.progress.percentage || 0}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => window.open(`/execution/${execution._id}`, '_blank')}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(execution._id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#F44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Executions;
