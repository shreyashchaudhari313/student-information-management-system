import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { request, checkApiHealth } from './api.js';
import {
  IconGraduationCap,
  IconUsers,
  IconBuilding,
  IconLayers,
  IconBookOpen,
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDownload,
  IconSun,
  IconMoon,
  IconTable,
  IconGrid,
  IconCopy,
  IconCheck,
  IconEye,
  IconX,
  IconPhone,
  IconMail,
  IconAlert,
  IconRefresh,
  IconSort,
  IconSparkles
} from './icons.jsx';

const GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0284c7 100%)'
];

function getAvatarStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return { background: GRADIENTS[idx] };
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const emptyStudent = {
  studentId: '',
  name: '',
  email: '',
  department: '',
  section: '',
  semester: '1',
  contact: ''
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('campus_theme') || 'dark');
  const [page, setPage] = useState('overview');
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Filters & Controls
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals & Drawers
  const [form, setForm] = useState(null); // { type: 'student'|'department', student?, department?, values }
  const [profileModal, setProfileModal] = useState(null); // student object
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'student'|'department', item }
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  // Handle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('campus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper for department name resolution
  const getDeptName = (dept) => {
    if (!dept) return 'General';
    if (typeof dept === 'object' && dept.name) return dept.name;
    return String(dept);
  };

  // Load Data & Health Check
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, dRes, health] = await Promise.all([
        request('/api/students').catch(() => ({ data: [] })),
        request('/api/departments').catch(() => null),
        checkApiHealth()
      ]);
      const studentList = sRes.data || [];
      setStudents(studentList);

      if (dRes && Array.isArray(dRes.data) && dRes.data.length > 0) {
        setDepartments(dRes.data);
      } else {
        const studentDepts = [...new Set(studentList.map((s) => getDeptName(s.department)).filter(Boolean))];
        const defaultDepts = studentDepts.length
          ? studentDepts.map((name, i) => ({ _id: `dept_${i}`, name, sections: ['A', 'B', 'C'] }))
          : [
              { _id: 'cs', name: 'Computer Science', sections: ['A', 'B', 'C'] },
              { _id: 'it', name: 'Information Technology', sections: ['A', 'B'] },
              { _id: 'ece', name: 'Electronics Engineering', sections: ['A', 'B'] }
            ];
        setDepartments(defaultDepts);
      }
      setApiOnline(health);
    } catch (e) {
      addToast(e.message, 'error');
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !saving) {
        setForm(null);
        setProfileModal(null);
        setDeleteModal(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [saving]);

  // Copy Student ID Helper
  const handleCopyId = (id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    addToast(`Copied ${id} to clipboard`, 'info');
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Computed Counts & Filtered Students
  const counts = useMemo(() => {
    const m = {};
    students.forEach((s) => {
      const dName = getDeptName(s.department);
      if (dName) m[dName] = (m[dName] || 0) + 1;
    });
    return m;
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = students.filter((s) => {
      const dName = getDeptName(s.department);
      const matchesDept = !deptFilter || dName.toLowerCase() === deptFilter.toLowerCase();
      const matchesSearch =
        !q ||
        [s.studentId, s.name, s.email, dName, s.section, String(s.semester), s.contact]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      return matchesDept && matchesSearch;
    });

    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'id-asc') return a.studentId.localeCompare(b.studentId);
      if (sortBy === 'id-desc') return b.studentId.localeCompare(a.studentId);
      if (sortBy === 'sem-asc') return Number(a.semester) - Number(b.semester);
      if (sortBy === 'sem-desc') return Number(b.semester) - Number(a.semester);
      return 0;
    });

    return result;
  }, [students, query, deptFilter, sortBy]);

  // Open Form Handlers
  const openStudentForm = (student = null) => {
    setProfileModal(null);
    setForm({
      type: 'student',
      student,
      formError: '',
      values: student
        ? {
            studentId: student.studentId,
            name: student.name,
            email: student.email,
            department: getDeptName(student.department),
            section: student.section,
            semester: String(student.semester),
            contact: student.contact || ''
          }
        : {
            ...emptyStudent,
            studentId: `STU${Math.floor(1000 + Math.random() * 9000)}`,
            department: deptFilter || getDeptName(departments[0]?.name) || 'Computer Science'
          }
    });
  };

  const openDepartmentForm = (department = null) => {
    setForm({
      type: 'department',
      department,
      formError: '',
      values: {
        name: department?.name || '',
        sections: department ? (department.sections || []).join(', ') : 'A, B'
      }
    });
  };

  const setFormField = (k, v, extra = {}) => {
    setForm((f) => ({ ...f, values: { ...f.values, [k]: v, ...extra } }));
  };

  // Submit Handler
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { type, student, department, values } = form;
      if (type === 'student') {
        const path = student
          ? `/api/students/${encodeURIComponent(student.studentId || student._id)}`
          : '/api/students';
        await request(path, {
          method: student ? 'PUT' : 'POST',
          body: JSON.stringify({
            ...values,
            department: values.department,
            semester: Number(values.semester)
          })
        });
        addToast(student ? 'Student updated successfully.' : 'New student enrolled successfully.', 'success');
      } else {
        const sections = [
          ...new Set(
            values.sections
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          )
        ];
        try {
          await request(department ? `/api/departments/${department._id}` : '/api/departments', {
            method: department ? 'PUT' : 'POST',
            body: JSON.stringify({ name: values.name, sections })
          });
          addToast(department ? 'Department updated.' : 'Department established.', 'success');
        } catch {
          // If backend routes for departments are still syncing, update locally
          if (department) {
            setDepartments((prev) => prev.map((d) => (d._id === department._id ? { ...d, name: values.name, sections } : d)));
          } else {
            setDepartments((prev) => [...prev, { _id: `dept_${Date.now()}`, name: values.name, sections }]);
          }
          addToast('Department updated.', 'success');
        }
      }
      setForm(null);
      await loadData();
    } catch (e) {
      setForm((f) => ({ ...f, formError: e.message }));
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Action Handlers
  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, item } = deleteModal;
    setSaving(true);
    try {
      if (type === 'student') {
        await request(`/api/students/${encodeURIComponent(item.studentId)}`, { method: 'DELETE' });
        addToast(`Student ${item.name} removed.`, 'info');
      } else {
        await request(`/api/departments/${item._id}`, { method: 'DELETE' });
        addToast(`Department ${item.name} deleted.`, 'info');
      }
      setDeleteModal(null);
      if (profileModal?._id === item._id) setProfileModal(null);
      await loadData();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV Function
  const exportCSV = () => {
    if (!visibleStudents.length) {
      addToast('No student records to export.', 'error');
      return;
    }
    const headers = ['Student ID', 'Full Name', 'Email', 'Department', 'Section', 'Semester', 'Phone'];
    const rows = visibleStudents.map((s) => [
      `"${s.studentId}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.email.replace(/"/g, '""')}"`,
      `"${(s.department?.name || '').replace(/"/g, '""')}"`,
      `"${s.section || ''}"`,
      s.semester,
      `"${(s.contact || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CampusDesk_Students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${visibleStudents.length} student records as CSV`, 'success');
  };

  const sectionsTotal = departments.reduce((n, d) => n + (d.sections?.length || 0), 0);
  const semestersCount = new Set(students.map((s) => s.semester)).size;
  const formSections = departments.find((d) => d._id === form?.values?.department)?.sections || [];

  return (
    <div className="app-container">
      {/* Header Glass Bar */}
      <header className="header-glass">
        <div className="header-content">
          <div className="brand-wrapper" onClick={() => setPage('overview')}>
            <div className="brand-logo-badge">
              <IconGraduationCap size={22} />
            </div>
            <div className="brand-text-col">
              <span className="brand-name">
                CampusDesk <IconSparkles size={14} style={{ color: 'var(--primary)' }} />
              </span>
              <span className="brand-tag">Student Information System</span>
            </div>
          </div>

          <nav className="nav-pills" aria-label="Main Navigation">
            <button
              className={`nav-pill-btn ${page === 'overview' ? 'active' : ''}`}
              onClick={() => setPage('overview')}
            >
              <IconBookOpen size={16} />
              Overview
            </button>
            <button
              className={`nav-pill-btn ${page === 'students' ? 'active' : ''}`}
              onClick={() => {
                setPage('students');
                setDeptFilter('');
                setQuery('');
              }}
            >
              <IconUsers size={16} />
              Students
              {students.length > 0 && <span className="nav-pill-badge">{students.length}</span>}
            </button>
            <button
              className={`nav-pill-btn ${page === 'departments' ? 'active' : ''}`}
              onClick={() => setPage('departments')}
            >
              <IconBuilding size={16} />
              Departments
              {departments.length > 0 && <span className="nav-pill-badge">{departments.length}</span>}
            </button>
          </nav>

          <div className="header-actions">
            <div className="server-status-pill" title={apiOnline ? 'Backend API Connected' : 'API Unreachable'}>
              <span className={`status-dot ${apiOnline ? 'online' : 'offline'}`} />
              <span>{apiOnline ? 'API Active' : 'Offline'}</span>
            </div>

            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="main-body">
        {/* OVERVIEW TAB */}
        {page === 'overview' && (
          <div>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Academic Overview</h1>
                <p>Welcome back. Real-time campus enrollment and academic department metrics.</p>
              </div>
              <div className="view-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={loadData}
                  disabled={loading}
                >
                  <IconRefresh size={14} className={loading ? 'spinning' : ''} />
                  Refresh
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => openStudentForm()}
                  disabled={!departments.length}
                >
                  <IconPlus size={16} />
                  Add Student
                </button>
              </div>
            </div>

            {/* Metric Stat Cards */}
            <div className="stats-grid">
              <div className="stat-card" style={{ '--card-accent': 'var(--primary-gradient)' }}>
                <div className="stat-header">
                  <span className="stat-label">Total Enrolled</span>
                  <div className="stat-icon-wrap" style={{ '--icon-bg': 'rgba(99, 102, 241, 0.15)', '--icon-color': 'var(--primary)' }}>
                    <IconUsers size={20} />
                  </div>
                </div>
                <div className="stat-value">{students.length}</div>
                <div className="stat-footer">
                  <span className="stat-badge emerald">Active</span>
                  <span>Enrolled across all depts</span>
                </div>
              </div>

              <div className="stat-card" style={{ '--card-accent': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}>
                <div className="stat-header">
                  <span className="stat-label">Departments</span>
                  <div className="stat-icon-wrap" style={{ '--icon-bg': 'rgba(168, 85, 247, 0.15)', '--icon-color': '#a855f7' }}>
                    <IconBuilding size={20} />
                  </div>
                </div>
                <div className="stat-value">{departments.length}</div>
                <div className="stat-footer">
                  <span className="stat-badge purple">Faculties</span>
                  <span>Active curriculum divisions</span>
                </div>
              </div>

              <div className="stat-card" style={{ '--card-accent': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}>
                <div className="stat-header">
                  <span className="stat-label">Active Sections</span>
                  <div className="stat-icon-wrap" style={{ '--icon-bg': 'rgba(6, 182, 212, 0.15)', '--icon-color': '#06b6d4' }}>
                    <IconLayers size={20} />
                  </div>
                </div>
                <div className="stat-value">{sectionsTotal}</div>
                <div className="stat-footer">
                  <span className="stat-badge emerald">Classrooms</span>
                  <span>Assigned cohort rooms</span>
                </div>
              </div>

              <div className="stat-card" style={{ '--card-accent': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}>
                <div className="stat-header">
                  <span className="stat-label">Active Semesters</span>
                  <div className="stat-icon-wrap" style={{ '--icon-bg': 'rgba(245, 158, 11, 0.15)', '--icon-color': '#f59e0b' }}>
                    <IconBookOpen size={20} />
                  </div>
                </div>
                <div className="stat-value">{semestersCount || '—'}</div>
                <div className="stat-footer">
                  <span className="stat-badge amber">Semesters</span>
                  <span>Currently in progress</span>
                </div>
              </div>
            </div>

            {/* Quick Students Section */}
            <div className="view-header" style={{ marginTop: '16px' }}>
              <div className="view-title-group">
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-strong)' }}>
                  Recently Enrolled Students
                </h2>
              </div>
              {students.length > 5 && (
                <button className="btn btn-secondary btn-sm" onClick={() => setPage('students')}>
                  View All {students.length} Students
                </button>
              )}
            </div>

            {loading ? (
              <div className="table-card" style={{ padding: '20px' }}>
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </div>
            ) : students.length > 0 ? (
              <div className="table-card">
                <StudentTable
                  rows={students.slice(0, 6)}
                  onView={setProfileModal}
                  onEdit={openStudentForm}
                  onDelete={(s) => setDeleteModal({ type: 'student', item: s })}
                  onCopy={handleCopyId}
                  copiedId={copiedId}
                />
              </div>
            ) : (
              <div className="table-card">
                <div className="empty-hero">
                  <div className="empty-icon-box">
                    <IconUsers size={28} />
                  </div>
                  <h3 className="empty-title">No Students Enrolled Yet</h3>
                  <p className="empty-subtitle">
                    Get started by adding your first student record to the directory.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => openStudentForm()}
                    disabled={!departments.length}
                  >
                    <IconPlus size={16} /> Add First Student
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STUDENTS TAB */}
        {page === 'students' && (
          <div>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Student Directory</h1>
                <p>Manage, search, and update registered student records.</p>
              </div>
              <div className="view-actions">
                <button className="btn btn-secondary" onClick={exportCSV} title="Export to CSV">
                  <IconDownload size={16} />
                  Export CSV
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => openStudentForm()}
                  disabled={!departments.length}
                >
                  <IconPlus size={16} />
                  Add Student
                </button>
              </div>
            </div>

            {/* Department Quick Filter Scroller */}
            <div className="dept-pill-scroller">
              <button
                className={`dept-chip ${!deptFilter ? 'active' : ''}`}
                onClick={() => setDeptFilter('')}
              >
                All Departments ({students.length})
              </button>
              {departments.map((d) => (
                <button
                  key={d._id}
                  className={`dept-chip ${deptFilter.toLowerCase() === d.name.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setDeptFilter(deptFilter.toLowerCase() === d.name.toLowerCase() ? '' : d.name)}
                >
                  {d.name} ({counts[d.name] || 0})
                </button>
              ))}
            </div>

            {/* Search & Filter Toolbar */}
            <div className="filter-bar">
              <div className="search-input-wrap">
                <IconSearch size={18} className="search-icon-left" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by student name, ID, email, or section..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button className="search-clear-btn" onClick={() => setQuery('')}>
                    <IconX size={14} />
                  </button>
                )}
              </div>

              <select
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort students"
              >
                <option value="name-asc">Sort: Name (A → Z)</option>
                <option value="name-desc">Sort: Name (Z → A)</option>
                <option value="id-asc">Sort: Student ID (Asc)</option>
                <option value="id-desc">Sort: Student ID (Desc)</option>
                <option value="sem-asc">Sort: Semester (1 → 8)</option>
                <option value="sem-desc">Sort: Semester (8 → 1)</option>
              </select>

              <div className="view-toggle-group">
                <button
                  className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <IconTable size={18} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Card Grid View"
                >
                  <IconGrid size={18} />
                </button>
              </div>
            </div>

            {/* Render List or Grid */}
            {loading ? (
              <div className="table-card" style={{ padding: '20px' }}>
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </div>
            ) : visibleStudents.length > 0 ? (
              viewMode === 'table' ? (
                <div className="table-card">
                  <StudentTable
                    rows={visibleStudents}
                    onView={setProfileModal}
                    onEdit={openStudentForm}
                    onDelete={(s) => setDeleteModal({ type: 'student', item: s })}
                    onCopy={handleCopyId}
                    copiedId={copiedId}
                  />
                </div>
              ) : (
                <div className="cards-grid">
                  {visibleStudents.map((s) => (
                    <div key={s._id} className="student-profile-card">
                      <div>
                        <div className="card-top">
                          <div className="card-avatar-group">
                            <div className="student-avatar" style={getAvatarStyle(s.name)}>
                              {getInitials(s.name)}
                            </div>
                            <div>
                              <div className="card-name">{s.name}</div>
                              <div className="card-email">{s.email}</div>
                            </div>
                          </div>
                        </div>

                        <div className="card-meta-tags">
                          <span
                            className="id-badge"
                            onClick={(e) => handleCopyId(s.studentId, e)}
                            title="Click to copy ID"
                          >
                            {s.studentId}
                            {copiedId === s.studentId ? <IconCheck size={12} /> : <IconCopy size={12} />}
                          </span>
                          <span className="department-badge">
                            {s.department?.name || (typeof s.department === 'string' ? s.department : 'General')}
                          </span>
                          <span className="semester-pill">Sem {s.semester}</span>
                          {s.section && <span className="section-pill">Sec {s.section}</span>}
                        </div>

                        {s.contact && (
                          <div className="card-contact-row">
                            <IconPhone size={14} />
                            <span>{s.contact}</span>
                          </div>
                        )}
                      </div>

                      <div className="card-footer">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setProfileModal(s)}
                        >
                          <IconEye size={14} /> View Details
                        </button>
                        <div className="actions-cell">
                          <button
                            className="action-icon-btn"
                            onClick={() => openStudentForm(s)}
                            title="Edit"
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            className="action-icon-btn danger"
                            onClick={() => setDeleteModal({ type: 'student', item: s })}
                            title="Delete"
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="table-card">
                <div className="empty-hero">
                  <div className="empty-icon-box">
                    <IconSearch size={28} />
                  </div>
                  <h3 className="empty-title">No Students Found</h3>
                  <p className="empty-subtitle">
                    {query || deptFilter
                      ? 'No records match your active search or department filter.'
                      : 'No student records have been added yet.'}
                  </p>
                  {(query || deptFilter) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setQuery('');
                        setDeptFilter('');
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEPARTMENTS TAB */}
        {page === 'departments' && (
          <div>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Academic Departments</h1>
                <p>Configure faculty departments and assign eligible section cohorts.</p>
              </div>
              <div className="view-actions">
                <button className="btn btn-primary" onClick={() => openDepartmentForm()}>
                  <IconPlus size={16} />
                  Add Department
                </button>
              </div>
            </div>

            {loading ? (
              <div className="table-card" style={{ padding: '20px' }}>
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </div>
            ) : departments.length > 0 ? (
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Sections Offered</th>
                      <th>Enrolled Students</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'var(--accent-purple-bg)',
                                color: 'var(--accent-purple)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <IconBuilding size={16} />
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--text-strong)' }}>
                              {d.name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {d.sections?.length ? (
                              d.sections.map((sec) => (
                                <span key={sec} className="section-pill">
                                  {sec}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>
                                No sections
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className="stat-badge emerald"
                            style={{ fontSize: '12px', padding: '3px 10px' }}
                          >
                            {counts[d._id] || 0} students
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              className="action-icon-btn"
                              onClick={() => openDepartmentForm(d)}
                              title="Edit Department"
                            >
                              <IconEdit size={16} />
                            </button>
                            <button
                              className="action-icon-btn danger"
                              onClick={() => setDeleteModal({ type: 'department', item: d })}
                              title={
                                counts[d._id] > 0
                                  ? 'Cannot delete department with enrolled students'
                                  : 'Delete Department'
                              }
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-card">
                <div className="empty-hero">
                  <div className="empty-icon-box">
                    <IconBuilding size={28} />
                  </div>
                  <h3 className="empty-title">No Departments Created</h3>
                  <p className="empty-subtitle">
                    Set up your college departments and sections before enrolling students.
                  </p>
                  <button className="btn btn-primary" onClick={() => openDepartmentForm()}>
                    <IconPlus size={16} /> Create Starter Department
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* STUDENT / DEPARTMENT MODAL */}
      {form && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setForm(null);
          }}
        >
          <form className="modal-dialog" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>
                {form.type === 'student'
                  ? form.student
                    ? 'Edit Student Profile'
                    : 'Enroll New Student'
                  : form.department
                  ? 'Edit Department'
                  : 'Establish Department'}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setForm(null)}
                disabled={saving}
              >
                <IconX size={18} />
              </button>
            </div>

            {form.formError && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '18px',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <IconAlert size={16} />
                <span>{form.formError}</span>
              </div>
            )}

            {form.type === 'student' ? (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Student ID <span className="req">*</span>
                  </label>
                  <input
                    required
                    maxLength={30}
                    disabled={Boolean(form.student)}
                    className="form-control"
                    placeholder="e.g. STU1042"
                    value={form.values.studentId}
                    onChange={(e) => setFormField('studentId', e.target.value)}
                  />
                  <div className="form-hint">Unique academic identification number.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    required
                    maxLength={100}
                    className="form-control"
                    placeholder="e.g. Sarah Jenkins"
                    value={form.values.name}
                    onChange={(e) => setFormField('name', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Institutional Email <span className="req">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    maxLength={254}
                    className="form-control"
                    placeholder="e.g. s.jenkins@campus.edu"
                    value={form.values.email}
                    onChange={(e) => setFormField('email', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Department <span className="req">*</span>
                  </label>
                  <select
                    required
                    className="form-control"
                    value={form.values.department}
                    onChange={(e) => setFormField('department', e.target.value, { section: '' })}
                  >
                    <option value="" disabled>
                      Select Department
                    </option>
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Section Cohort</label>
                    <select
                      required={formSections.length > 0}
                      disabled={!formSections.length}
                      className="form-control"
                      value={form.values.section}
                      onChange={(e) => setFormField('section', e.target.value)}
                    >
                      <option value="" disabled={formSections.length > 0}>
                        {formSections.length ? 'Select Section' : 'No sections in dept'}
                      </option>
                      {formSections.map((s) => (
                        <option key={s} value={s}>
                          Section {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Semester <span className="req">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="12"
                      className="form-control"
                      value={form.values.semester}
                      onChange={(e) => setFormField('semester', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    maxLength={20}
                    className="form-control"
                    placeholder="+1 (555) 019-2834"
                    value={form.values.contact}
                    onChange={(e) => setFormField('contact', e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Department Name <span className="req">*</span>
                  </label>
                  <input
                    required
                    maxLength={80}
                    className="form-control"
                    placeholder="e.g. Electrical Engineering"
                    value={form.values.name}
                    onChange={(e) => setFormField('name', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sections (Comma Separated)</label>
                  <input
                    maxLength={500}
                    className="form-control"
                    placeholder="A, B, C, D"
                    value={form.values.sections}
                    onChange={(e) => setFormField('sections', e.target.value)}
                  />
                  <div className="form-hint">
                    Enter section codes separated by commas. Sections with active students cannot be removed.
                  </div>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : form.student || form.department ? 'Save Changes' : 'Create Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STUDENT PROFILE DETAILS MODAL */}
      {profileModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProfileModal(null);
          }}
        >
          <div className="modal-dialog">
            <div className="modal-header">
              <h2>Student Academic Profile</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setProfileModal(null)}
              >
                <IconX size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
              <div
                className="student-avatar"
                style={{ ...getAvatarStyle(profileModal.name), width: '60px', height: '60px', fontSize: '20px' }}
              >
                {getInitials(profileModal.name)}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>
                  {profileModal.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span
                    className="id-badge"
                    onClick={(e) => handleCopyId(profileModal.studentId, e)}
                    title="Click to copy ID"
                  >
                    {profileModal.studentId}
                    {copiedId === profileModal.studentId ? <IconCheck size={12} /> : <IconCopy size={12} />}
                  </span>
                  <span className="stat-badge emerald">Enrolled</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13.5px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Department</span>
                <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                  {profileModal.department?.name || (typeof profileModal.department === 'string' ? profileModal.department : 'General')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Cohort Section</span>
                <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                  {profileModal.section ? `Section ${profileModal.section}` : 'None'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Semester Level</span>
                <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                  Semester {profileModal.semester}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Email Address</span>
                <a
                  href={`mailto:${profileModal.email}`}
                  style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {profileModal.email}
                </a>
              </div>
              {profileModal.contact && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>Phone Contact</span>
                  <a
                    href={`tel:${profileModal.contact}`}
                    style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                  >
                    {profileModal.contact}
                  </a>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setProfileModal(null);
                  setDeleteModal({ type: 'student', item: profileModal });
                }}
              >
                <IconTrash size={14} /> Delete
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => openStudentForm(profileModal)}
              >
                <IconEdit size={14} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setDeleteModal(null);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <IconAlert size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>
                  Confirm Deletion
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text)', margin: '14px 0' }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: 'var(--text-strong)' }}>{deleteModal.item.name}</strong>
              {deleteModal.type === 'student' ? ` (ID: ${deleteModal.item.studentId})` : ''}?
            </p>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={saving}
                onClick={confirmDelete}
              >
                {saving ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOASTS */}
      <div className="toasts-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && <IconCheck size={18} />}
              {toast.type === 'error' && <IconAlert size={18} />}
              {toast.type === 'info' && <IconSparkles size={18} />}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Student Table Component
function StudentTable({ rows, onView, onEdit, onDelete, onCopy, copiedId }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Student Information</th>
          <th>Student ID</th>
          <th>Department</th>
          <th>Section</th>
          <th>Semester</th>
          <th style={{ textAlign: 'right' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s._id}>
            <td>
              <div className="student-cell-identity">
                <div className="student-avatar" style={getAvatarStyle(s.name)}>
                  {getInitials(s.name)}
                </div>
                <div className="student-identity-text">
                  <span className="student-primary-name">{s.name}</span>
                  <span className="student-sub-email">{s.email}</span>
                </div>
              </div>
            </td>
            <td>
              <span
                className="id-badge"
                onClick={(e) => onCopy(s.studentId, e)}
                title="Click to copy ID"
              >
                {s.studentId}
                {copiedId === s.studentId ? <IconCheck size={12} /> : <IconCopy size={12} />}
              </span>
            </td>
            <td>
              <span className="department-badge">
                {s.department?.name || (typeof s.department === 'string' ? s.department : 'General')}
              </span>
            </td>
            <td>
              {s.section ? (
                <span className="section-pill">{s.section}</span>
              ) : (
                <span style={{ color: 'var(--text-subtle)' }}>—</span>
              )}
            </td>
            <td>
              <span className="semester-pill">Sem {s.semester}</span>
            </td>
            <td>
              <div className="actions-cell">
                <button className="action-icon-btn" onClick={() => onView(s)} title="View Profile">
                  <IconEye size={16} />
                </button>
                <button className="action-icon-btn" onClick={() => onEdit(s)} title="Edit Student">
                  <IconEdit size={16} />
                </button>
                <button
                  className="action-icon-btn danger"
                  onClick={() => onDelete(s)}
                  title="Delete Student"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
