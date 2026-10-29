import React, { useState, useEffect } from 'react';
import { Award, BarChart3, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line
} from 'recharts';
import api from '../services/api';
import { useFilters } from '../context/FilterContext';
import FilterPanel from '../components/common/FilterPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PerformanceAnalytics() {
  const { getQueryString } = useFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = getQueryString();
        const res = await api.get(`/analytics/performance/${q ? `?${q}` : ''}`);
        setData(res.data);
      } catch (err) {
        console.error("Error loading performance analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getQueryString]);

  if (loading) return <LoadingSpinner message="Calculating performance calibration metrics..." />;

  return (
    <div className="performance-analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance Analytics &amp; Appraisals</h1>
          <p className="page-subtitle">
            Workforce appraisal distributions, departmental performance scores, and satisfaction cross-analysis
          </p>
        </div>
      </div>

      <FilterPanel />

      <div className="kpi-grid">
        <div className="kpi-card success">
          <span className="kpi-label">Average Performance Rating</span>
          <div className="kpi-value">{data?.average_performance} / 5.0</div>
          <span className="kpi-subtext">Overall organizational rating</span>
        </div>
        <div className="kpi-card primary">
          <span className="kpi-label">Staff Evaluated</span>
          <div className="kpi-value">{data?.total_evaluated}</div>
          <span className="kpi-subtext">Active appraisal pool</span>
        </div>
      </div>

      <div className="charts-grid">
        {/* Performance by Department */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Average Performance by Department</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.by_department} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="department" angle={-15} textAnchor="end" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="average_performance" name="Avg Score" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Performance Rating Distribution (1-5)</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="level" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="count" name="Employees" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance vs Satisfaction Line */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 className="card-title"><TrendingUp size={18} className="text-primary" /> Performance vs Employee Satisfaction Correlation</h3>
        </div>
        <div className="chart-container" style={{ minHeight: '260px' }}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.performance_vs_satisfaction} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="performance_level" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="avg_satisfaction" name="Avg Satisfaction (1-5)" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
