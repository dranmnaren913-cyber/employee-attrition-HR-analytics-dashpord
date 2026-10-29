import React, { useState, useEffect } from 'react';
import { Smile, BarChart3, Heart, Coffee } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend
} from 'recharts';
import api from '../services/api';
import { useFilters } from '../context/FilterContext';
import FilterPanel from '../components/common/FilterPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function SatisfactionAnalytics() {
  const { getQueryString } = useFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = getQueryString();
        const res = await api.get(`/analytics/satisfaction/${q ? `?${q}` : ''}`);
        setData(res.data);
      } catch (err) {
        console.error("Error loading satisfaction analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getQueryString]);

  if (loading) return <LoadingSpinner message="Calculating employee sentiment & work-life balance scores..." />;

  return (
    <div className="satisfaction-analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Satisfaction &amp; Morale</h1>
          <p className="page-subtitle">
            Pulse feedback distributions, work-life balance ratings, and departmental morale comparisons
          </p>
        </div>
      </div>

      <FilterPanel />

      <div className="kpi-grid">
        <div className="kpi-card purple">
          <span className="kpi-label">Average Satisfaction Rating</span>
          <div className="kpi-value">{data?.average_satisfaction} / 5.0</div>
          <span className="kpi-subtext">Overall workplace sentiment</span>
        </div>
        <div className="kpi-card success">
          <span className="kpi-label">Work-Life Balance Rating</span>
          <div className="kpi-value">{data?.average_work_life_balance} / 5.0</div>
          <span className="kpi-subtext">Employee schedule equilibrium</span>
        </div>
      </div>

      <div className="charts-grid">
        {/* Department Satisfaction & WLB */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Satisfaction &amp; Work-Life by Department</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.by_department} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="department" angle={-15} textAnchor="end" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="avg_satisfaction" name="Satisfaction (1-5)" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg_work_life_balance" name="Work-Life Balance (1-5)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><Smile size={18} className="text-primary" /> Satisfaction Rating Distribution</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="count" name="Employees" fill="#EC4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
