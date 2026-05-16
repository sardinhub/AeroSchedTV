import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error) setCourses(data);
  }

  function handleEdit(c) {
    setEditingId(c.id);
    setName(c.name);
    setCode(c.code || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setCode('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const payload = { name, code };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('courses')
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setMessage({ type: 'error', text: 'Gagal update data: ' + updateError.message });
      } else {
        setMessage({ type: 'success', text: 'Mata kuliah berhasil diperbarui!' });
        cancelEdit();
        fetchCourses();
      }
    } else {
      const { error: insertError } = await supabase
        .from('courses')
        .insert([payload]);

      if (insertError) {
        setMessage({ type: 'error', text: 'Gagal simpan data: ' + insertError.message });
      } else {
        setMessage({ type: 'success', text: 'Mata kuliah berhasil ditambahkan!' });
        setName('');
        setCode('');
        fetchCourses();
      }
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Hapus mata kuliah ini?')) return;

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) fetchCourses();
  }

  return (
    <div className="course-manager">
      <h2 className="section-title">Manajemen Data Mata Kuliah</h2>
      <p className="section-sub">Kelola daftar mata kuliah agar dapat dipilih saat menginput jadwal.</p>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <div className="form-card">
        <div className="form-card-title">{editingId ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}</div>
        <form onSubmit={handleSubmit} className="form-grid cols-2">
          <div className="form-field">
            <label className="form-label">Nama Mata Kuliah</label>
            <input 
              className="form-input" 
              placeholder="Contoh: Aviation Security" 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Kode MK (Opsional)</label>
            <input 
              className="form-input" 
              placeholder="Contoh: AV-101" 
              value={code}
              onChange={e => setCode(e.target.value)}
            />
          </div>

          <div className="form-actions full-width" style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Mata Kuliah'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn btn-secondary">
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama Mata Kuliah</th>
              <th>Kode MK</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr><td colSpan="3" className="table-empty">Belum ada data mata kuliah.</td></tr>
            ) : (
              courses.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                  <td>{c.code || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEdit(c)}
                        className="btn btn-primary btn-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
