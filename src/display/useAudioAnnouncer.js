import { useEffect, useState, useRef } from 'react';

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set());

  // Fungsi untuk memutar suara (Pintar: Bisa deteksi TV tanpa suara)
  const speak = (text, onEndCallback = null) => {
    // 1. Siapkan Nada Dering (Bel)
    const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    chime.volume = 0.6;

    // 2. Definisi fungsi bicara (akan dipanggil SETELAH Bel selesai)
    const startSpeaking = () => {
      const synth = window.speechSynthesis;
      // Berikan jeda sedikit agar voices sempat loading di TV
      const voices = synth ? synth.getVoices() : [];

      if (synth && voices.length > 0) {
        // PAKAI SUARA LOKAL (Laptop/HP)
        synth.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'id-ID';
        msg.rate = 0.9;
        if (onEndCallback) msg.onend = onEndCallback;
        synth.speak(msg);
        if (synth.paused) synth.resume();
      } else {
        // PAKAI SUARA CLOUD GOOGLE (Khusus Smart TV)
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=id&client=tw-ob`;
        const audio = new Audio(googleUrl);
        if (onEndCallback) audio.onended = onEndCallback;
        audio.play().catch(e => {
          console.error("Gagal total suara di TV", e);
          if (onEndCallback) onEndCallback();
        });
      }
    };

    // Jalankan Bel, lalu setelah selesai baru jalankan suara orang
    chime.onended = startSpeaking;
    chime.play().catch(() => startSpeaking()); // Jika bel gagal, langsung suara orang
  };

  const enableAudio = () => {
    // Saat klik, langsung tes Bel + Suara
    speak('Sistem suara Aero Sched telah aktif.');
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
          speak(`Perhatian. Jadwal ${course} oleh ${lecturer} untuk ${kelas}, telah dimulai.`);
          announcedRef.current.add(`${s.id}-start`);
        }
        
        if (currentTime === endTime - 10 && !announcedRef.current.has(`${s.id}-end10`)) {
          speak(`Perhatian. Waktu mengajar untuk ${course} di ${kelas}, akan berakhir dalam 10 menit.`);
          announcedRef.current.add(`${s.id}-end10`);
        }

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
