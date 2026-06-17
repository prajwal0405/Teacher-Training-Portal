import React, { useState, useEffect } from 'react';
import { fetchChildren, fetchCenters, createChild, updateChild, deleteChild } from '../lib/api';

const ChildrenManagement = ({ setToast }) => {
  const [children, setChildren] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCenter, setFilterCenter] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);

  const emptyForm = {
    name: '', age: '', gender: 'Male', center: '', classGroup: '',
    parentName: '', parentPhone: '', status: 'active'
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [childrenData, centersData] = await Promise.all([
        fetchChildren(), fetchCenters()
      ]);
      setChildren(childrenData);
      setCenters(centersData);
    } catch (err) {
      console.error(err);
      setToast?.({ type: 'error', message: 'Failed to load data' });
    } finally { setLoading(false); }
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const centerId = centers.find(c => c.name === form.center)?._id;
      const submitData = {
        ...form,
        age: Number(form.age),
      };
      if (centerId) submitData.center = centerId;

      if (editingChild) {
        await updateChild(editingChild._id, submitData);
        setToast?.({ type: 'success', message: 'Child updated successfully!' });
      } else {
        await createChild(submitData);
        setToast?.({ type: 'success', message: 'Child enrolled successfully!' });
      }
      setShowForm(false);
      setEditingChild(null);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      setToast?.({ type: 'error', message: 'Failed to save child' });
    }
  };

  const handleEdit = (child) => {
    setEditingChild(child);
    setForm({
      name: child.name || '', age: child.age || '', gender: child.gender || 'Male',
      center: child.center?.name || child.center || '',
      classGroup: child.classGroup || '',
      parentName: child.parentName || '', parentPhone: child.parentPhone || '',
      status: child.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this child?')) return;
    try {
      await deleteChild(id);
      setToast?.({ type: 'success', message: 'Child deleted' });
      loadData();
    } catch (err) { setToast?.({ type: 'error', message: 'Failed to delete' }); }
  };

  const filtered = children.filter(c => {
    const matchSearch = !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const cCenter = c.center?.name || c.center;
    const matchCenter = !filterCenter || cCenter === filterCenter;
    const matchClass = !filterClass || c.classGroup === filterClass;
    return matchSearch && matchCenter && matchClass;
  });

  const allClasses = [...new Set(children.map(c => c.classGroup).filter(Boolean))];
  const allCenters = [...new Set(children.map(c => c.center?.name || c.center).filter(Boolean))];

  const styles = {
    container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
    title: { fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
    btn: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s' },
    btnPrimary: { background: '#6c63ff', color: '#fff' },
    btnPrimaryHover: { background: '#5a52d5' },
    btnDanger: { background: '#ff4757', color: '#fff', padding: '6px 12px', fontSize: '12px' },
    btnEdit: { background: '#ffa502', color: '#fff', padding: '6px 12px', fontSize: '12px' },
    filters: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
    select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', background: '#fff', minWidth: '160px' },
    searchInput: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', width: '220px' },
    table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    th: { background: '#6c63ff', color: '#fff', padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' },
    td: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', color: '#333' },
    tr: { transition: 'background 0.2s' },
    statusBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#fff', borderRadius: '16px', padding: '32px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modalTitle: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '24px', margin: 0 },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' },
    formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
    btnCancel: { background: '#eee', color: '#333' },
    btnSubmit: { background: '#6c63ff', color: '#fff', padding: '10px 24px' },
    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#999' },
    stats: { display: 'flex', gap: '12px', marginBottom: '20px' },
    statCard: { background: '#fff', borderRadius: '12px', padding: '16px 20px', flex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' },
    statNumber: { fontSize: '28px', fontWeight: '700', color: '#6c63ff' },
    statLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  };

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return { background: '#d4edda', color: '#155724' };
    if (s === 'inactive') return { background: '#f8d7da', color: '#721c24' };
    return { background: '#fff3cd', color: '#856404' };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Children Management</h2>
        <button style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => { setEditingChild(null); setForm(emptyForm); setShowForm(true); }}
          onMouseEnter={e => e.target.style.background = styles.btnPrimaryHover.background}
          onMouseLeave={e => e.target.style.background = styles.btnPrimary.background}>
          + Enroll New Child
        </button>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{children.length}</div>
          <div style={styles.statLabel}>Total Children</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{children.filter(c => c.status === 'active').length}</div>
          <div style={styles.statLabel}>Active</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{allCenters.length}</div>
          <div style={styles.statLabel}>Centers</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{filtered.length}</div>
          <div style={styles.statLabel}>Showing</div>
        </div>
      </div>

      <div style={styles.filters}>
        <input style={styles.searchInput} placeholder="Search by name..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <select style={styles.select} value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select style={styles.select} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={styles.emptyState}>Loading children data from database...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>No children found matching your filters.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Age</th>
              <th style={styles.th}>Gender</th>
              <th style={styles.th}>Center</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Parent</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((child, i) => (
              <tr key={child._id} style={styles.tr}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={styles.td}>{i + 1}</td>
                <td style={{ ...styles.td, fontWeight: '600' }}>{child.name}</td>
                <td style={styles.td}>{child.age}</td>
                <td style={styles.td}>{child.gender}</td>
                <td style={styles.td}>{child.center?.name || child.center}</td>
                <td style={styles.td}>{child.classGroup}</td>
                <td style={styles.td}>{child.parentName}</td>
                <td style={styles.td}>{child.parentPhone}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.statusBadge, ...getStatusStyle(child.status) }}>
                    {child.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={styles.btnEdit} onClick={() => handleEdit(child)}>Edit</button>
                    <button style={styles.btnDanger} onClick={() => handleDelete(child._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={styles.overlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingChild ? 'Edit Child' : 'Enroll New Child'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Child Name *</label>
                <input style={styles.input} required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter child's full name" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Age *</label>
                  <input style={styles.input} type="number" min="1" max="18" required value={form.age}
                    onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Gender *</label>
                  <select style={styles.input} required value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Center *</label>
                  <select style={styles.input} required value={form.center}
                    onChange={e => setForm({ ...form, center: e.target.value })}>
                    <option value="">Select Center</option>
                    {centers.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Class Group *</label>
                  <select style={styles.input} required value={form.classGroup}
                    onChange={e => setForm({ ...form, classGroup: e.target.value })}>
                    <option value="">Select Class</option>
                    {['Playgroup-A','Playgroup-B','Nursery-A','Nursery-B','KG-A','KG-B','Class 1','Class 2'].map(c =>
                      <option key={c} value={c}>{c}</option>
                    )}
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Parent/Guardian Name *</label>
                <input style={styles.input} required value={form.parentName}
                  onChange={e => setForm({ ...form, parentName: e.target.value })}
                  placeholder="Enter parent's full name" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Parent Phone *</label>
                  <input style={styles.input} type="tel" required value={form.parentPhone}
                    onChange={e => setForm({ ...form, parentPhone: e.target.value })}
                    placeholder="Enter phone number" />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Status</label>
                  <select style={styles.input} value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={styles.formActions}>
                <button type="button" style={{ ...styles.btn, ...styles.btnCancel }}
                  onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" style={{ ...styles.btn, ...styles.btnSubmit }}>
                  {editingChild ? 'Update Child' : 'Enroll Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenManagement;