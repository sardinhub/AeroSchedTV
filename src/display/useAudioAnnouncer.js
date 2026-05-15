import { useEffect, useState, useRef } from 'react';

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set()); // Mencatat jadwal yg sudah diumumkan

  // Fungsi Text-To-Speech (Bawaan Browser yang Paling Stabil)
  const speak = (text, onEndCallback = null) => {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      const msg = new SpeechSynthesisUtterance(text);
      // Coba paksakan aksen Indonesia
      msg.lang = 'id-ID';
      msg.volume = 1;
      msg.rate = 0.85;
      
      if (onEndCallback) {
        msg.onend = onEndCallback;
        msg.onerror = onEndCallback;
      }
      
      window.speechSynthesis.speak(msg);

      // FIX BROWSER BUG: Kadang browser menunda (pause) suara secara sepihak
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.error("Gagal bicara:", err);
      if (onEndCallback) onEndCallback();
    }
  };

  // Fungsi untuk membuka blokir suara dari browser saat tombol diklik
  const enableAudio = () => {
    // Reset/bersihkan antrean yang mungkin macet sebelumnya
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    speak('Tes. Satu. Dua. Tiga. Sistem suara Aero Sched telah aktif.');
    setAudioEnabled(true);
  };

  useEffect(() => {
    if (!audioEnabled || schedules.length === 0) return;

    const checkSchedules = () => {
      const now = new Date();
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

        // 1. SUARA SAAT JADWAL DIMULAI
        if (currentTime === startTime && !announcedRef.current.has(`${s.id}-start`)) {
          speak(`Perhatian. Jadwal ${course} oleh ${lecturer} untuk ${kelas}, telah dimulai.`);
          announcedRef.current.add(`${s.id}-start`);
        }
        
        // 2. SUARA 10 MENIT SEBELUM BERAKHIR
        if (currentTime === endTime - 10 && !announcedRef.current.has(`${s.id}-end10`)) {
          speak(`Perhatian. Waktu mengajar untuk ${course} di ${kelas}, akan berakhir dalam 10 menit.`);
          announcedRef.current.add(`${s.id}-end10`);
        }

        // 3. SUARA JADWAL BERIKUTNYA
        if (currentTime === startTime - 5 && !announcedRef.current.has(`${s.id}-next5`)) {
          speak(`Informasi jadwal berikutnya. ${course} oleh ${lecturer} untuk ${kelas}, akan dimulai dalam 5 menit.`);
          announcedRef.current.add(`${s.id}-next5`);
        }
      });
    };

    const timer = setInterval(checkSchedules, 10000);
    return () => clearInterval(timer);
  }, [schedules, audioEnabled]);

  return { audioEnabled, enableAudio, speak };
}
