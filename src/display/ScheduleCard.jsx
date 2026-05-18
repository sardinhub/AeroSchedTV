import { useState, useEffect } from 'react';

export default function ScheduleCard({ schedule }) {
  const [status, setStatus] = useState('upcoming'); // running, upcoming, done

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      // Konversi waktu sekarang ke total menit hari ini (WITA)
      let currentH = now.getHours();
      let currentM = now.getMinutes();
      try {
        const witaString = now.toLocaleString('en-US', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const match = witaString.match(/(\d{1,2})[\s.:\-]+(\d{2})/);
        if (match) {
          let hVal = Number(match[1]);
          if (hVal === 24) hVal = 0; // Bersihkan quirk midnight
          currentH = hVal;
          currentM = Number(match[2]);
        }
      } catch (err) {
        console.warn("Gagal mendapatkan WITA time di ScheduleCard, menggunakan waktu lokal:", err);
      }

      const currentTime = currentH * 60 + currentM;

      // Ambil waktu mulai & selesai dari jadwal (format HH:mm:ss)
      // Proteksi jika data jam tidak valid
      if (!schedule.start_time || !schedule.end_time) {
        setStatus('upcoming');
        return;
      }

      const [startH, startM] = schedule.start_time.split(':').map(Number);
      const [endH, endM] = schedule.end_time.split(':').map(Number);
      
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      if (currentTime >= startTime && currentTime < endTime) {
        setStatus('running');
      } else if (currentTime >= endTime) {
        setStatus('done');
      } else {
        setStatus('upcoming');
      }
    };

    updateStatus();
    // Cek setiap 5 detik agar transisi dari 'Upcoming' ke 'Running' terasa instan
    const timer = setInterval(updateStatus, 5000); 
    return () => clearInterval(timer);
  }, [schedule.start_time, schedule.end_time]);

  // Pastikan data aman sebelum dirender
  const lecturerName = schedule.lecturer?.name || 'Dosen Tidak Diketahui';
  const initial = lecturerName.charAt(0).toUpperCase();
  const startTimeStr = schedule.start_time ? schedule.start_time.substring(0, 5) : '--:--';
  const endTimeStr = schedule.end_time ? schedule.end_time.substring(0, 5) : '--:--';

  return (
    <div className={`schedule-card status-${status}`}>
      <div className="card-avatar">
        {schedule.lecturer?.photo_url ? (
          <img src={schedule.lecturer.photo_url} alt={lecturerName} />
        ) : (
          <div className="card-avatar-initials">
            {initial}
          </div>
        )}
      </div>

      <div className="card-info">
        <div className="card-lecturer-name">{lecturerName}</div>
        <div className="card-course">{schedule.course_name || 'Tanpa Mata Kuliah'}</div>
        <div className="card-meta">
          <div className="card-time">
            <span className="card-time-icon">⏰</span>
            {startTimeStr} - {endTimeStr}
          </div>
          {schedule.room && <div className="card-room">{schedule.room}</div>}
        </div>
      </div>

      <div className="status-badge">
        <div className="status-dot-wrap">
          <div className={`status-dot ${status}`}></div>
        </div>
        <div className={`status-text ${status}`}>
          {status === 'running' ? 'Berlangsung' : status === 'upcoming' ? 'Berikutnya' : 'Selesai'}
        </div>
      </div>
    </div>
  );
}
