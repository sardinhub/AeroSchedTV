import { useEffect, useState, useRef } from 'react';

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set()); // Mencatat jadwal yg sudah diumumkan agar tidak looping suara

  // Fungsi untuk membuka blokir suara dari browser
  const enableAudio = () => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance('Sistem suara AeroSched aktif');
      msg.lang = 'id-ID';
      msg.volume = 0; // Suara inisial dibisukan
      window.speechSynthesis.speak(msg);
    }
    setAudioEnabled(true);
  };

  useEffect(() => {
    if (!audioEnabled || schedules.length === 0) return;

    const checkSchedules = () => {
      const now = new Date();
      // Ambil waktu sistem dalam format menit untuk memudahkan perhitungan
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentDay = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(now).toLowerCase();

      schedules.forEach(s => {
        if (s.day_of_week?.toLowerCase() !== currentDay) return;
        if (!s.start_time || !s.end_time) return;

        const [startH, startM] = s.start_time.split(':').map(Number);
        const [endH, endM] = s.end_time.split(':').map(Number);
        
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        const lecturer = s.lecturer?.name || 'Dosen pengajar';
        const course = s.course_name || 'mata kuliah';
        const kelas = s.class_type === 'garuda' ? 'Kelas Garuda' : 'Kelas Citilink';

        // 1. SUARA SAAT JADWAL DIMULAI (Berlangsung)
        if (currentTime === startTime && !announcedRef.current.has(`${s.id}-start`)) {
          speak(`Perhatian. Jadwal ${course} oleh ${lecturer} untuk ${kelas}, telah dimulai.`);
          announcedRef.current.add(`${s.id}-start`);
        }
        
        // 2. SUARA 10 MENIT SEBELUM BERAKHIR
        if (currentTime === endTime - 10 && !announcedRef.current.has(`${s.id}-end10`)) {
          speak(`Perhatian. Waktu mengajar untuk ${course} di ${kelas}, akan berakhir dalam 10 menit.`);
          announcedRef.current.add(`${s.id}-end10`);
        }

        // 3. SUARA JADWAL BERIKUTNYA (Diumumkan 5 Menit sebelum jam mulai)
        if (currentTime === startTime - 5 && !announcedRef.current.has(`${s.id}-next5`)) {
          speak(`Informasi jadwal berikutnya. ${course} oleh ${lecturer} untuk ${kelas}, akan dimulai dalam 5 menit.`);
          announcedRef.current.add(`${s.id}-next5`);
        }
      });
    };

    // Cek waktu sistem setiap 10 detik
    const timer = setInterval(checkSchedules, 10000);
    return () => clearInterval(timer);
  }, [schedules, audioEnabled]);

  // Fungsi Text-To-Speech (Robot Pembaca Teks)
  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'id-ID'; // Logat Bahasa Indonesia
    msg.rate = 0.85;    // Kecepatan baca sedikit diperlambat agar jelas
    msg.pitch = 1;      // Nada normal
    
    window.speechSynthesis.speak(msg);
  };

  return { audioEnabled, enableAudio };
}
