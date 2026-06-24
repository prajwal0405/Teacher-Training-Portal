import { useState, useEffect, useCallback } from 'react';

const API = '/api';
const get = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) { return r.json().then(e => { throw new Error(e.error || r.statusText); }); } return r.json(); });

const AttendanceManager = ({ user }) => {
  const teacherEmail = user?.email || 'snehal@school.edu';
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classList, setClassList] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollMsg, setEnrollMsg] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      setError(null);
      const data = await get(`${API}/teacher/classes?email=${encodeURIComponent(teacherEmail)}`);
      const classes = data.classes || [];
      setClassList(classes);
      if (classes.length > 0) setSelectedClassId(classes[0]._id);
    } catch (err) {
      setError('Cannot connect to server. Run: node server.cjs');
    } finally {
      setInitLoading(false);
    }
  }, [teacherEmail]);

  const fetchChildren = useCallback(async (classId) => {
    if (!classId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await get(`${API}/children?classId=${classId}`);
      const raw = data.children || [];
      setChildren(raw.map(c => ({
        id: c._id,
        childId: c._id,
        rollNo: c.rollNo || 'N/A',
        displayName: c.fullName || c.name || 'Unknown',
        status: 'Present'
      })));
    } catch (err) {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSavedAttendance = useCallback(async (date, classId) => {
    if (!date || !classId) return;
    try {
      const data = await get(`${API}/attendance/sessions?date=${date}&classId=${classId}`);
      const sessions = data.sessions || [];
      if (sessions.length > 0 && sessions[0].records) {
        setChildren(prev => prev.map(child => {
          const saved = sessions[0].records.find(r => (r.child?._id || r.child) === child.id);
          if (saved) {
            const s = (saved.status || 'present').charAt(0).toUpperCase() + (saved.status || 'present').slice(1);
            return { ...child, status: s };
          }
          return child;
        }));
      }
    } catch (e) {}
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { fetchChildren(selectedClassId); }, [selectedClassId, fetchChildren]);
  useEffect(() => { if (children.length > 0) fetchSavedAttendance(selectedDate, selectedClassId); }, [selectedDate, selectedClassId, fetchSavedAttendance]);

  const toggleStatus = (i) => {
    setChildren(prev => {
      const u = [...prev];
      u[i] = { ...u[i], status: u[i].status === 'Present' ? 'Absent' : 'Present' };
      return u;
    });
  };

  const handleSave = async () => {
    if (!children.length) return;
    try {
      setSaving(true);
      setMessage(null);
      const records = children.map(c => ({ childId: c.id, childName: c.displayName, status: c.status.toLowerCase() }));
      await post(`${API}/attendance/sessions`, { classId: selectedClassId, attendanceDate: selectedDate, teacherId: user._id, records });
      const pc = records.filter(r => r.status === 'present').length;
      const ac = records.filter(r => r.status === 'absent').length;
      setMessage({ type: 'success', text: 'Attendance submitted! ' + pc + ' Present, ' + ac + ' Absent' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleEnroll = async () => {
    if (!enrollName.trim()) { setEnrollMsg('Please enter child name'); return; }
    try {
      await post(`${API}/children`, { fullName: enrollName.trim(), classId: selectedClassId });
      setEnrollName('');
      setEnrollMsg('✅ Child Enrolled Successfully!');
      fetchChildren(selectedClassId);
      setTimeout(() => { setEnrollMsg(''); setShowEnroll(false); }, 1500);
    } catch (err) {
      setEnrollMsg('Error: ' + err.message);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const p = dateStr.split('-');
    return p[2] + '-' + p[1] + '-' + p[0];
  };

  const activeClass = classList.find(c => c._id === selectedClassId);
  const activeClassName = activeClass ? activeClass.name + (activeClass.ageGroup ? ' (' + activeClass.ageGroup + ')' : '') : '';

  return (
    <div style={{ position: 'relative', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* HEADER ROW */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#212529', margin: 0 }}>Children Attendance</h1>
          <p style={{ fontSize: 14, color: '#6c757d', margin: '6px 0 0' }}>Manage rosters and record daily attendance registers.</p>
        </div>
        <button onClick={() => setShowEnroll(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Enroll Child
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 20, padding: '10px 16px', background: '#f8d7da', border: '1px solid #f5c2c7', borderRadius: 6, color: '#842029', fontSize: 13 }}>{error}</div>
      )}

      {/* CARD: Daily Register Date Lookup */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dee2e6', padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

        {/* LINE 1: Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 10, background: '#e7f1ff', borderRadius: 8, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#212529', margin: 0 }}>Daily Register Date Lookup</h2>
        </div>

        {/* LINE 2: Date + Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: '#495057', whiteSpace: 'nowrap' }}>Select Sheet Date:</label>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <input type="text" value={formatDateDisplay(selectedDate)} readOnly onClick={() => document.getElementById('_dp').showPicker?.()} style={{ padding: '6px 32px 6px 12px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 14, color: '#495057', background: '#f8f9fa', outline: 'none', fontFamily: 'inherit', width: 130, cursor: 'pointer' }} />
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <input id="_dp" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
            </div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff3cd', color: '#856404', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            New Unsaved Data Register
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', background: '#fff3cd', color: '#856404', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            Class: <span style={{ fontWeight: 700 }}>{activeClassName || 'Unassigned'}</span>
          </span>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: message.type === 'success' ? '#d1e7dd' : '#f8d7da', color: message.type === 'success' ? '#0f5132' : '#842029', border: '1px solid ' + (message.type === 'success' ? '#badbcc' : '#f5c2c7'), display: 'flex', alignItems: 'center', gap: 8 }}>
          {message.type === 'success' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
          {message.text}
        </div>
      )}

      {/* CHILDREN REGISTER TABLE */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #dee2e6', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 8, background: '#e7f1ff', borderRadius: 8, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h2 style={{ fontSize: 18, color: '#212529', margin: 0, fontWeight: 400 }}>
            <span style={{ fontWeight: 700 }}>Children Register</span>{' '}
            — Date: {selectedDate} ({children.length} children)
          </h2>
        </div>
        {initLoading || loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span style={{ fontSize: 14, color: '#6c757d', marginTop: 12 }}>Loading children...</span>
          </div>
        ) : children.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dee2e6" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p style={{ fontSize: 14, color: '#6c757d', marginTop: 12 }}>No children enrolled in this class yet. Click '+ Enroll Child' above.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 7fr 3fr', gap: 16, padding: '12px 24px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll No.</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Student Name</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</div>
            </div>
            {children.map((child, i) => (
              <div key={child.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 7fr 3fr', gap: 16, padding: '12px 24px', borderBottom: '1px solid #f1f3f5', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 14, color: '#e67700', fontWeight: 600 }}>{child.rollNo}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#212529' }}>{child.displayName}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => toggleStatus(i)} style={{ padding: '4px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: child.status === 'Present' ? '#d1e7dd' : '#f8d7da', color: child.status === 'Present' ? '#0f5132' : '#842029' }}>{child.status}</button>
                </div>
              </div>
            ))}
            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: saving ? '#f59e0b99' : '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                {saving ? 'Submitting...' : 'Submit Attendance Register'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ENROLL MODAL */}
      {showEnroll && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowEnroll(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: '0 0 20px' }}>Enroll New Child</h3>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 6 }}>Full Name</label>
            <input value={enrollName} onChange={e => setEnrollName(e.target.value)} placeholder="Enter child's full name" onKeyDown={e => e.key === 'Enter' && handleEnroll()} style={{ width: '100%', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: 8, fontSize: 14, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
            {enrollMsg && (
  <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: enrollMsg.includes('Error') ? '#f8d7da' : '#d1e7dd', color: enrollMsg.includes('Error') ? '#842029' : '#0f5132', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
    {enrollMsg}
  </div>
)}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowEnroll(false); setEnrollMsg(''); setEnrollName(''); }} style={{ padding: '8px 20px', border: '1px solid #dee2e6', borderRadius: 8, background: '#fff', color: '#495057', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEnroll} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: '#f59e0b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Enroll</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
    </div>
  );
};

export default AttendanceManager;