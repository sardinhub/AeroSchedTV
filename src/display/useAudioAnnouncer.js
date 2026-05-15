import { useEffect, useState, useRef } from 'react';

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set()); // Mencatat jadwal yg sudah diumumkan agar tidak looping suara

  // Fungsi Text-To-Speech menggunakan Google TTS (100% Kompatibel dengan Smart TV)
  const speak = (text, onEndCallback = null) => {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`;
      const audio = new Audio(url);
      audio.volume = 1;
      
      if (onEndCallback) {
        audio.onended = onEndCallback;
      }
      
      audio.play().catch(err => {
        console.error("Gagal memutar suara di TV:", err);
        if (onEndCallback) onEndCallback(); // Lanjut aksi walau audio gagal
      });
    } catch (err) {
      console.error(err);
      if (onEndCallback) onEndCallback();
    }
  };

  // Fungsi untuk membuka blokir suara dari browser
  const enableAudio = () => {
    speak('Sistem suara telah diaktifkan.');
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
