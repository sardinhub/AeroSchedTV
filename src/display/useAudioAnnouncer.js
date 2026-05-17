import { useEffect, useState, useRef } from 'react';

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set());
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const watchdogRef = useRef(null);

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const startWatchdog = () => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      console.warn("⚠️ Watchdog triggered: Audio playback took too long. Force continuing queue...");
      isPlaying.current = false;
      playNextInQueue();
    }, 12000); // 12 detik batas maksimum per pengumuman
  };

  // Fungsi untuk memutar antrean audio secara berurutan (Sequential Queue)
  const playNextInQueue = () => {
    clearWatchdog();

    if (audioQueue.current.length === 0) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    startWatchdog();

    const currentItem = audioQueue.current.shift();
    const { chimeUrl, text, onEndCallback } = currentItem;

    // Fungsi utama untuk memutar TTS setelah bel selesai
    const playSpeech = () => {
      // Prioritas 1: StreamElements Amazon Polly (Sangat natural, bebas CORS/Referrer Block!)
      const streamElementsUrl = `https://api.streamelements.com/api/v2/speech?voice=Indah&text=${encodeURIComponent(text)}`;
      const voiceAudio = new Audio(streamElementsUrl);
      voiceAudio.volume = 0.95;

      voiceAudio.onended = () => {
        clearWatchdog();
        if (onEndCallback) onEndCallback();
        setTimeout(playNextInQueue, 800); // Beri jeda sebelum antrean berikutnya
      };

      voiceAudio.onerror = (e) => {
        console.warn("Gagal memutar StreamElements. Mencoba Fallback 1: Google TTS...", e);
        
        // Fallback 1: Google TTS API (Format MP3 standar)
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id-ID&client=tw-ob&q=${encodeURIComponent(text)}`;
        const fallbackAudio = new Audio(googleTtsUrl);
        fallbackAudio.volume = 0.95;

        fallbackAudio.onended = () => {
          clearWatchdog();
          if (onEndCallback) onEndCallback();
          setTimeout(playNextInQueue, 800);
        };

        fallbackAudio.onerror = () => {
          console.warn("Google TTS juga gagal. Mencoba Fallback 2: Web Speech API...");
          clearWatchdog();

          // Fallback 2: Web Speech API (Untuk Laptop/Desktop offline)
          const synth = window.speechSynthesis;
          if (synth) {
            try {
              synth.cancel();
              const msg = new SpeechSynthesisUtterance(text);
              msg.lang = 'id-ID';
              msg.rate = 0.9;
              
              msg.onend = () => {
                if (onEndCallback) onEndCallback();
                setTimeout(playNextInQueue, 800);
              };

              msg.onerror = () => {
                console.error("Web Speech API juga gagal.");
                if (onEndCallback) onEndCallback();
                setTimeout(playNextInQueue, 500);
              };

              synth.speak(msg);
              if (synth.paused) synth.resume();
            } catch (err) {
              console.error("SpeechSynthesis error caught:", err);
              if (onEndCallback) onEndCallback();
              setTimeout(playNextInQueue, 500);
            }
          } else {
            // Fallback 3: Jika semuanya gagal, lanjut ke antrean berikutnya
            if (onEndCallback) onEndCallback();
            setTimeout(playNextInQueue, 500);
          }
        };

        fallbackAudio.play().catch((err) => {
          console.warn("Playback Google TTS diblokir:", err);
          fallbackAudio.onerror();
        });
      };

      voiceAudio.play().catch((err) => {
        console.warn("Playback StreamElements diblokir:", err);
        voiceAudio.onerror(); // Paksa masuk ke fallback
      });
    };

    // Jalankan Bel Chime menggunakan Objek Audio Baru yang segar (100% Kompatibel dengan Smart TV)
    const chime = new Audio(chimeUrl);
    chime.volume = 0.6;

    chime.onended = () => {
      playSpeech();
    };

    chime.onerror = () => {
      console.warn("Gagal memutar chime. Langsung memutar suara pembaca.");
      playSpeech();
    };

    chime.play().catch((err) => {
      console.warn("Playback chime diblokir, mencoba langsung suara pembaca:", err);
      playSpeech();
    });
  };

  // Fungsi speak yang memasukkan teks ke dalam antrean sekuensial
  const speak = (text, type = 'default', onEndCallback = null) => {
    const sounds = {
      start: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',   // Bel Mulai
      end10: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',   // Bel 10 Menit Akhir
      next: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',    // Bel Jadwal Baru/Notif
      active: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'   // Bel Aktif Sukses
    };

    const chimeUrl = sounds[type] || sounds.active;

    // Masukkan ke antrean
    audioQueue.current.push({ chimeUrl, text, onEndCallback });

    // Jika mesin tidak sedang memutar suara, jalankan langsung
    if (!isPlaying.current) {
      playNextInQueue();
    }
  };

  // Fungsi pembuka kunci suara sinkron (Wajib dipanggil di dalam event handler sinkron klik/remote)
  const enableAudio = () => {
    console.log("Attempting synchronous audio context unlock...");
    
    // Jalankan chime aktif secara sinkron langsung menggunakan objek audio baru
    const unlockAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3');
    unlockAudio.volume = 0.5;
    
    unlockAudio.play()
      .then(() => {
        console.log("🔊 TV Browser Audio Context successfully unlocked synchronously!");
        setAudioEnabled(true);
        // Mainkan teks sambutan setelah berhasil un-mute
        setTimeout(() => {
          speak('Sistem suara aktif dan siap digunakan.', 'active');
        }, 800);
      })
      .catch(err => {
        console.error("Synchronous unlock failed:", err);
        // Fallback jika TV masih protektif, tetap tandai true agar user bisa melanjutkan interaksi
        setAudioEnabled(true);
      });
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
