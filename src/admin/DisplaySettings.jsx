import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function DisplaySettings() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    carousel_interval_seconds: 8,
    ticker_text: 'Selamat Datang di Triesakti Institute of Airlines'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('display_settings').select('*').single();
    if (data) {
      setSettings(data);
    } else {
      // Create initial settings if not exist
      await supabase.from('display_settings').insert([{ id: 1 }]);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('display_settings')
      .update(settings)
      .eq('id', settings.id || 1);

    if (error) {
      setMessage({ type: 'error', text: 'Gagal simpan pengaturan: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Pengaturan berhasil diperbarui!' });
    }
    setLoading(false);
  }

  return (
    <div className="display-settings">
      <h2 className="section-title">Pengaturan Tampilan TV</h2>
      <p className="section-sub">Atur kecepatan transisi jadwal dan teks pengumuman bawah layar.</p>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <div className="form-card">
        <form onSubmit={handleSave}>
          <div className="form-grid cols-2">
            <div className="form-field">
              <label className="form-label">Interval Carousel (Detik)</label>
              <input 
                type="number" 
                className="form-input" 
                min="3" 
                max="60"
                value={settings.carousel_interval_seconds}
                onChange={e => setSettings({...settings, carousel_interval_seconds: parseInt(e.target.value)})}
              />
              <span className="photo-upload-hint">Waktu tunggu sebelum slide jadwal berikutnya bergeser.</span>
            </div>

            <div className="form-field full-width">
              <label className="form-label">Teks Pengumuman (Ticker)</label>
              <textarea 
                className="form-textarea" 
                placeholder="Tulis pesan yang akan muncul di bagian bawah layar..."
                value={settings.ticker_text}
                onChange={e => setSettings({...settings, ticker_text: e.target.value})}
              />
            </div>
            
            <div className="form-field full-width">
              <div className="settings-preview-label">Preview Ticker:</div>
              <div className="settings-ticker-preview">
                {settings.ticker_text || '(Teks pengumuman kosong)'}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Perbarui Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
