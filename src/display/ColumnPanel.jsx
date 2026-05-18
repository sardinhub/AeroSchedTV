import { useState, useEffect } from 'react';
import ScheduleCard from './ScheduleCard';

export default function ColumnPanel({ type, title, schedules, interval }) {
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 4;

  useEffect(() => {
    const updateFilteredList = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentDay = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(now).toLowerCase();

      const active = (schedules || []).filter(s => {
        const isToday = s.day_of_week?.toLowerCase() === currentDay;
        return isToday;
      });

      setFilteredSchedules(active);
    };

    updateFilteredList();
    const listTimer = setInterval(updateFilteredList, 60000); // Re-filter setiap menit
    return () => clearInterval(listTimer);
  }, [schedules]);

  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);

  useEffect(() => {
    if (totalPages <= 1) {
      setCurrentIndex(0);
      return;
    }

    const carouselTimer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalPages);
    }, interval * 1000);

    return () => clearInterval(carouselTimer);
  }, [totalPages, interval]);

  // Determine current day for header
  const displayDay = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }).format(new Date());

  return (
    <section className={`column-panel ${type}`}>
      <div className="column-header">
        {type === 'garuda' ? (
          <img src="/garuda.png" alt="Garuda Logo" className="column-header-logo" />
        ) : (
          <img src="/citilink.png" alt="Citilink Logo" className="column-header-logo" />
        )}
        <h2 className="column-header-title">{title}</h2>
        <span className="column-header-badge">{displayDay}</span>
      </div>

      <div className="cards-viewport">
        {filteredSchedules.length === 0 ? (
          <div className="column-empty">
            <div className="column-empty-icon">📅</div>
            <p className="column-empty-text">Tidak ada jadwal hari ini</p>
          </div>
        ) : (
          <div 
            className="cards-slider"
            style={{ transform: `translateY(-${currentIndex * 100}%)` }}
          >
            {filteredSchedules.map(schedule => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="carousel-dots">
          {[...Array(totalPages)].map((_, i) => (
            <div 
              key={i} 
              className={`carousel-dot ${currentIndex === i ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
