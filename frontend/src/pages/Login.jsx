import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, Eye, EyeOff, ShieldCheck, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [selectedRole, setSelectedRole] = useState('HR_ADMIN');
  
  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: send email, 2: enter code & new pass

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isCreatingAccount) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await api.post('/auth/register-hr/', {
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
        });
        setIsCreatingAccount(false);
        setPassword('');
        setConfirmPassword('');
        setSuccess('HR account created. You can now sign in.');
        return;
      }

      await login(email, password, selectedRole);
      navigate('/dashboard');
    } catch (err) {
      const responseError = err.response?.data;
      setError(responseError?.detail || responseError?.email?.[0] || responseError?.password?.[0] ||
        responseError?.confirm_password?.[0] || responseError?.non_field_errors?.[0] || (isCreatingAccount
          ? 'Could not create the account. Check the details and try again.'
          : 'Invalid email or password. Please verify your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role) => {
    setSelectedRole(role);
    setIsCreatingAccount(false);
    setError('');
    setSuccess('');
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMsg('');
    setForgotError('');
    try {
      const res = await api.post('/auth/forgot-password/', { email: forgotEmail });
      setForgotMsg(res.data.message);
      if (res.data.reset_code) {
        setResetCode(res.data.reset_code);
      }
      setResetStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Could not request a reset code. Check the email and try again.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setForgotMsg('');
    setForgotError('');
    try {
      const res = await api.post('/auth/reset-password/', {
        email: forgotEmail,
        token: resetCode,
        new_password: newPassword
      });
      setForgotModalOpen(false);
      setResetStep(1);
      setForgotMsg('');
      setForgotError('');
      setSuccess(res.data.message);
    } catch (err) {
      setForgotError(err.response?.data?.error || err.response?.data?.new_password?.[0] || 'Password reset failed. Check the code and try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card-container">
        {/* Brand Banner */}
        <div className="login-brand-header">
          <div className="login-logo-box">
            <Activity size={28} color="#FFFFFF" />
          </div>
          <h1 className="login-title">HR Analytics &amp; Attrition AI</h1>
          <p className="login-subtitle">Intelligent workforce insights, attrition risk modeling &amp; human capital analytics</p>
        </div>

        {!isCreatingAccount && <div className="demo-credentials-bar">
          <span className="demo-header-label">Sign in as:</span>
          <div className="demo-buttons-row">
            <button
              type="button"
              onClick={() => selectRole('HR_ADMIN')}
              className={`demo-role-btn admin ${selectedRole === 'HR_ADMIN' ? 'selected' : ''}`}
            >
              <ShieldCheck size={14} /> HR
            </button>
            <button
              type="button"
              onClick={() => selectRole('MANAGER')}
              className={`demo-role-btn manager ${selectedRole === 'MANAGER' ? 'selected' : ''}`}
            >
              <UserCheck size={14} /> Manager
            </button>
            <button
              type="button"
              onClick={() => selectRole('EMPLOYEE')}
              className={`demo-role-btn employee ${selectedRole === 'EMPLOYEE' ? 'selected' : ''}`}
            >
              <UserCheck size={14} /> Employee
            </button>
          </div>
        </div>}

        {success && <div role="status" style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: 'var(--success-light)', color: 'var(--success-text)' }}>{success}</div>}
        {error && (
          <div className="login-error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {isCreatingAccount && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                maxLength={150}
                className="form-control"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                required
                className="form-control"
                placeholder="name@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              {!isCreatingAccount && <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotMsg('');
                  setForgotError('');
                  setResetStep(1);
                  setResetCode('');
                  setNewPassword('');
                  setForgotModalOpen(true);
                }}
                className="forgot-link"
              >
                Forgot Password?
              </button>}
            </div>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isCreatingAccount ? 8 : undefined}
                className="form-control"
                placeholder="••••••••••••"
                autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isCreatingAccount && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="form-control"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary login-submit-btn"
          >
            {loading ? (isCreatingAccount ? 'Creating account...' : 'Authenticating...') :
              (isCreatingAccount ? 'Create HR Account' : 'Sign In to Analytics')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isCreatingAccount ? 'Already registered? ' : selectedRole === 'HR_ADMIN' ? 'New HR administrator? ' : 'Accounts are created by HR or your manager.'}
            {(isCreatingAccount || selectedRole === 'HR_ADMIN') && <button
              type="button"
              className="forgot-link"
              onClick={() => {
                setIsCreatingAccount(!isCreatingAccount);
                setError('');
                setSuccess('');
              }}
            >
              {isCreatingAccount ? 'Sign in' : 'Create HR Account'}
            </button>}
          </p>
          <p>Powered by Django REST Framework, React &amp; Scikit-Learn</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="modal-overlay" onClick={() => setForgotModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
              Reset Account Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {resetStep === 1
                ? 'Enter your registered email address to receive a verification reset code.'
                : 'Enter the verification code and your new password.'}
            </p>
              {forgotError && <p role="alert" style={{ color: 'var(--danger-text)', marginBottom: '12px', fontSize: '0.85rem' }}>{forgotError}</p>}
              {forgotMsg && <p role="status" style={{ color: 'var(--success-text)', marginBottom: '12px', fontSize: '0.85rem' }}>{forgotMsg}</p>}

            {resetStep === 1 ? (
              <form onSubmit={handleForgotSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@hranalytics.com"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" onClick={() => setForgotModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Send Code
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit}>
                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-with-icon">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" onClick={() => setForgotModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.08) 0%, transparent 40%),
                      radial-gradient(circle at 90% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 40%),
                      var(--bg-app);
          padding: 24px;
        }
        .login-card-container {
          max-width: 480px;
          width: 100%;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 36px 32px;
          box-shadow: var(--shadow-lg);
        }
        .login-brand-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .login-logo-box {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #2563EB, #7C3AED);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }
        .login-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
        }
        .login-subtitle {
          font-size: 0.825rem;
          color: var(--text-muted);
          margin-top: 6px;
          line-height: 1.4;
        }
        .login-badge-pill {
          display: inline-block;
          margin-top: 10px;
          padding: 3px 12px;
          border-radius: var(--radius-full);
          background-color: var(--purple-light);
          color: var(--purple-text);
          font-size: 0.725rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .demo-credentials-bar {
          background-color: var(--bg-surface-alt);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
          padding: 12px;
          margin-bottom: 20px;
        }
        .demo-header-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          display: block;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .demo-buttons-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .demo-role-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          font-size: 0.785rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-surface);
          color: var(--text-main);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .demo-role-btn:hover {
          border-color: var(--primary);
          background: var(--primary-light);
          color: var(--primary-text);
        }
        .demo-role-btn.selected,
        .demo-role-btn.selected:hover {
          border-color: var(--primary);
          background: var(--primary-light);
          color: var(--primary-text);
          box-shadow: 0 0 0 2px var(--primary-light), 0 0 14px var(--primary);
        }
        .login-error-alert {
          background-color: var(--danger-light);
          color: var(--danger-text);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          margin-bottom: 18px;
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-dim);
          pointer-events: none;
        }
        .input-with-icon .form-control {
          padding-left: 38px;
          padding-right: 38px;
        }
        .password-toggle-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
        }
        .password-toggle-btn:hover {
          color: var(--text-main);
        }
        .forgot-link {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 0.775rem;
          font-weight: 600;
          cursor: pointer;
        }
        .forgot-link:hover {
          text-decoration: underline;
        }
        .login-submit-btn {
          width: 100%;
          padding: 12px;
          font-size: 0.95rem;
          margin-top: 10px;
        }
        .login-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-dim);
        }
      `}</style>
    </div>
  );
}
