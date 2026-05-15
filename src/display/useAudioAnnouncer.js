import { useEffect, useState, useRef } from 'react';

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set());

  // Fungsi untuk memutar suara (Hybrid: Bel Unik + Suara Orang)
  const speak = (text, type = 'default', onEndCallback = null) => {
    // 1. Daftar Nada Bel Berbeda (Sangat Handal untuk TV)
    const sounds = {
      start: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',   // Bel Klasik (Mulai)
      end10: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',   // Bel Alarm (10 Menit)
      next: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',    // Bel Notif (Berikutnya)
      active: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'  // Bel Sukses (Aktif)
    };

    const chime = new Audio(sounds[type] || sounds.active);
    chime.volume = 0.6;
    chime.play().catch(() => {});

    // 2. Suara Orang (Native - Untuk Laptop)
    const synth = window.speechSynthesis;
    if (synth) {
      const doSpeak = () => {
        synth.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'id-ID';
        msg.rate = 0.9;
        if (onEndCallback) msg.onend = onEndCallback;
        synth.speak(msg);
        if (synth.paused) synth.resume();
      };

      // Cek apakah suara sudah siap
      if (synth.getVoices().length > 0) {
        doSpeak();
      } else {
        // Tunggu sebentar jika suara sedang loading
        synth.onvoiceschanged = doSpeak;
        setTimeout(doSpeak, 500); 
      }
    } else if (onEndCallback) {
      onEndCallback();
    }
  };

  // Fungsi untuk membuka blokir suara
  const enableAudio = () => {
    speak('Sistem suara aktif.', 'active');
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

        if (currentTime === startTime && !announcedRef.current.has(`${s.id}-start`)) {
          speak(`Perhatian. Jadwal ${course} oleh ${lecturer} untuk ${kelas}, telah dimulai.`, 'start');
          announcedRef.current.add(`${s.id}-start`);
        }
        
        if (currentTime === endTime - 10 && !announcedRef.current.has(`${s.id}-end10`)) {
          speak(`Perhatian. Waktu mengajar untuk ${course} di ${kelas}, akan berakhir dalam 10 menit.`, 'end10');
          announcedRef.current.add(`${s.id}-end10`);
        }

        if (currentTime === startTime - 5 && !announcedRef.current.has(`${s.id}-next5`)) {
          speak(`Informasi jadwal berikutnya. ${course} oleh ${lecturer} untuk ${kelas}, akan dimulai dalam 5 menit.`, 'next');
          announcedRef.current.add(`${s.id}-next5`);
        }
      });
    };

    const timer = setInterval(checkSchedules, 10000);
    return () => clearInterval(timer);
  }, [schedules, audioEnabled]);

  return { audioEnabled, enableAudio, speak };
}
