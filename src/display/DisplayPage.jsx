import { useState, useEffect, useRef } from 'react';
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
  const [showIndonesiaRaya, setShowIndonesiaRaya] = useState(false);
  const indonesiaRayaTriggered = useRef(false);

  // Pasang sistem suara
  const { audioEnabled, enableAudio } = useAudioAnnouncer(schedules);

  // Effect Khusus Indonesia Raya 21:48 WITA
  useEffect(() => {
    const checkTime = setInterval(() => {
      const now = new Date();
      // Mengambil waktu lokal TV (pastikan jam dan zona waktu TV sudah benar)
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      // Reset trigger tiap pergantian hari (jam 00:00)
      if (h === 0 && m === 0) indonesiaRayaTriggered.current = false;

      // Pemicu tepat jam 21:48:00
      if (h === 21 && m === 48 && s === 0 && !indonesiaRayaTriggered.current) {
        indonesiaRayaTriggered.current = true;
        
        if ('speechSynthesis' in window && audioEnabled) {
           const msg = new SpeechSynthesisUtterance("Dalam lima menit, mari sejenak kita berdiri sambil menyimak dan menyanyikan, lagu kebangsaan Indonesia Raya.");
           msg.lang = 'id-ID';
           msg.rate = 0.85;
           msg.volume = 1;
           
           // Munculkan video tepat setelah suara selesai bicara
           msg.onend = () => setShowIndonesiaRaya(true);
           
           window.speechSynthesis.speak(msg);
           
           // Backup jika sinyal suara nyangkut (muncul paksa setelah 12 detik)
           setTimeout(() => setShowIndonesiaRaya(true), 12000);
        } else {
           // Langsung muncul jika audio blm diaktifkan user
           setShowIndonesiaRaya(true);
        }
      }
    }, 1000);

    return () => clearInterval(checkTime);
  }, [audioEnabled]);

  // Efek untuk mematikan video persis di durasi 1 menit 58 detik (118.000 ms)
  useEffect(() => {
    if (showIndonesiaRaya) {
      const timer = setTimeout(() => {
        setShowIndonesiaRaya(false);
      }, 118000); // 118 detik
      return () => clearTimeout(timer);
    }
  }, [showIndonesiaRaya]);

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
      
      {/* Overlay Indonesia Raya */}
      {showIndonesiaRaya && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'black', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/uyyLot4PLXM?autoplay=1&controls=0&modestbranding=1" 
            title="Indonesia Raya" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen>
          </iframe>
          <button 
            onClick={() => setShowIndonesiaRaya(false)}
            style={{ 
              position: 'absolute', top: '30px', right: '30px', 
              padding: '10px 20px', background: 'rgba(255,0,0,0.6)', 
              color: 'white', border: '1px solid white', borderRadius: '5px', 
              cursor: 'pointer', fontWeight: 'bold' 
            }}
          >
            Tutup Video
          </button>
        </div>
      )}

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
