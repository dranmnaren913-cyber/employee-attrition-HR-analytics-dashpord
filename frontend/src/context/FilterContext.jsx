import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const FilterContext = createContext(null);

const DEFAULT_FILTERS = {
  department: '',
  job_role: '',
  gender: 'all',
  age_min: '',
  age_max: '',
  salary_min: '',
  salary_max: '',
  experience_min: '',
  experience_max: '',
  employment_status: 'all',
  attrition_status: 'all',
  year: '',
  risk_level: 'all',
};

export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [departments, setDepartments] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          api.get('/departments/'),
          api.get('/job-roles/')
        ]);
        setDepartments(deptRes.data.results || deptRes.data || []);
        setJobRoles(roleRes.data.results || roleRes.data || []);
      } catch (err) {
        console.error("Failed to load filter metadata:", err);
      }
    };

    fetchMetadata();
  }, []);

  const setFilterValue = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const getQueryString = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, val]) => {
      if (val !== '' && val !== 'all' && val !== null && val !== undefined) {
        params.append(key, val);
      }
    });
    return params.toString();
  }, [appliedFilters]);

  const activeFilterCount = Object.entries(appliedFilters).filter(
    ([k, v]) => v !== '' && v !== 'all' && v !== null
  ).length;

  return (
    <FilterContext.Provider
      value={{
        filters,
        appliedFilters,
        setFilterValue,
        applyFilters,
        resetFilters,
        getQueryString,
        activeFilterCount,
        departments,
        jobRoles,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => useContext(FilterContext);
