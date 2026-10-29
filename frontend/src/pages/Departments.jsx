import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Users, DollarSign, TrendingDown, Briefcase } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Departments() {
  const { role } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDept, setNewDept] = useState({ department_name: '', code: '', description: '' });

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments/');
      setDepartments(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error loading departments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await api.post('/departments/', newDept);
      setShowAddModal(false);
      setNewDept({ department_name: '', code: '', description: '' });
      fetchDepartments();
    } catch (err) {
      alert("Failed to create department: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  if (loading) return <LoadingSpinner message="Loading organizational department hierarchy..." />;

  const isHRAdmin = role === 'HR_ADMIN';

  return (
    <div className="departments-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Organizational Departments &amp; Roles</h1>
          <p className="page-subtitle">
            Explore department headcounts, salary benchmarks, attrition indices, and job roles
          </p>
        </div>
        {isHRAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> New Department
          </button>
        )}
      </div>

      <div className="departments-grid">
        {departments.map(dept => (
          <div key={dept.id} className="card dept-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Building2 size={18} className="text-primary" />
                  {dept.department_name}
                </h3>
                <span className="dept-code-tag">{dept.code}</span>
              </div>
              <span className={`badge ${dept.attrition_rate > 20 ? 'badge-danger' : 'badge-primary'}`}>
                {dept.attrition_rate}% Turnover
              </span>
            </div>

            <p className="dept-desc">{dept.description || 'No description provided.'}</p>

            <div className="dept-stats-row">
              <div className="dept-stat">
                <Users size={16} className="text-muted" />
                <div>
                  <span className="stat-label">Headcount</span>
                  <span className="stat-val">{dept.employee_count} staff</span>
                </div>
              </div>
              <div className="dept-stat">
                <TrendingDown size={16} className="text-danger" />
                <div>
                  <span className="stat-label">Attrited</span>
                  <span className="stat-val">{dept.attrited_count} left</span>
                </div>
              </div>
              <div className="dept-stat">
                <DollarSign size={16} className="text-success" />
                <div>
                  <span className="stat-label">Avg Salary</span>
                  <span className="stat-val">₹{Number(dept.avg_salary || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="dept-roles-section">
              <h4 className="roles-title">Configured Job Roles ({dept.job_roles?.length || 0}):</h4>
              <div className="roles-tags">
                {dept.job_roles?.map(r => (
                  <span key={r.id} className="role-tag">
                    <Briefcase size={12} /> {r.role_name}
                  </span>
                ))}
              </div>
            </div>

            <div className="dept-card-footer">
              <Link to={`/employees?department=${dept.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                View {dept.department_name} Employees
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Add New Department</h3>
            <form onSubmit={handleCreateDept}>
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Legal & Compliance"
                  value={newDept.department_name}
                  onChange={(e) => setNewDept({ ...newDept, department_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department Code *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  className="form-control"
                  placeholder="e.g. LEG"
                  value={newDept.code}
                  onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Brief summary of department responsibilities"
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .departments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 20px;
        }
        .dept-card {
          display: flex;
          flex-direction: column;
        }
        .dept-code-tag {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--primary);
          background: var(--primary-light);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
          display: inline-block;
        }
        .dept-desc {
          font-size: 0.825rem;
          color: var(--text-muted);
          margin-bottom: 16px;
          line-height: 1.4;
          min-height: 38px;
        }
        .dept-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          background: var(--bg-surface-alt);
          padding: 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 16px;
        }
        .dept-stat {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stat-label {
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .stat-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .dept-roles-section {
          flex: 1;
          margin-bottom: 16px;
        }
        .roles-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .roles-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .role-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: var(--bg-surface-alt);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-main);
        }
        .dept-card-footer {
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }
      `}</style>
    </div>
  );
}
