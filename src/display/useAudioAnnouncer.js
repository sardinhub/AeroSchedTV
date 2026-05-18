import { useEffect, useState, useRef } from 'react';

// Helper untuk menghasilkan suara bel berkualitas tinggi (chime) secara lokal dengan Web Audio API.
// Menghilangkan ketergantungan pada file audio eksternal/mixkit yang sering diblokir CORS/403.
const playSynthesizedChime = (type, audioCtx) => {
  return new Promise((resolve) => {
    try {
      const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (!ctx) {
        resolve();
        return;
      }
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      if (type === 'start') {
        // Bel Mulai: 3 nada naik cepat (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          
          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.5);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.5);
        });
        setTimeout(resolve, 800);
      } else if (type === 'end10') {
        // Bel 10 Menit: 2 nada menurun bergantian (G5 -> E5 -> G5 -> E5)
        const notes = [783.99, 659.25, 783.99, 659.25];
        const times = [0, 0.18, 0.36, 0.54];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + times[idx]);
          
          gain.gain.setValueAtTime(0, now + times[idx]);
          gain.gain.linearRampToValueAtTime(0.25, now + times[idx] + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + 0.35);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + times[idx]);
          osc.stop(now + times[idx] + 0.35);
        });
        setTimeout(resolve, 1000);
      } else if (type === 'next') {
        // Bel Informasi/Notif: Arpeggio Cantik (C5 -> G5 -> C6)
        const notes = [523.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          
          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.45);
        });
        setTimeout(resolve, 700);
      } else {
        // Tipe 'active' / Default: Suara Ding Dong Klasik yang Sangat Premium (E5 -> C5)
        // Ding
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.7);

        // Dong
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now + 0.3); // C5
        gain2.gain.setValueAtTime(0, now + 0.3);
        gain2.gain.linearRampToValueAtTime(0.3, now + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.3);
        osc2.stop(now + 1.0);

        setTimeout(resolve, 1300);
      }
    } catch (err) {
      console.warn("Gagal mensintesis bel Web Audio, langsung lanjut:", err);
      resolve();
    }
  });
};

export function useAudioAnnouncer(schedules) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const announcedRef = useRef(new Set());
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const watchdogRef = useRef(null);
  const isUnlocking = useRef(false);
  const audioCtxRef = useRef(null);
  const lastCheckedDayRef = useRef('');

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

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
    const { chimeType, text, onEndCallback } = currentItem;

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

    // Jalankan bel chime yang disintesis
    playSynthesizedChime(chimeType, getAudioContext())
      .then(() => {
        playSpeech();
      })
      .catch((err) => {
        console.warn("Sintesis bel gagal, langsung memutar suara:", err);
        playSpeech();
      });
  };

  // Fungsi speak yang memasukkan teks ke dalam antrean sekuensial
  const speak = (text, type = 'default', onEndCallback = null) => {
    // Masukkan ke antrean
    audioQueue.current.push({ chimeType: type, text, onEndCallback });

    // Jika mesin tidak sedang memutar suara, jalankan langsung
    if (!isPlaying.current) {
      playNextInQueue();
    }
  };

  // Fungsi pembuka kunci suara sinkron (Wajib dipanggil di dalam event handler klik/remote)
  const enableAudio = () => {
    if (audioEnabled || isUnlocking.current) return;
    isUnlocking.current = true;
    
    console.log("🔊 Menjalankan pembukaan kunci audio sinkron...");
    
    let webAudioUnlocked = false;
    let html5AudioUnlocked = false;
    
    // 1. Inisialisasi & Resume Web Audio API
    const ctx = getAudioContext();
    const resumePromise = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
    
    resumePromise
      .then(() => {
        console.log("🔊 Web Audio Context berhasil di-resume!");
        webAudioUnlocked = true;
        // Mainkan bel selamat datang menggunakan synthesizer lokal
        return playSynthesizedChime('active', ctx);
      })
      .then(() => {
        console.log("🔊 Bel sambutan berhasil diputar via Web Audio!");
      })
      .catch(err => {
        console.warn("⚠️ Web Audio unlock warning:", err);
      });

    // 2. Buka kunci HTML5 Audio secara bersamaan dengan base64 audio hening
    // Gunakan WAV 1-detik hening base64 yang valid dan sangat ringan
    const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    const silentAudio = new Audio(silentWav);
    silentAudio.volume = 0.01;
    
    silentAudio.play()
      .then(() => {
        console.log("🔊 HTML5 Audio berhasil dibuka kuncinya secara sinkron!");
        html5AudioUnlocked = true;
        setAudioEnabled(true);
        isUnlocking.current = false;
        
        // Setelah sukses, jadwalkan pesan suara sambutan
        setTimeout(() => {
          speak('Sistem suara aktif dan siap digunakan.', 'active');
        }, 1200);
      })
      .catch(err => {
        console.error("❌ HTML5 Audio unlock failed:", err);
        // Jika keduanya gagal atau salah satu diblokir, kita tetap set true sebagai fallback
        setAudioEnabled(true);
        isUnlocking.current = false;
      });
  };

  useEffect(() => {
    if (!audioEnabled || schedules.length === 0) return;

    const checkSchedules = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentDay = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(now).toLowerCase();

      // Jika hari telah berganti, reset semua riwayat pengumuman agar hari baru bisa diumumkan
      if (lastCheckedDayRef.current !== currentDay) {
        console.log(`📅 Hari berganti dari "${lastCheckedDayRef.current}" ke "${currentDay}". Meriset riwayat pengumuman...`);
        announcedRef.current.clear();
        lastCheckedDayRef.current = currentDay;
      }

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
