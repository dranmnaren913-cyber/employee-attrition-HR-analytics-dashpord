import React, { useState } from 'react';
import { Filter, X, RotateCcw, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';

export default function FilterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    filters,
    appliedFilters,
    setFilterValue,
    applyFilters,
    resetFilters,
    activeFilterCount,
    departments,
    jobRoles
  } = useFilters();

  const handleApply = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const handleReset = () => {
    resetFilters();
  };

  // Filter job roles by selected department if selected
  const availableRoles = filters.department
    ? jobRoles.filter(r => String(r.department) === String(filters.department))
    : jobRoles;

  return (
    <div className="filter-panel-wrapper card">
      <div className="filter-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="filter-title-area">
          <Filter size={18} className="text-primary" />
          <span className="filter-title">Global Analytics Filters</span>
          {activeFilterCount > 0 && (
            <span className="badge badge-primary">{activeFilterCount} Active</span>
          )}
        </div>
        <div className="filter-toggle-area">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="btn btn-secondary btn-sm"
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <button type="button" className="btn-icon">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <form onSubmit={handleApply} className="filter-form">
          <div className="filter-grid">
            {/* Department */}
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-control"
                value={filters.department}
                onChange={(e) => {
                  setFilterValue('department', e.target.value);
                  setFilterValue('job_role', '');
                }}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.department_name}</option>
                ))}
              </select>
            </div>

            {/* Job Role */}
            <div className="form-group">
              <label className="form-label">Job Role</label>
              <select
                className="form-control"
                value={filters.job_role}
                onChange={(e) => setFilterValue('job_role', e.target.value)}
              >
                <option value="">All Job Roles</option>
                {availableRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.role_name}</option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-control"
                value={filters.gender}
                onChange={(e) => setFilterValue('gender', e.target.value)}
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Employment Status */}
            <div className="form-group">
              <label className="form-label">Employment Status</label>
              <select
                className="form-control"
                value={filters.employment_status}
                onChange={(e) => setFilterValue('employment_status', e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            {/* Attrition Status */}
            <div className="form-group">
              <label className="form-label">Attrition Status</label>
              <select
                className="form-control"
                value={filters.attrition_status}
                onChange={(e) => setFilterValue('attrition_status', e.target.value)}
              >
                <option value="all">All</option>
                <option value="Yes">Attrited (Yes)</option>
                <option value="No">Retained (No)</option>
              </select>
            </div>

            {/* Risk Level */}
            <div className="form-group">
              <label className="form-label">ML Risk Level</label>
              <select
                className="form-control"
                value={filters.risk_level}
                onChange={(e) => setFilterValue('risk_level', e.target.value)}
              >
                <option value="all">All Risk Levels</option>
                <option value="High">High Risk (&gt;65%)</option>
                <option value="Medium">Medium Risk (35-65%)</option>
                <option value="Low">Low Risk (&lt;35%)</option>
              </select>
            </div>

            {/* Age Range */}
            <div className="form-group">
              <label className="form-label">Age Range (Yrs)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  className="form-control"
                  value={filters.age_min}
                  onChange={(e) => setFilterValue('age_min', e.target.value)}
                />
                <span className="range-separator">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="form-control"
                  value={filters.age_max}
                  onChange={(e) => setFilterValue('age_max', e.target.value)}
                />
              </div>
            </div>

            {/* Salary Range */}
            <div className="form-group">
              <label className="form-label">Salary Range (₹)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  className="form-control"
                  value={filters.salary_min}
                  onChange={(e) => setFilterValue('salary_min', e.target.value)}
                />
                <span className="range-separator">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="form-control"
                  value={filters.salary_max}
                  onChange={(e) => setFilterValue('salary_max', e.target.value)}
                />
              </div>
            </div>

            {/* Experience Range */}
            <div className="form-group">
              <label className="form-label">Experience (Yrs)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  className="form-control"
                  value={filters.experience_min}
                  onChange={(e) => setFilterValue('experience_min', e.target.value)}
                />
                <span className="range-separator">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="form-control"
                  value={filters.experience_max}
                  onChange={(e) => setFilterValue('experience_max', e.target.value)}
                />
              </div>
            </div>

            {/* Joining Year */}
            <div className="form-group">
              <label className="form-label">Joining Year</label>
              <input
                type="number"
                placeholder="e.g. 2024"
                className="form-control"
                value={filters.year}
                onChange={(e) => setFilterValue('year', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button type="submit" className="btn btn-primary">
              <Check size={16} /> Apply Filters
            </button>
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              <RotateCcw size={16} /> Clear All
            </button>
          </div>
        </form>
      )}

      <style>{`
        .filter-panel-wrapper {
          margin-bottom: 24px;
          padding: 16px 20px;
        }
        .filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
        }
        .filter-title-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filter-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-main);
        }
        .filter-toggle-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filter-form {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
        }
        .range-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .range-separator {
          color: var(--text-muted);
          font-weight: 600;
        }
        .filter-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
