import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function LecturerManager() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [nidn, setNidn] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchLecturers();
  }, []);

  async function fetchLecturers() {
    const { data, error } = await supabase
      .from('lecturers')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error) setLecturers(data);
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    let photo_url = '';

    // 1. Upload photo if exists
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('lecturer-photos')
        .upload(fileName, file);

      if (uploadError) {
        setMessage({ type: 'error', text: 'Gagal upload foto: ' + uploadError.message });
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('lecturer-photos')
        .getPublicUrl(fileName);
      
      photo_url = publicUrl;
    }

    // 2. Save lecturer data
    const { error: insertError } = await supabase
      .from('lecturers')
      .insert([{ name, nidn, photo_url }]);

    if (insertError) {
      setMessage({ type: 'error', text: 'Gagal simpan data: ' + insertError.message });
    } else {
      setMessage({ type: 'success', text: 'Dosen berhasil ditambahkan!' });
      setName('');
      setNidn('');
      setFile(null);
      setPreviewUrl('');
      fetchLecturers();
    }
    setLoading(false);
  }

  async function handleDelete(id, photoUrl) {
    if (!confirm('Hapus dosen ini? Semua jadwal terkait juga akan terhapus.')) return;

    // Delete photo from storage if exists
    if (photoUrl) {
      const fileName = photoUrl.split('/').pop();
      await supabase.storage.from('lecturer-photos').remove([fileName]);
    }

    const { error } = await supabase.from('lecturers').delete().eq('id', id);
    if (!error) fetchLecturers();
  }

  return (
    <div className="lecturer-manager">
      <h2 className="section-title">Manajemen Data Dosen</h2>
      <p className="section-sub">Tambahkan foto dan detail dosen untuk ditampilkan di layar TV.</p>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <div className="form-card">
        <div className="form-card-title">Tambah Dosen Baru</div>
        <form onSubmit={handleSubmit} className="form-grid cols-2">
          <div className="form-field full-width">
            <label className="form-label">Foto Profil Dosen</label>
            <div className="photo-upload-area">
              <div className="photo-preview">
                {previewUrl ? <img src={previewUrl} alt="Preview" /> : <span>👤</span>}
              </div>
              <div className="photo-upload-btn">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  id="lecturer-photo"
                  hidden 
                />
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => document.getElementById('lecturer-photo').click()}
                >
                  Pilih Foto
                </button>
                <span className="photo-upload-hint">Format: JPG, PNG. Max 2MB.</span>
              </div>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Nama Lengkap & Gelar</label>
            <input 
              className="form-input" 
              placeholder="Contoh: Dr. Andi Setiawan, M.T." 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">NIDN / Kode Dosen</label>
            <input 
              className="form-input" 
              placeholder="Contoh: 0012345678" 
              value={nidn}
              onChange={e => setNidn(e.target.value)}
            />
          </div>

          <div className="form-actions full-width">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Data Dosen'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Foto</th>
              <th>Nama Dosen</th>
              <th>NIDN</th>
              <th style={{ width: '100px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {lecturers.length === 0 ? (
              <tr><td colSpan="4" className="table-empty">Belum ada data dosen.</td></tr>
            ) : (
              lecturers.map(l => (
                <tr key={l.id}>
                  <td>
                    <div className="table-avatar">
                      {l.photo_url ? (
                        <img src={l.photo_url} alt={l.name} />
                      ) : (
                        <div className="table-avatar-initials">{l.name.substring(0, 1)}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</td>
                  <td>{l.nidn || '-'}</td>
                  <td>
                    <button 
                      onClick={() => handleDelete(l.id, l.photo_url)}
                      className="btn btn-danger btn-sm"
                    >
                      Hapus
                    </button>
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
