import { useState } from 'react';
import { supabase } from '../supabaseClient';
import LecturerManager from './LecturerManager';
import ScheduleManager from './ScheduleManager';
import CourseManager from './CourseManager';
import DisplaySettings from './DisplaySettings';
import '../styles/admin.css';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('schedules');

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-header-brand">
          <span className="admin-header-brand-icon">✈️</span>
          <div>
            <div className="admin-header-brand-name">AeroSched Admin</div>
            <div className="admin-header-brand-sub">Triesakti Institute of Airlines</div>
          </div>
        </div>
        <div className="admin-header-right">
          <div className="admin-user-info">
            Operator Akademik
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Keluar
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        <button
          className={`admin-nav-tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          <span className="admin-nav-tab-icon">📅</span> Jadwal Mengajar
        </button>
        <button
          className={`admin-nav-tab ${activeTab === 'lecturers' ? 'active' : ''}`}
          onClick={() => setActiveTab('lecturers')}
        >
          <span className="admin-nav-tab-icon">👨‍🏫</span> Data Dosen
        </button>
        <button
          className={`admin-nav-tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <span className="admin-nav-tab-icon">📚</span> Mata Kuliah
        </button>
        <button
          className={`admin-nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="admin-nav-tab-icon">⚙️</span> Pengaturan TV
        </button>
        <a href="/" target="_blank" className="admin-nav-tab" style={{ textDecoration: 'none', marginLeft: 'auto' }}>
          <span className="admin-nav-tab-icon">📺</span> Buka Layar TV
        </a>
      </nav>

      <main className="admin-body">
        {activeTab === 'schedules' && <ScheduleManager />}
        {activeTab === 'lecturers' && <LecturerManager />}
        {activeTab === 'courses' && <CourseManager />}
        {activeTab === 'settings' && <DisplaySettings />}
      </main>
    </div>
  );
}
