import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Search,
  UserCheck, Users, UserX
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/common/KPICard';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PAGE_SIZE = 10;

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const fetchTeam = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        ordering: 'name',
      });
      if (search.trim()) params.set('search', search.trim());

      try {
        const [metricsResponse, employeesResponse] = await Promise.all([
          api.get('/analytics/overview/'),
          api.get(`/employees/?${params.toString()}`),
        ]);
        if (!isCurrent) return;
        setMetrics(metricsResponse.data.kpis);
        setEmployees(employeesResponse.data.results || employeesResponse.data);
        setEmployeeCount(employeesResponse.data.count ?? employeesResponse.data.length);
      } catch (requestError) {
        if (isCurrent) setError(requestError.response?.data?.detail || 'Could not load your department team.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchTeam();
    return () => { isCurrent = false; };
  }, [page, search, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(employeeCount / PAGE_SIZE));
  const firstRecord = employeeCount ? ((page - 1) * PAGE_SIZE) + 1 : 0;
  const lastRecord = Math.min(page * PAGE_SIZE, employeeCount);

  return (
    <section className="page-content manager-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Dashboard</h1>
          <p className="page-subtitle">
            {user?.department_name ? `${user.department_name} team` : 'Your assigned department team'}
            {' '}&middot; Employee oversight and follow-up
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            aria-busy={loading}
            title="Refresh team data"
          >
            <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/accounts" className="btn btn-primary btn-sm">
            Create Employee Account
          </Link>
        </div>
      </div>

      {error && (
        <div className="card" role="alert" style={{ marginBottom: '20px' }}>
          <p className="text-danger">{error}</p>
        </div>
      )}

      <div className="kpi-grid">
        <KPICard label="Department headcount" value={metrics?.total_employees ?? 0} subtext="Employees assigned to your department" icon={Users} variant="primary" />
        <KPICard label="Active team members" value={metrics?.active_employees ?? 0} subtext="Currently active" icon={UserCheck} variant="success" />
        <KPICard label="Attrition rate" value={`${metrics?.attrition_rate ?? 0}%`} subtext={`${metrics?.attrited_employees ?? 0} departed employees`} icon={UserX} variant="warning" />
        <KPICard label="High-risk follow-ups" value={metrics?.high_risk_count ?? 0} subtext="Review employee details" icon={AlertTriangle} variant="danger" />
      </div>

      <div className="card manager-team-panel">
        <div className="card-header">
          <div>
            <h2 className="card-title">My Team</h2>
            <p className="card-subtitle">Employee records within your assigned department</p>
          </div>
          <Link to="/employees" className="btn btn-secondary btn-sm">Open directory</Link>
        </div>

        <div className="manager-team-controls">
          <label className="manager-team-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              className="form-control"
              placeholder="Search your team..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <span className="pagination-info">{employeeCount} team members</span>
        </div>

        {loading && employees.length === 0 ? (
          <LoadingSpinner message="Loading department team..." />
        ) : employees.length === 0 ? (
          <p className="manager-team-empty">No employees match this search in your department.</p>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Job role</th>
                    <th>Status</th>
                    <th>Performance</th>
                    <th>Satisfaction</th>
                    <th>Attrition risk</th>
                    <th>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <strong>{employee.name}</strong>
                        <div className="manager-employee-email">{employee.email}</div>
                      </td>
                      <td>{employee.job_role_name}</td>
                      <td>
                        <span className={`badge ${employee.employment_status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                          {employee.employment_status}
                        </span>
                      </td>
                      <td>{employee.performance_score} / 5</td>
                      <td>{employee.satisfaction_score} / 5</td>
                      <td>
                        <span className={`badge ${employee.risk_level === 'High' ? 'badge-danger' : employee.risk_level === 'Medium' ? 'badge-warning' : 'badge-success'}`}>
                          {employee.risk_level} ({employee.probability}%)
                        </span>
                      </td>
                      <td><Link to={`/employees/${employee.id}`} className="btn btn-secondary btn-sm">Review</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar">
              <span className="pagination-info">Showing {firstRecord} to {lastRecord} of {employeeCount}</span>
              <div className="pagination-buttons">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="page-indicator">Page {page} of {totalPages}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .manager-team-panel { margin-top: 20px; }
        .manager-team-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .manager-team-search {
          position: relative;
          display: flex;
          align-items: center;
          width: min(100%, 380px);
        }
        .manager-team-search > svg {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
        }
        .manager-team-search input { padding-left: 34px; }
        .manager-employee-email {
          color: var(--text-muted);
          font-size: 0.75rem;
          margin-top: 3px;
        }
        .manager-team-empty {
          padding: 24px 0;
          color: var(--text-muted);
        }
        @media (max-width: 640px) {
          .manager-team-controls { align-items: stretch; flex-direction: column; }
          .manager-team-search { width: 100%; }
        }
      `}</style>
    </section>
  );
}