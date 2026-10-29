import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { role, user } = useAuth();
  const isManager = role === 'MANAGER';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    age: 30,
    education: 'Bachelor',
    department: '',
    job_role: '',
    joining_date: new Date().toISOString().split('T')[0],
    experience: 2.0,
    salary: 55000,
    performance_score: 3,
    satisfaction_score: 3,
    work_life_balance: 3,
    overtime: 'No',
    employment_status: 'Active',
    attrition_status: 'No',
  });

  const [departments, setDepartments] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          api.get('/departments/'),
          api.get('/job-roles/')
        ]);
        const deptList = deptRes.data.results || deptRes.data || [];
        const roleList = roleRes.data.results || roleRes.data || [];
        setDepartments(deptList);
        setJobRoles(roleList);

        if (isEdit) {
          const empRes = await api.get(`/employees/${id}/`);
          const d = empRes.data;
          const departmentId = isManager ? user?.department_id : d.department;
          setFormData({
            employee_id: d.employee_id || '',
            name: d.name || '',
            email: d.email || '',
            phone: d.phone || '',
            gender: d.gender || 'Male',
            age: d.age || 30,
            education: d.education || 'Bachelor',
            department: departmentId || '',
            job_role: d.job_role || roleList.find((item) => String(item.department) === String(departmentId))?.id || '',
            joining_date: d.joining_date || new Date().toISOString().split('T')[0],
            experience: d.experience || 2.0,
            salary: d.salary || 55000,
            performance_score: d.performance_score || 3,
            satisfaction_score: d.satisfaction_score || 3,
            work_life_balance: d.work_life_balance || 3,
            overtime: d.overtime || 'No',
            employment_status: d.employment_status || 'Active',
            attrition_status: d.attrition_status || 'No',
          });
        } else if (deptList.length > 0) {
          setFormData(prev => ({
            ...prev,
            department: deptList[0].id,
            job_role: roleList.find(r => r.department === deptList[0].id)?.id || ''
          }));
        }
      } catch (err) {
        console.error("Error loading employee data:", err);
        setServerError("Failed to load form metadata.");
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [id, isEdit, isManager, user?.department_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    const matchingRoles = jobRoles.filter(r => String(r.department) === String(deptId));
    setFormData(prev => ({
      ...prev,
      department: deptId,
      job_role: matchingRoles.length > 0 ? matchingRoles[0].id : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/employees/${id}/`, formData);
      } else {
        await api.post('/employees/', formData);
      }
      navigate('/employees');
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setServerError("Failed to save employee record.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <LoadingSpinner message="Loading employee information..." />;
  }

  const availableRoles = formData.department
    ? jobRoles.filter(r => String(r.department) === String(formData.department))
    : jobRoles;

  return (
    <div className="employee-form-page">
      <div className="page-header">
        <div>
          <Link to="/employees" className="btn btn-secondary btn-sm" style={{ marginBottom: '8px' }}>
            <ArrowLeft size={14} /> Back to Directory
          </Link>
          <h1 className="page-title">{isEdit ? 'Update Employee Profile' : 'Add New Employee'}</h1>
          <p className="page-subtitle">
            {isEdit ? `Editing record for ${formData.name} (${formData.employee_id})` : 'Fill out personal, job, and compensation details'}
          </p>
        </div>
      </div>

      {serverError && (
        <div className="card" style={{ backgroundColor: 'var(--danger-light)', borderColor: 'var(--danger)', color: 'var(--danger-text)', marginBottom: '20px' }}>
          <AlertCircle size={18} /> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card employee-form-card">
        {/* Section 1: Basic Identifiers */}
        <h3 className="section-title">1. Personal &amp; Identification Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employee ID *</label>
            <input
              type="text"
              name="employee_id"
              required
              disabled={isEdit}
              className={`form-control ${errors.employee_id ? 'is-invalid' : ''}`}
              placeholder="e.g. EMP1001"
              value={formData.employee_id}
              onChange={handleChange}
            />
            {errors.employee_id && <span className="field-error">{errors.employee_id[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              name="name"
              required
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Jane Doe"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <span className="field-error">{errors.name[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              name="email"
              required
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="jane.doe@company.com"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <span className="field-error">{errors.email[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              name="phone"
              className="form-control"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select name="gender" className="form-control" value={formData.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Age (Years) *</label>
            <input
              type="number"
              name="age"
              required
              min={18}
              max={80}
              className="form-control"
              value={formData.age}
              onChange={handleChange}
            />
            {errors.age && <span className="field-error">{errors.age[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Education Level</label>
            <select name="education" className="form-control" value={formData.education} onChange={handleChange}>
              <option value="Bachelor">Bachelor's Degree</option>
              <option value="Master">Master's Degree</option>
              <option value="Doctorate">Doctorate (PhD)</option>
              <option value="Associate Degree">Associate Degree</option>
              <option value="High School">High School Diploma</option>
            </select>
          </div>
        </div>

        <div className="form-divider" />

        {/* Section 2: Department & Role */}
        <h3 className="section-title">2. Organization &amp; Job Placement</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Department *</label>
            <select
              name="department"
              required
              disabled={isManager}
              className="form-control"
              value={formData.department}
              onChange={handleDepartmentChange}
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.department_name}</option>
              ))}
            </select>
            {errors.department && <span className="field-error">{errors.department[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Job Role *</label>
            <select
              name="job_role"
              required
              className="form-control"
              value={formData.job_role}
              onChange={handleChange}
            >
              <option value="">Select Job Role</option>
              {availableRoles.map(r => (
                <option key={r.id} value={r.id}>{r.role_name}</option>
              ))}
            </select>
            {errors.job_role && <span className="field-error">{errors.job_role[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Joining Date *</label>
            <input
              type="date"
              name="joining_date"
              required
              className="form-control"
              value={formData.joining_date}
              onChange={handleChange}
            />
            {errors.joining_date && <span className="field-error">{errors.joining_date[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Total Experience (Years) *</label>
            <input
              type="number"
              step="0.5"
              min="0"
              name="experience"
              required
              className="form-control"
              value={formData.experience}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-divider" />

        {/* Section 3: Compensation & Sentiment */}
        <h3 className="section-title">3. Compensation, Engagement &amp; Retention Signals</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Annual Salary (₹) *</label>
            <input
              type="number"
              step="500"
              min="1000"
              name="salary"
              required
              className="form-control"
              value={formData.salary}
              onChange={handleChange}
            />
            {errors.salary && <span className="field-error">{errors.salary[0]}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Performance Rating (1 to 5) *</label>
            <select name="performance_score" className="form-control" value={formData.performance_score} onChange={handleChange}>
              <option value={1}>1 - Unsatisfactory</option>
              <option value={2}>2 - Needs Improvement</option>
              <option value={3}>3 - Meets Expectations</option>
              <option value={4}>4 - Exceeds Expectations</option>
              <option value={5}>5 - Outstanding</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Satisfaction Score (1 to 5) *</label>
            <select name="satisfaction_score" className="form-control" value={formData.satisfaction_score} onChange={handleChange}>
              <option value={1}>1 - Highly Dissatisfied</option>
              <option value={2}>2 - Dissatisfied</option>
              <option value={3}>3 - Neutral</option>
              <option value={4}>4 - Satisfied</option>
              <option value={5}>5 - Highly Satisfied</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Work-Life Balance (1 to 5) *</label>
            <select name="work_life_balance" className="form-control" value={formData.work_life_balance} onChange={handleChange}>
              <option value={1}>1 - Very Poor</option>
              <option value={2}>2 - Poor</option>
              <option value={3}>3 - Average</option>
              <option value={4}>4 - Good</option>
              <option value={5}>5 - Excellent</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Overtime Demands</label>
            <select name="overtime" className="form-control" value={formData.overtime} onChange={handleChange}>
              <option value="No">No (Standard 40h/week)</option>
              <option value="Yes">Yes (Frequent Overtime)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Employment Status</label>
            <select name="employment_status" className="form-control" value={formData.employment_status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Resigned">Resigned</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Attrition Status</label>
            <select name="attrition_status" className="form-control" value={formData.attrition_status} onChange={handleChange}>
              <option value="No">No (Active / Retained)</option>
              <option value="Yes">Yes (Departed Staff)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Link to="/employees" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Save size={16} /> {loading ? 'Saving...' : (isEdit ? 'Update Employee' : 'Save Employee')}
          </button>
        </div>
      </form>

      <style>{`
        .section-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .form-divider {
          height: 1px;
          background: var(--border-color);
          margin: 24px 0;
        }
        .field-error {
          font-size: 0.75rem;
          color: var(--danger);
          margin-top: 4px;
          display: block;
        }
      `}</style>
    </div>
  );
}
