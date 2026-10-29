import React, { useState, useEffect } from 'react';
import { DollarSign, BarChart3, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line
} from 'recharts';
import api from '../services/api';
import { useFilters } from '../context/FilterContext';
import FilterPanel from '../components/common/FilterPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function SalaryAnalytics() {
  const { getQueryString } = useFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = getQueryString();
        const res = await api.get(`/analytics/salary/${q ? `?${q}` : ''}`);
        setData(res.data);
      } catch (err) {
        console.error("Error loading salary analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getQueryString]);

  if (loading) return <LoadingSpinner message="Calculating compensation percentiles and salary metrics..." />;

  return (
    <div className="salary-analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compensation &amp; Salary Analytics</h1>
          <p className="page-subtitle">
            Department compensation structures, experience pay progression, and wage variance
          </p>
        </div>
      </div>

      <FilterPanel />

      <div className="kpi-grid">
        <div className="kpi-card primary">
          <span className="kpi-label">Average Annual Salary</span>
          <div className="kpi-value">₹{Number(data?.average_salary || 0).toLocaleString('en-IN')}</div>
          <span className="kpi-subtext">Overall workforce mean</span>
        </div>
        <div className="kpi-card success">
          <span className="kpi-label">Maximum Base Salary</span>
          <div className="kpi-value">₹{Number(data?.max_salary || 0).toLocaleString('en-IN')}</div>
          <span className="kpi-subtext">Peak tier compensation</span>
        </div>
        <div className="kpi-card warning">
          <span className="kpi-label">Minimum Base Salary</span>
          <div className="kpi-value">₹{Number(data?.min_salary || 0).toLocaleString('en-IN')}</div>
          <span className="kpi-subtext">Base tier entry compensation</span>
        </div>
      </div>

      <div className="charts-grid">
        {/* Salary by Department */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Average Salary by Department</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.by_department} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="department" angle={-15} textAnchor="end" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="avg_salary" name="Avg Salary" fill="#D97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary vs Experience Curve */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><TrendingUp size={18} className="text-primary" /> Salary Progression by Experience</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data?.salary_vs_experience} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="experience_bracket" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="avg_salary" name="Avg Salary" stroke="#16A34A" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
