import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FilterProvider } from './context/FilterContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoadingSpinner from './components/common/LoadingSpinner';
import api from './services/api';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const EmployeeList = lazy(() => import('./pages/EmployeeList'));
const EmployeeForm = lazy(() => import('./pages/EmployeeForm'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const Departments = lazy(() => import('./pages/Departments'));
const AttritionAnalytics = lazy(() => import('./pages/AttritionAnalytics'));
const PerformanceAnalytics = lazy(() => import('./pages/PerformanceAnalytics'));
const SalaryAnalytics = lazy(() => import('./pages/SalaryAnalytics'));
const SatisfactionAnalytics = lazy(() => import('./pages/SatisfactionAnalytics'));
const Predictions = lazy(() => import('./pages/Predictions'));
const Reports = lazy(() => import('./pages/Reports'));
const Accounts = lazy(() => import('./pages/Accounts'));

function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner message="Checking your session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Checking your session..." />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function RequireRole({ allowed, children }) {
  const { role } = useAuth();
  if (!allowed.includes(role)) {
    return (
      <section className="card" role="alert">
        <h1 className="page-title">Access restricted</h1>
        <p className="page-subtitle">Your account does not have permission to open this page.</p>
        <Link className="btn btn-primary" to="/dashboard">Return to dashboard</Link>
      </section>
    );
  }
  return children;
}

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/me/').then(({ data }) => {
      setProfile(data);
      setFullName(data.full_name || '');
      setEmail(data.email || '');
    }).catch(() => setError('Could not load your profile.'));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const result = await updateProfile({
        full_name: fullName,
        ...(user?.role === 'HR_ADMIN' ? { email } : {}),
      });
      setProfile(result.user);
      setEmail(result.user.email || '');
      setMessage('Profile updated.');
    } catch (requestError) {
      const details = requestError.response?.data;
      setError(details?.email?.[0] || details?.full_name?.[0] || 'Could not update your profile.');
    }
  };

  if (!profile && !error) return <LoadingSpinner message="Loading your profile..." />;

  return (
    <section className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">My Profile</h1><p className="page-subtitle">Personal and employment information</p></div>
      </div>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {profile && (
        <div className="card">
          <form onSubmit={handleSubmit} className="form-grid">
            <label className="form-group"><span className="form-label">Full name</span><input className="form-control" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={150} /></label>
            <label className="form-group"><span className="form-label">Email</span><input className="form-control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={user?.role !== 'HR_ADMIN'} required /></label>
            <label className="form-group"><span className="form-label">Role</span><input className="form-control" value={profile.role} readOnly /></label>
            <label className="form-group"><span className="form-label">Department</span><input className="form-control" value={user?.role === 'HR_ADMIN' ? 'Head of all departments' : (profile.department_name || profile.employee_details?.department || 'Not assigned')} readOnly /></label>
            {profile.employee_details && Object.entries(profile.employee_details).filter(([key]) => ['employee_id', 'job_role', 'employment_status', 'performance_score', 'satisfaction_score'].includes(key)).map(([key, value]) => (
              <label className="form-group" key={key}><span className="form-label">{key.replaceAll('_', ' ')}</span><input className="form-control" value={value ?? ''} readOnly /></label>
            ))}
            <div className="form-group"><button className="btn btn-primary" type="submit">Save profile</button>{message && <span role="status"> {message}</span>}</div>
          </form>
        </div>
      )}
    </section>
  );
}

function SettingsPage() {
  const { theme, toggleTheme } = useAuth();
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('hr-dashboard-settings');
    return saved ? JSON.parse(saved) : {
      density: 'comfortable',
      defaultPage: 'dashboard',
      autoRefresh: true,
      emailAlerts: true,
      weeklyDigest: false,
    };
  });

  useEffect(() => {
    localStorage.setItem('hr-dashboard-settings', JSON.stringify(preferences));
  }, [preferences]);

  const togglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Personal dashboard preferences</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
        <div>
          <h2 className="card-title">Appearance</h2>
          <p className="card-subtitle">Current theme: {theme}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={toggleTheme}>
          Switch to {theme === 'light' ? 'dark' : 'light'} mode
        </button>
      </div>

      <div className="card" style={{ display: 'grid', gap: '18px' }}>
        <div>
          <h2 className="card-title">Dashboard preferences</h2>
          <p className="card-subtitle">Adjust your working style and alerts</p>
        </div>

        <div className="form-group">
          <label className="form-label">Layout density</label>
          <select
            className="form-control"
            value={preferences.density}
            onChange={(event) => setPreferences((prev) => ({ ...prev, density: event.target.value }))}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Default landing page</label>
          <select
            className="form-control"
            value={preferences.defaultPage}
            onChange={(event) => setPreferences((prev) => ({ ...prev, defaultPage: event.target.value }))}
          >
            <option value="dashboard">Dashboard</option>
            <option value="employees">Employees</option>
            <option value="profile">Profile</option>
          </select>
        </div>

        <div className="form-group" style={{ display: 'grid', gap: '12px' }}>
          <label className="form-label">Notifications</label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Auto refresh analytics</span>
            <input type="checkbox" checked={preferences.autoRefresh} onChange={() => togglePreference('autoRefresh')} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Email alerts</span>
            <input type="checkbox" checked={preferences.emailAlerts} onChange={() => togglePreference('emailAlerts')} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Weekly summary digest</span>
            <input type="checkbox" checked={preferences.weeklyDigest} onChange={() => togglePreference('weeklyDigest')} />
          </label>
        </div>
      </div>
    </section>
  );
}

function NotFound() {
  return <main className="page-content"><h1 className="page-title">Page not found</h1><Link to="/dashboard">Return to dashboard</Link></main>;
}

function HomeRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading HR Analytics..." />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

const ADMIN_MANAGER = ['HR_ADMIN', 'MANAGER'];

function RoleDashboard() {
  const { role } = useAuth();
  return role === 'MANAGER' ? <ManagerDashboard /> : <Dashboard />;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route element={<RequireAuth />}>
        <Route element={<FilterProvider><DashboardLayout /></FilterProvider>}>
          <Route path="dashboard" element={<RoleDashboard />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/new" element={<RequireRole allowed={['HR_ADMIN']}><EmployeeForm /></RequireRole>} />
          <Route path="employees/:id/edit" element={<RequireRole allowed={ADMIN_MANAGER}><EmployeeForm /></RequireRole>} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="departments" element={<RequireRole allowed={ADMIN_MANAGER}><Departments /></RequireRole>} />
          <Route path="analytics/attrition" element={<RequireRole allowed={ADMIN_MANAGER}><AttritionAnalytics /></RequireRole>} />
          <Route path="analytics/performance" element={<PerformanceAnalytics />} />
          <Route path="analytics/salary" element={<RequireRole allowed={['HR_ADMIN']}><SalaryAnalytics /></RequireRole>} />
          <Route path="analytics/satisfaction" element={<SatisfactionAnalytics />} />
          <Route path="predictions" element={<RequireRole allowed={ADMIN_MANAGER}><Predictions /></RequireRole>} />
          <Route path="reports" element={<RequireRole allowed={ADMIN_MANAGER}><Reports /></RequireRole>} />
          <Route path="accounts" element={<RequireRole allowed={ADMIN_MANAGER}><Accounts /></RequireRole>} />
          <Route path="import-export" element={<RequireRole allowed={['HR_ADMIN']}><Navigate to="/employees" replace /></RequireRole>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
