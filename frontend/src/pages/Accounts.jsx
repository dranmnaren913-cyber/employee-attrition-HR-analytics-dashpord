import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Check, Edit3, Eye, EyeOff, Search, UserPlus, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const createEmptyForm = () => ({
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
  role: 'EMPLOYEE',
  department: '',
  employee_id: '',
  job_role: '',
  joining_date: new Date().toISOString().split('T')[0],
});

const findErrorMessage = (value) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(findErrorMessage).find(Boolean) || '';
  if (value && typeof value === 'object') return Object.values(value).map(findErrorMessage).find(Boolean) || '';
  return '';
};

const getErrorMessage = (details) => {
  if (details?.detail) return details.detail;
  return findErrorMessage(details) || 'Could not save the account. Check the supplied details.';
};

export default function Accounts() {
  const { role, user } = useAuth();
  const [searchParams] = useSearchParams();
  const isHRAdmin = role === 'HR_ADMIN';
  const isManager = role === 'MANAGER';
  const [formData, setFormData] = useState(() => {
    const requestedRole = searchParams.get('role');
    return {
      ...createEmptyForm(),
      role: isManager ? 'EMPLOYEE' : ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(requestedRole) ? requestedRole : 'EMPLOYEE',
    };
  });
  const [departments, setDepartments] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(isHRAdmin);
  const [accountActionId, setAccountActionId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const accountFormRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([api.get('/departments/'), api.get('/job-roles/')])
      .then(([departmentResponse, roleResponse]) => {
        if (!isCurrent) return;
        setDepartments(departmentResponse.data.results || departmentResponse.data);
        setJobRoles(roleResponse.data.results || roleResponse.data);
      })
      .catch(() => {
        if (isCurrent) setError('Could not load department and job-role options.');
      });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (!isHRAdmin) return undefined;
    let isCurrent = true;
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    api.get(`/auth/accounts/${query}`)
      .then(({ data }) => {
        if (isCurrent) setAccounts(data);
      })
      .catch(() => {
        if (isCurrent) setError('Could not load managed accounts.');
      })
      .finally(() => {
        if (isCurrent) setListLoading(false);
      });
    return () => { isCurrent = false; };
  }, [isHRAdmin, search, refreshKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value, ...(name === 'department' ? { job_role: '' } : {}) }));
    setError('');
    setMessage('');
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(createEmptyForm());
    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (editingId) {
      if (formData.password || formData.confirm_password) {
        if (formData.password !== formData.confirm_password) {
          setError('Passwords do not match.');
          return;
        }
      }

      setLoading(true);
      try {
        const updatePayload = {
          full_name: formData.full_name,
          email: formData.email,
        };
        if (formData.password || formData.confirm_password) {
          updatePayload.password = formData.password;
          updatePayload.confirm_password = formData.confirm_password;
        }

        await api.patch(`/auth/accounts/${editingId}/`, updatePayload);
        setMessage('Account updated.');
        resetForm();
        setListLoading(true);
        setRefreshKey((key) => key + 1);
      } catch (requestError) {
        setError(getErrorMessage(requestError.response?.data));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const accountRole = isManager ? 'EMPLOYEE' : formData.role;
    const payload = {
      full_name: formData.full_name,
      email: formData.email,
      password: formData.password,
      confirm_password: formData.confirm_password,
      role: accountRole,
    };

    if (accountRole === 'MANAGER') payload.department = Number(formData.department);
    if (accountRole === 'EMPLOYEE') {
      payload.employee_profile = {
        employee_id: formData.employee_id,
        job_role: Number(formData.job_role),
        joining_date: formData.joining_date,
        ...(!isManager ? { department: Number(formData.department) } : {}),
      };
    }

    try {
      const { data } = await api.post('/auth/accounts/', payload);
      setMessage(`${data.full_name} was created successfully.`);
      resetForm();
      setListLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError.response?.data));
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (account) => {
    setEditingId(account.id);
    setFormData({ ...createEmptyForm(), full_name: account.full_name, email: account.email });
    setError('');
    setMessage('');
    window.requestAnimationFrame(() => {
      accountFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      accountFormRef.current?.querySelector('input[name="full_name"]')?.focus();
    });
  };

  const toggleAccountStatus = async (account) => {
    setError('');
    setMessage('');
    setAccountActionId(account.id);
    try {
      await api.patch(`/auth/accounts/${account.id}/`, { is_active: !account.is_active });
      setAccounts((current) => current.map((item) => (
        item.id === account.id ? { ...item, is_active: !account.is_active } : item
      )));
      setMessage(`${account.email} was ${account.is_active ? 'deactivated' : 'activated'}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError.response?.data));
    } finally {
      setAccountActionId(null);
    }
  };

  const selectedDepartment = isManager ? user?.department_id : formData.department;
  const availableJobRoles = jobRoles.filter((item) => String(item.department) === String(selectedDepartment));

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isHRAdmin ? 'Account Management' : 'Create Employee Account'}</h1>
          <p className="page-subtitle">{isHRAdmin ? 'Create and manage database accounts.' : `Provision an employee account for ${user?.department_name || 'your department'}.`}</p>
        </div>
      </div>

      {(error || message) && <div className={`card ${error ? 'text-danger' : ''}`} role={error ? 'alert' : 'status'} style={{ marginBottom: '18px' }}>{error || message}</div>}

      <form ref={accountFormRef} className="card form-grid" onSubmit={handleSubmit}>
        <h2 className="card-title">{editingId ? 'Edit Account' : isManager ? 'New Employee Login' : 'Create Account'}</h2>
        <label className="form-group">
          <span className="form-label">Full name</span>
          <input className="form-control" name="full_name" value={formData.full_name} onChange={handleChange} maxLength={150} required />
        </label>
        <label className="form-group">
          <span className="form-label">Email</span>
          <input className="form-control" type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>

        {!editingId && (
          <>
            {!isManager && (
              <label className="form-group">
                <span className="form-label">Account type</span>
                <select className="form-control" name="role" value={formData.role} onChange={handleChange}>
                  <option value="HR_ADMIN">HR</option>
                  <option value="MANAGER">Manager</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </label>
            )}
            {(formData.role === 'MANAGER' || (formData.role === 'EMPLOYEE' && !isManager)) && (
              <label className="form-group">
                <span className="form-label">Department</span>
                <select className="form-control" name="department" value={formData.department} onChange={handleChange} required>
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.department_name}</option>)}
                </select>
              </label>
            )}
            {formData.role === 'EMPLOYEE' && (
              <>
                <label className="form-group">
                  <span className="form-label">Employee ID</span>
                  <input className="form-control" name="employee_id" value={formData.employee_id} onChange={handleChange} maxLength={30} required />
                </label>
                <label className="form-group">
                  <span className="form-label">Job role</span>
                  <select className="form-control" name="job_role" value={formData.job_role} onChange={handleChange} required>
                    <option value="">Select job role</option>
                    {availableJobRoles.map((jobRole) => <option key={jobRole.id} value={jobRole.id}>{jobRole.role_name}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span className="form-label">Joining date</span>
                  <input className="form-control" type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} required />
                </label>
              </>
            )}
            <label className="form-group">
              <span className="form-label">Password</span>
              <div className="password-input-wrap">
                <input className="form-control" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} minLength={8} autoComplete="new-password" required />
                <button type="button" className="password-toggle-btn" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="form-group">
              <span className="form-label">Confirm password</span>
              <div className="password-input-wrap">
                <input className="form-control" type={showConfirmPassword ? 'text' : 'password'} name="confirm_password" value={formData.confirm_password} onChange={handleChange} minLength={8} autoComplete="new-password" required />
                <button type="button" className="password-toggle-btn" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirmPassword((current) => !current)}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </>
        )}

        {editingId && (
          <>
            <label className="form-group">
              <span className="form-label">New password (optional)</span>
              <div className="password-input-wrap">
                <input className="form-control" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} minLength={8} autoComplete="new-password" placeholder="Leave blank to keep current password" />
                <button type="button" className="password-toggle-btn" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="form-group">
              <span className="form-label">Confirm new password</span>
              <div className="password-input-wrap">
                <input className="form-control" type={showConfirmPassword ? 'text' : 'password'} name="confirm_password" value={formData.confirm_password} onChange={handleChange} minLength={8} autoComplete="new-password" placeholder="Leave blank to keep current password" />
                <button type="button" className="password-toggle-btn" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirmPassword((current) => !current)}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </>
        )}

        <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {editingId ? <Check size={16} /> : <UserPlus size={16} />}
            {loading ? 'Saving...' : editingId ? 'Save Changes' : isManager ? 'Create Employee Account' : 'Create Account'}
          </button>
          {editingId && <button className="btn btn-secondary" type="button" onClick={resetForm}><X size={16} /> Cancel</button>}
        </div>
      </form>

      {isHRAdmin && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <div><h2 className="card-title">Managed Accounts</h2><p className="card-subtitle">Search, edit, activate, or deactivate accounts.</p></div>
            <label className="search-box">
              <Search size={16} aria-hidden="true" />
              <input className="form-control" type="search" value={search} onChange={(event) => { setListLoading(true); setSearch(event.target.value); }} placeholder="Search accounts" />
            </label>
          </div>
          {listLoading ? <p>Loading accounts...</p> : accounts.length === 0 ? <p>No accounts found.</p> : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Created by</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.full_name || '—'}</td>
                      <td>{account.email}</td>
                      <td>{account.role === 'HR_ADMIN' ? 'HR' : account.role === 'MANAGER' ? 'Manager' : 'Employee'}</td>
                      <td>{account.department_name || '—'}</td>
                      <td>{account.created_by_name || 'Initial account'}</td>
                      <td><span className={`badge ${account.is_active ? 'badge-success' : 'badge-danger'}`}>{account.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td><div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn-icon" title="Edit account" aria-label={`Edit ${account.email}`} onClick={() => startEditing(account)}><Edit3 size={15} /></button>
                        <button type="button" className="btn-icon" title={account.is_active ? 'Deactivate account' : 'Activate account'} aria-label={`${account.is_active ? 'Deactivate' : 'Activate'} ${account.email}`} disabled={accountActionId === account.id} onClick={() => toggleAccountStatus(account)}>{account.is_active ? <Ban size={15} /> : <Check size={15} />}</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        .password-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .password-input-wrap .form-control {
          padding-right: 38px;
        }
        .password-toggle-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: var(--text-dim);
          cursor: pointer;
          padding: 0;
        }
        .password-toggle-btn:hover {
          color: var(--text-main);
        }
      `}</style>
    </section>
  );
}