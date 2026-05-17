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
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [showIndonesiaRaya, setShowIndonesiaRaya] = useState(false);
  const indonesiaRayaTriggered = useRef(false);
  const sholatTriggered = useRef(new Set());
  const unmuteButtonRef = useRef(null);

  // Pasang sistem suara
  const { audioEnabled, enableAudio, speak } = useAudioAnnouncer(schedules);

  // Auto-focus tombol unmute saat halaman dimuat (Sangat penting untuk Smart TV remote agar tombol OK bisa langsung mengklik)
  useEffect(() => {
    if (!audioEnabled && unmuteButtonRef.current) {
      setTimeout(() => {
        if (unmuteButtonRef.current) {
          unmuteButtonRef.current.focus();
          console.log("🎯 Tombol Unmute berhasil di-focus otomatis!");
        }
      }, 1000);
    }
  }, [audioEnabled, loading]);

  // Efek khusus untuk mendeteksi klik atau sentuhan di mana pun untuk membuka audio
  useEffect(() => {
    if (audioEnabled) return;

    const handleGlobalInteraction = () => {
      if (!audioEnabled) {
        console.log("🔓 Audio diaktifkan via interaksi global!");
        enableAudio();
      }
      removeListeners();
    };

    const removeListeners = () => {
      window.removeEventListener('click', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
    };

    // Hanya dengarkan klik mouse dan sentuhan layar (Valid User Gestures)
    // Hindari mendengarkan keydown global karena Smart TV menganggap penekanan tombol remote (keydown) 
    // sebagai interaksi tidak sah untuk membuka audio, yang menyebabkan pemutar audio terblokir selamanya.
    window.addEventListener('click', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction);

    return removeListeners;
  }, [audioEnabled, enableAudio]);

  // Effect Khusus Jam Penting (Indonesia Raya & Waktu Sholat)
  useEffect(() => {
    const checkTime = setInterval(() => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds();
      const currentTimeStr = `${h}:${m}`;

      // Reset trigger tiap pergantian hari (jam 00:00)
      if (h === '00' && m === '00') {
        indonesiaRayaTriggered.current = false;
        sholatTriggered.current.clear();
      }

      // 1. PICU INDONESIA RAYA (Berdasarkan Pengaturan)
      if (currentTimeStr === (settings.indonesia_raya_time || '21:48') && s === 0 && !indonesiaRayaTriggered.current) {
        indonesiaRayaTriggered.current = true;
        if (audioEnabled) {
           speak("Dalam lima menit, mari sejenak kita berdiri sambil menyimak dan menyanyikan, lagu kebangsaan Indonesia Raya.", 'next', () => {
             setShowIndonesiaRaya(true);
           });
           setTimeout(() => setShowIndonesiaRaya(true), 12000);
        } else {
           setShowIndonesiaRaya(true);
        }
      }

      // 2. PICU DZUHUR (Berdasarkan Pengaturan)
      if (currentTimeStr === (settings.sholat_dzuhur_time || '12:10') && s === 0 && !sholatTriggered.current.has('dzuhur')) {
        sholatTriggered.current.add('dzuhur');
        if (audioEnabled) {
          speak("DISAMPAIKAN KEPADA KAUM MUSLIMIN DAN MUSLIMAT BAHWA WAKTU SHOLAT DZUHUR TELAH TIBA ... TERIMA KASIH", 'active');
        }
      }

      // 3. PICU ASHAR (Berdasarkan Pengaturan)
      if (currentTimeStr === (settings.sholat_ashar_time || '15:20') && s === 0 && !sholatTriggered.current.has('ashar')) {
        sholatTriggered.current.add('ashar');
        if (audioEnabled) {
          speak("DISAMPAIKAN KEPADA KAUM MUSLIMIN DAN MUSLIMAT BAHWA WAKTU SHOLAT ASHAR TELAH TIBA ... TERIMA KASIH", 'active');
        }
      }

    }, 1000);

    return () => clearInterval(checkTime);
  }, [audioEnabled, speak, settings]);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        fetchSchedules();
        setShowUpdateToast(true);
        setTimeout(() => setShowUpdateToast(false), 2000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'display_settings' }, () => fetchSettings())
      .subscribe();

    // Cadangan: Cek data setiap 10 detik jika Real-time gagal/terputus
    const backupInterval = setInterval(() => {
      fetchSchedules();
    }, 10000);

    return () => {
      supabase.removeChannel(scheduleSub);
      clearInterval(backupInterval);
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
            src="https://www.youtube-nocookie.com/embed/uyyLot4PLXM?autoplay=1&controls=0&modestbranding=1" 
            title="Indonesia Raya" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            referrerPolicy="strict-origin-when-cross-origin"
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

      {/* Toast Update Otomatis */}
      {showUpdateToast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(212, 175, 55, 0.9)', color: '#000', padding: '10px 25px',
          borderRadius: '30px', fontWeight: 'bold', zIndex: 1000000, boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
          animation: 'fadeInOut 2s ease-in-out'
        }}>
          🔄 Memperbarui Jadwal...
        </div>
      )}

      {/* Tombol Rahasia Pengaktif Suara */}
      {!audioEnabled && (
        <button 
          ref={unmuteButtonRef}
          onClick={enableAudio}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'rgba(212, 175, 55, 0.35)',
            border: '2px solid #D4AF37',
            color: '#D4AF37',
            padding: '12px 24px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
            outline: 'none',
            boxShadow: '0 0 25px rgba(212, 175, 55, 0.4)'
          }}
        >
          🔇 Klik / Tekan OK Remote untuk Aktifkan Suara
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
