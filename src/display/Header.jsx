import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="display-header">
      <div className="header-logo">
        <div className="header-logo-img-wrap">
          {/* Logo Triesakti - Placeholder icon for now or use actual asset path */}
          <span style={{ fontSize: '2.5rem' }}>✈️</span>
        </div>
        <div className="header-logo-text">
          <div className="header-logo-name">AeroSched TV</div>
          <div className="header-logo-sub">Triesakti Institute of Airlines</div>
        </div>
      </div>

      <div className="header-title">
        <div className="header-title-main">Sistem Informasi Jadwal Mengajar Dosen</div>
        <div className="header-title-sub">Monitoring Real-Time Perkuliahan</div>
      </div>

      <div className="header-clock">
        <div className="header-clock-time">
          {format(now, 'HH:mm:ss')} <span style={{ fontSize: '0.5em', opacity: 0.8 }}>WITA</span>
        </div>
        <div className="header-clock-date">
          {format(now, 'EEEE, dd MMMM yyyy', { locale: id })}
        </div>
      </div>
    </header>
  );
}
