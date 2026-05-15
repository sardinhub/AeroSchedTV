import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Header from './Header';
import ColumnPanel from './ColumnPanel';
import Ticker from './Ticker';
import { useAudioAnnouncer } from './useAudioAnnouncer';
import '../styles/display.css';

export default function DisplayPage() {
  const [schedules, setSchedules] = useState([]);
  const [settings, setSettings] = useState({
    carousel_interval_seconds: 8,
    ticker_text: 'Selamat Datang di Triesakti Institute of Airlines'
  });
  const [loading, setLoading] = useState(true);

  // Pasang sistem suara
  const { audioEnabled, enableAudio } = useAudioAnnouncer(schedules);

  useEffect(() => {
    fetchInitialData();

    const scheduleSub = supabase
      .channel('display-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => fetchSchedules())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'display_settings' }, () => fetchSettings())
      .subscribe();

    return () => {
      supabase.removeChannel(scheduleSub);
    };
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      await Promise.all([fetchSchedules(), fetchSettings()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedules() {
    const { data } = await supabase.from('schedules').select('*, lecturer:lecturers(name, photo_url)').order('start_time');
    if (data) setSchedules(data);
  }

  async function fetchSettings() {
    const { data } = await supabase.from('display_settings').select('*').single();
    if (data) setSettings(data);
  }

  const garudaSchedules = (schedules || []).filter(s => s.class_type?.toLowerCase() === 'garuda');
  const citilinkSchedules = (schedules || []).filter(s => s.class_type?.toLowerCase() === 'citilink');

  if (loading) return <div className="display-loading"><div className="display-loading-spinner"></div></div>;

  return (
    <div className="display-root" style={{ position: 'relative' }}>
      
      {/* Tombol Rahasia Pengaktif Suara */}
      {!audioEnabled && (
        <button 
          onClick={enableAudio}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'rgba(212, 175, 55, 0.2)',
            border: '1px solid #D4AF37',
            color: '#D4AF37',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            backdropFilter: 'blur(5px)'
          }}
        >
          🔇 Klik Untuk Aktifkan Suara
        </button>
      )}

      <Header />
      <main className="display-body">
        <ColumnPanel 
          type="garuda" 
          title="Kelas Garuda" 
          schedules={garudaSchedules} 
          interval={settings.carousel_interval_seconds}
        />
        <div className="display-divider"></div>
        <ColumnPanel 
          type="citilink" 
          title="Kelas Citilink" 
          schedules={citilinkSchedules} 
          interval={settings.carousel_interval_seconds}
        />
      </main>
      <Ticker text={settings.ticker_text} />
    </div>
  );
}
