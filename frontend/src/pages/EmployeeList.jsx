import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Users, UserPlus, Search, Download, Trash2, Edit3, Eye,
  ArrowUpDown, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import FilterPanel from '../components/common/FilterPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';

export default function EmployeeList() {
  const { role } = useAuth();
  const { getQueryString, resetFilters } = useFilters();
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [loading, setLoading] = useState(true);

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // Parse initial query params from URL (e.g., ?search=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [location.search]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const globalQuery = getQueryString();
      const params = new URLSearchParams(globalQuery);
      params.set('page', page);
      params.set('page_size', pageSize);
      if (search) params.set('search', search);
      if (ordering) params.set('ordering', ordering);

      const res = await api.get(`/employees/?${params.toString()}`);
      setEmployees(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results ? res.data.results.length : res.data.length));
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, pageSize, ordering, getQueryString, search]);

  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else {
      setOrdering(field);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    try {
      await api.delete(`/employees/${employeeToDelete.id}/`);
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (err) {
      alert("Failed to delete employee: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleExport = async (format) => {
    const globalQuery = getQueryString();
    const params = new URLSearchParams(globalQuery);
    params.set('export_format', format);
    if (search) params.set('search', search);
    if (ordering) params.set('ordering', ordering);

    try {
      const response = await api.get(`/employees/export/?${params.toString()}`, {
        responseType: 'blob',
      });
      const downloadUrl = URL.createObjectURL(response.data);
      const downloadLink = document.createElement('a');
      const filename = response.headers['content-disposition']
        ?.match(/filename="?([^";]+)"?/i)?.[1];
      downloadLink.href = downloadUrl;
      downloadLink.download = filename || `employees_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      alert('Failed to export employees: ' + (err.response?.data?.detail || err.message));
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const isHRAdmin = role === 'HR_ADMIN';
  const canEditEmployees = isHRAdmin || role === 'MANAGER';

  const riskBadge = (risk) => {
    if (risk === 'High') return 'badge-danger';
    if (risk === 'Medium') return 'badge-warning';
    return 'badge-success';
  };

  return (
    <div className="employee-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory &amp; Management</h1>
          <p className="page-subtitle">
            Manage records, filter by talent parameters, inspect risk index, and maintain staff profiles
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isHRAdmin && (
            <Link to="/employees/new" className="btn btn-primary">
              <UserPlus size={16} /> Add Employee
            </Link>
          )}
          <button onClick={() => handleExport('csv')} className="btn btn-secondary btn-sm" title="Export CSV">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => handleExport('excel')} className="btn btn-secondary btn-sm" title="Export Excel">
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      <FilterPanel />

      <div className="card">
        {/* Table Controls Header */}
        <div className="table-controls-bar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by ID, name, email or department..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="table-search-input"
            />
          </div>

          {role !== 'EMPLOYEE' && (
            <div className="page-size-selector">
              <label>Show: </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="form-control"
                style={{ padding: '4px 8px', width: 'auto' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>

        {/* Table Content */}
        {loading ? (
          <LoadingSpinner message="Retrieving employee database records..." />
        ) : employees.length === 0 ? (
          <EmptyState
            title="No matching employees found"
            description="No employee records correspond to the active search or global filter criteria."
            onReset={resetFilters}
          />
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('employee_id')} className="sortable-th">
                      Emp ID <ArrowUpDown size={12} />
                    </th>
                    <th onClick={() => handleSort('name')} className="sortable-th">
                      Name <ArrowUpDown size={12} />
                    </th>
                    <th>Department</th>
                    <th>Job Role</th>
                    <th>Gender</th>
                    <th onClick={() => handleSort('age')} className="sortable-th">
                      Age <ArrowUpDown size={12} />
                    </th>
                    <th onClick={() => handleSort('salary')} className="sortable-th">
                      Salary <ArrowUpDown size={12} />
                    </th>
                    <th onClick={() => handleSort('experience')} className="sortable-th">
                      Exp <ArrowUpDown size={12} />
                    </th>
                    <th>Satisfaction</th>
                    <th>Status</th>
                    <th>Attrition</th>
                    <th>ML Risk</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <span className="emp-id-tag">{emp.employee_id}</span>
                      </td>
                      <td>
                        <div>
                          <strong>{emp.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                        </div>
                      </td>
                      <td>{emp.department_name}</td>
                      <td>{emp.job_role_name}</td>
                      <td>{emp.gender}</td>
                      <td>{emp.age}</td>
                      <td>₹{Number(emp.salary).toLocaleString('en-IN')}</td>
                      <td>{emp.experience}y</td>
                      <td>
                        <span className="badge badge-purple">{emp.satisfaction_score} / 5</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          emp.employment_status === 'Active' ? 'badge-success' :
                          emp.employment_status === 'On Leave' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {emp.employment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${emp.attrition_status === 'Yes' ? 'badge-danger' : 'badge-primary'}`}>
                          {emp.attrition_status === 'Yes' ? 'Left' : 'Retained'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${riskBadge(emp.risk_level)}`} title={`Probability: ${emp.probability}%`}>
                          {emp.risk_level} ({emp.probability}%)
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <Link
                            to={`/employees/${emp.id}`}
                            className="btn-icon"
                            title="View Employee Profile"
                          >
                            <Eye size={15} />
                          </Link>
                          {canEditEmployees && (
                            <Link
                              to={`/employees/${emp.id}/edit`}
                              className="btn-icon"
                              title="Edit Employee"
                            >
                              <Edit3 size={15} />
                            </Link>
                          )}
                          {isHRAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEmployeeToDelete(emp);
                                  setDeleteModalOpen(true);
                                }}
                                className="btn-icon text-danger"
                                title="Delete Employee"
                              >
                                <Trash2 size={15} />
                              </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-bar">
              <span className="pagination-info">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
              </span>
              <div className="pagination-buttons">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="page-indicator">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Confirm Employee Deletion"
        message={`Are you sure you want to permanently delete employee ${employeeToDelete?.name} (${employeeToDelete?.employee_id})? This action cannot be undone.`}
        confirmText="Delete Record"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setEmployeeToDelete(null);
        }}
      />

      <style>{`
        .table-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          max-width: 400px;
        }
        .table-search-input {
          width: 100%;
          padding: 8px 14px 8px 36px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-surface-alt);
          color: var(--text-main);
          font-size: 0.85rem;
          outline: none;
        }
        .table-search-input:focus {
          border-color: var(--border-focus);
          background: var(--bg-surface);
        }
        .sortable-th {
          cursor: pointer;
          user-select: none;
        }
        .sortable-th:hover {
          color: var(--text-main);
        }
        .emp-id-tag {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
          background: var(--primary-light);
          padding: 3px 6px;
          border-radius: 4px;
        }
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
          margin-top: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pagination-info {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .pagination-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .page-indicator {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
}
