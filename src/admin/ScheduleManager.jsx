import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [lecturerId, setLecturerId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [classType, setClassType] = useState('garuda');
  const [dayOfWeek, setDayOfWeek] = useState('Senin');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  useEffect(() => {
    fetchSchedules();
    fetchLecturers();
  }, []);

  async function fetchLecturers() {
    const { data } = await supabase.from('lecturers').select('id, name').order('name');
    if (data) setLecturers(data);
  }

  async function fetchSchedules() {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        lecturer:lecturers(name, photo_url)
      `)
      .order('day_of_week')
      .order('start_time');
    
    if (!error) setSchedules(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!lecturerId) {
      setMessage({ type: 'error', text: 'Pilih dosen terlebih dahulu.' });
      return;
    }

    setLoading(true);
    const payload = {
      lecturer_id: lecturerId,
      course_name: courseName,
      class_type: classType,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: room
    };

    if (editingId) {
      const { error } = await supabase.from('schedules').update(payload).eq('id', editingId);
      if (error) {
        setMessage({ type: 'error', text: 'Gagal update jadwal: ' + error.message });
      } else {
        setMessage({ type: 'success', text: 'Jadwal berhasil diperbarui!' });
        cancelEdit();
        fetchSchedules();
      }
    } else {
      const { error } = await supabase.from('schedules').insert([payload]);
      if (error) {
        setMessage({ type: 'error', text: 'Gagal simpan jadwal: ' + error.message });
      } else {
        setMessage({ type: 'success', text: 'Jadwal berhasil ditambahkan!' });
        setCourseName('');
        setRoom('');
        fetchSchedules();
      }
    }
    
    setLoading(false);
  }

  function handleEdit(s) {
    setEditingId(s.id);
    setLecturerId(s.lecturer_id);
    setCourseName(s.course_name);
    setClassType(s.class_type);
    setDayOfWeek(s.day_of_week);
    setStartTime(s.start_time.substring(0, 5));
    setEndTime(s.end_time.substring(0, 5));
    setRoom(s.room || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setCourseName('');
    setRoom('');
    setLecturerId('');
  }

  async function handleDelete(id) {
    if (!confirm('Hapus jadwal ini?')) return;
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (!error) fetchSchedules();
  }

  return (
    <div className="schedule-manager">
      <h2 className="section-title">Manajemen Jadwal Kuliah</h2>
      <p className="section-sub">Atur jadwal mengajar harian untuk Kelas Garuda dan Citilink.</p>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <div className="form-card">
        <div className="form-card-title">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</div>
        <form onSubmit={handleSubmit} className="form-grid cols-3">
          <div className="form-field">
            <label className="form-label">Dosen Pengajar</label>
            <select 
              className="form-select" 
              value={lecturerId} 
              onChange={e => setLecturerId(e.target.value)}
              required
            >
              <option value="">-- Pilih Dosen --</option>
              {lecturers.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Mata Kuliah / Program</label>
            <input 
              className="form-input" 
              placeholder="Contoh: Aviation Security" 
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Klaster / Kelas</label>
            <select 
              className="form-select" 
              value={classType} 
              onChange={e => setClassType(e.target.value)}
            >
              <option value="garuda">Kelas Garuda</option>
              <option value="citilink">Kelas Citilink</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Hari</label>
            <select 
              className="form-select" 
              value={dayOfWeek} 
              onChange={e => setDayOfWeek(e.target.value)}
            >
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Jam Mulai</label>
            <input 
              type="time" 
              className="form-input" 
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Jam Selesai</label>
            <input 
              type="time" 
              className="form-input" 
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Ruangan (Opsional)</label>
            <input 
              className="form-input" 
              placeholder="Contoh: Lab Komputer 1" 
              value={room}
              onChange={e => setRoom(e.target.value)}
            />
          </div>

          <div className="form-actions full-width" style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambahkan ke Jadwal'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn" style={{ background: '#333', color: 'white' }}>
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
              <th>Hari</th>
              <th>Waktu (WITA)</th>
              <th>Dosen</th>
              <th>Mata Kuliah</th>
              <th>Kelas</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr><td colSpan="6" className="table-empty">Belum ada jadwal yang diinput.</td></tr>
            ) : (
              schedules.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.day_of_week}</td>
                  <td style={{ fontFamily: 'var(--font-accent)', letterSpacing: '0.05em' }}>
                    {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                  </td>
                  <td>{s.lecturer?.name}</td>
                  <td>{s.course_name}</td>
                  <td>
                    <span className={`class-badge ${s.class_type}`}>
                      {s.class_type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEdit(s)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
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
