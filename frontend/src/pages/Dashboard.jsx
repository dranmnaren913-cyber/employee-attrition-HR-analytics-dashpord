import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, TrendingDown, DollarSign,
  Smile, Award, AlertTriangle, RefreshCw, BarChart3,
  PieChart as PieIcon, TrendingUp, Layers, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid
} from 'recharts';
import api from '../services/api';
import { useFilters } from '../context/FilterContext';
import FilterPanel from '../components/common/FilterPanel';
import KPICard from '../components/common/KPICard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

const PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
const GENDER_COLORS = { Male: '#3B82F6', Female: '#EC4899', Other: '#8B5CF6' };

export default function Dashboard() {
  const { role } = useAuth();
  const { getQueryString, resetFilters } = useFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = getQueryString();
      const url = `/analytics/overview/${q ? `?${q}` : ''}`;
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error("Dashboard analytics error:", err);
      setError("Failed to fetch analytics from Django REST backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [getQueryString]);

  if (loading && !data) {
    return (
      <div>
        <FilterPanel />
        <LoadingSpinner message="Calculating real-time HR metrics and attrition analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
        <button onClick={fetchAnalytics} className="btn btn-primary" style={{ marginTop: '16px' }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive HR Analytics Dashboard</h1>
          <p className="page-subtitle">
            Enterprise employee attrition monitoring, talent retention signals, and predictive ML insights
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {role === 'HR_ADMIN' && (
            <>
              <Link to="/accounts?role=MANAGER" className="btn btn-primary btn-sm">Create Manager Account</Link>
              <Link to="/accounts?role=EMPLOYEE" className="btn btn-secondary btn-sm">Create Employee Account</Link>
            </>
          )}
          <button type="button" onClick={fetchAnalytics} className="btn btn-secondary btn-sm" title="Refresh metrics" disabled={loading} aria-busy={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Global Filter System */}
      <FilterPanel />

      {/* 8 KPI Cards Section */}
      <div className="kpi-grid">
        <KPICard
          label="Total Headcount"
          value={kpis.total_employees ?? 0}
          subtext="Total workforce database"
          icon={Users}
          variant="primary"
        />
        <KPICard
          label="Active Staff"
          value={kpis.active_employees ?? 0}
          subtext="Retained & on payroll"
          icon={UserCheck}
          variant="success"
        />
        <KPICard
          label="Employees Who Left"
          value={kpis.attrited_employees ?? 0}
          subtext="Resigned or terminated"
          icon={UserX}
          variant="danger"
        />
        <KPICard
          label="Overall Attrition Rate"
          value={`${kpis.attrition_rate ?? 0}%`}
          subtext="Benchmarked metric"
          icon={TrendingDown}
          variant={kpis.attrition_rate > 20 ? 'danger' : 'warning'}
          badgeText={kpis.attrition_rate > 20 ? 'Elevated' : 'Normal'}
        />
        <KPICard
          label="Average Annual Salary"
          value={`₹${Number(kpis.average_salary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtext="Mean compensation"
          icon={DollarSign}
          variant="primary"
        />
        <KPICard
          label="Satisfaction Index"
          value={`${kpis.average_satisfaction ?? 0} / 5`}
          subtext="Workforce morale"
          icon={Smile}
          variant="purple"
        />
        <KPICard
          label="Avg Performance"
          value={`${kpis.average_performance ?? 0} / 5`}
          subtext="Review calibration"
          icon={Award}
          variant="success"
        />
        <KPICard
          label="High-Risk Employees"
          value={kpis.high_risk_count ?? 0}
          subtext="ML flight alert (&gt;65%)"
          icon={AlertTriangle}
          variant="danger"
          badgeText="Action Needed"
        />
      </div>

      {/* Visualizations Section */}
      {kpis.total_employees === 0 ? (
        <EmptyState onReset={resetFilters} />
      ) : (
        <>
          {/* Row 1: Department & Job Role Attrition */}
          <div className="charts-grid">
            {/* Chart 1: Attrition by Department */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Attrition by Department</h3>
                  <p className="card-subtitle">Active staff vs attrition count by department</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.attrition_by_department} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="department" angle={-15} textAnchor="end" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="active" name="Active Staff" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="attrited" name="Attrited Staff" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Attrition Rate by Job Role */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Attrition Rate by Job Role (%)</h3>
                  <p className="card-subtitle">Percentage turnover across organizational roles</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.attrition_by_role} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis dataKey="role" type="category" width={110} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="attrition_rate" name="Turnover %" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Demographic & Age Breakdown */}
          <div className="charts-grid">
            {/* Chart 3: Attrition by Gender */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><PieIcon size={18} className="text-primary" /> Attrition Turnover by Gender</h3>
                  <p className="card-subtitle">Distribution of departures across genders</p>
                </div>
              </div>
              <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={charts.attrition_by_gender}
                      dataKey="attrited"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      label={({ gender, percent }) => `${gender} ${(percent * 100).toFixed(0)}%`}
                    >
                      {charts.attrition_by_gender?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={GENDER_COLORS[entry.gender] || PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Attrition by Age Group */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Attrition by Age Bracket</h3>
                  <p className="card-subtitle">Turnover rate by workforce age group</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.attrition_by_age_group} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="age_group" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="attrition_rate" name="Turnover Rate %" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Compensation & Experience vs Attrition */}
          <div className="charts-grid">
            {/* Chart 5: Salary Range vs Attrition */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><DollarSign size={18} className="text-primary" /> Salary Tier vs Attrition Rate</h3>
                  <p className="card-subtitle">Turnover percentage relative to compensation level</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.salary_vs_attrition} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="salary_range" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="attrition_rate" name="Turnover Rate %" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Experience vs Attrition */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><TrendingUp size={18} className="text-primary" /> Tenure &amp; Experience Flight Risk</h3>
                  <p className="card-subtitle">Turnover rate by career experience bracket</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={charts.experience_vs_attrition} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="experience_bracket" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="attrition_rate" name="Turnover %" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 4: Satisfaction, Performance & Attrition Trend */}
          <div className="charts-grid">
            {/* Chart 7: Satisfaction vs Attrition */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><Smile size={18} className="text-primary" /> Satisfaction vs Attrition Rate</h3>
                  <p className="card-subtitle">Turnover correlation with employee satisfaction rating</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.satisfaction_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="attrition_rate" name="Turnover %" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 9: Attrition Trend over Cohort Years */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title"><Layers size={18} className="text-primary" /> Attrition Trend Over Time</h3>
                  <p className="card-subtitle">Cohort joining year retention vs attrition</p>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={charts.attrition_trend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="retained" name="Retained Staff" stackId="1" stroke="#2563EB" fill="#2563EB" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="attrited" name="Departures" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.8} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart 10: Department Risk Heatmap & Matrix */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title"><Layers size={18} className="text-primary" /> Department Risk Heatmap &amp; Concentration Matrix</h3>
                <p className="card-subtitle">Comprehensive cross-tabulation of department health, turnover, satisfaction, and ML risk</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Total Staff</th>
                    <th>Observed Turnover</th>
                    <th>ML High-Risk Staff %</th>
                    <th>Avg Satisfaction</th>
                    <th>Avg Compensation</th>
                    <th>Risk Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {charts.department_heatmap?.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.department}</strong></td>
                      <td>{item.total}</td>
                      <td>
                        <span style={{ color: item.attrition_rate > 20 ? 'var(--danger)' : 'var(--text-main)', fontWeight: 600 }}>
                          {item.attrition_rate}%
                        </span>
                      </td>
                      <td>
                        <span style={{ color: item.high_risk_percentage > 15 ? 'var(--danger)' : 'var(--text-main)', fontWeight: 600 }}>
                          {item.high_risk_percentage}%
                        </span>
                      </td>
                      <td>{item.avg_satisfaction} / 5</td>
                      <td>₹{Number(item.avg_salary || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${
                          item.risk_intensity === 'High' ? 'badge-danger' :
                          item.risk_intensity === 'Medium' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {item.risk_intensity} Risk
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
