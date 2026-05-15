import { useEffect, useState, useRef } from 'react';

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set());
  // Inisialisasi satu pemain suara tetap agar tidak diblokir TV
  const audioPlayer = useRef(new Audio());

  // Fungsi untuk memutar suara (Teknik Estafet - Tunggal)
  const speak = (text, onEndCallback = null) => {
    const player = audioPlayer.current;
    
    // 1. Setel Nada Dering (Bel)
    player.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    player.volume = 0.6;
    
    // 2. Siapkan estafet: Setelah Bel selesai, baru putar suara orang
    player.onended = () => {
      // Ganti sumber suara ke server orang (Youdao lebih stabil untuk teknik estafet)
      const ttsUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=id`;
      player.src = ttsUrl;
      player.onended = onEndCallback; // Setelah orang selesai bicara, jalankan callback (jika ada)
      
      player.play().catch(e => {
        console.error("Suara orang gagal", e);
        if (onEndCallback) onEndCallback();
      });
    };

    // Mulai dari Bel
    player.play().catch(e => {
      console.error("Bel gagal, langsung ke suara orang", e);
      player.onended();
    });
  };

  // Fungsi untuk membuka blokir suara dari browser saat tombol diklik
  const enableAudio = () => {
    // "Pancing" pemain suara agar diizinkan oleh TV
    audioPlayer.current.play().catch(() => {});
    
    speak('Sistem suara aktif.');
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
