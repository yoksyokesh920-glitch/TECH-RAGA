import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, CheckCircle2, GraduationCap, Award, Download, HelpCircle, ArrowRight, Clock, Save, Check } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [quizDuration, setQuizDuration] = useState(30);
  const [savingDuration, setSavingDuration] = useState(false);
  const [durationMsg, setDurationMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    try {
      const [statsRes, collegeRes, settingsRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/colleges', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      const statsData = await statsRes.json();
      const collegeData = await collegeRes.json();
      const settingsData = await settingsRes.json();

      setStats(statsData);
      setColleges(collegeData);
      if (settingsData.quiz_duration_minutes) {
        setQuizDuration(settingsData.quiz_duration_minutes);
      }
      setLoading(false);
    } catch (err) {
      console.error('Stats fetch error:', err);
      setLoading(false);
    }
  };

  const handleSaveDuration = async (minutesToSave) => {
    const targetMinutes = minutesToSave || quizDuration;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    setSavingDuration(true);
    setDurationMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quiz_duration_minutes: targetMinutes }),
      });

      const data = await res.json();
      if (res.ok) {
        setQuizDuration(data.quiz_duration_minutes);
        setDurationMsg(`Quiz duration updated to ${data.quiz_duration_minutes} minutes.`);
        setTimeout(() => setDurationMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
    setSavingDuration(false);
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    fetch('/api/admin/export', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz_participants_results_2026.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => console.error(err));
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-[#F0F8F8]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#5DA9B0] border-t-[#2C6A74] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0F3238]">Loading Dashboard Metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#F0F8F8]">
      
      {/* Top Banner */}
      <div className="bg-[#2C6A74] text-white rounded-[32px] p-8 shadow-ocean-md border border-[#23555E] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <span className="inline-block px-3.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/20">
            Live Organizer Workspace
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white">
            Event Dashboard
          </h2>
          <p className="text-xs text-[#D0EFEF] max-w-xl leading-relaxed">
            Real-time candidate metrics, timer settings, college distribution analysis, question performance breakdown, and result exports.
          </p>
        </div>

        <div className="flex items-center space-x-3 z-10">
          <button
            onClick={handleExportCSV}
            className="px-5 py-3 bg-[#AEE3E0] hover:bg-[#D0EFEF] text-[#2C6A74] rounded-2xl text-xs font-extrabold shadow-ocean-sm transition-all border border-[#AEE3E0] flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* QUIZ DURATION SETTINGS CONTROL PANEL */}
      <div className="bg-white p-6 rounded-[32px] border border-[#AEE3E0] shadow-ocean-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#AEE3E0] pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D0EFEF] text-[#2C6A74] flex items-center justify-center border border-[#AEE3E0]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0F3238] uppercase">Quiz Time Duration Settings</h3>
              <p className="text-xs text-[#2C6A74]">Configure examination countdown timer for all participants.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#2C6A74]">Active Timer:</span>
            <span className="px-3 py-1 bg-[#2C6A74] text-white text-xs font-extrabold rounded-xl border border-[#23555E]">
              {quizDuration} Minutes
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
          {/* Preset Buttons */}
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-xs font-bold text-[#0F3238] mr-1">Presets:</span>
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => handleSaveDuration(mins)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  quizDuration === mins
                    ? 'bg-[#2C6A74] text-white border-[#2C6A74] ring-1 ring-[#2C6A74]'
                    : 'bg-[#F0F8F8] text-[#2C6A74] border-[#AEE3E0] hover:bg-[#D0EFEF]'
                }`}
              >
                {mins} Mins
              </button>
            ))}
          </div>

          {/* Custom Duration Input & Save */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex items-center">
              <input
                type="number"
                min="1"
                max="180"
                value={quizDuration}
                onChange={(e) => setQuizDuration(Number(e.target.value))}
                className="w-24 p-2 bg-[#F0F8F8] border border-[#AEE3E0] rounded-xl text-xs font-bold text-[#0F3238] text-center"
              />
              <span className="ml-1.5 text-xs text-[#2C6A74] font-semibold">min</span>
            </div>

            <button
              onClick={() => handleSaveDuration(quizDuration)}
              disabled={savingDuration}
              className="px-4 py-2 bg-[#2C6A74] hover:bg-[#23555E] text-white rounded-xl text-xs font-bold border border-[#23555E] shadow-ocean-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingDuration ? 'Saving...' : 'Save Duration'}</span>
            </button>
          </div>
        </div>

        {durationMsg && (
          <div className="p-2.5 rounded-xl bg-[#D0EFEF] border border-[#5DA9B0] text-[#0F3238] text-xs font-semibold flex items-center space-x-2">
            <Check className="w-4 h-4 text-[#2C6A74] stroke-[3]" />
            <span>{durationMsg}</span>
          </div>
        )}
      </div>

      {/* ROW 1: 3 SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Card 1: Participants */}
        <div className="md:col-span-4 bg-white p-6 rounded-[28px] border border-[#AEE3E0] shadow-ocean-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C6A74]">Participants</p>
            <p className="text-4xl font-black text-[#0F3238]">{stats?.totalParticipants || 0}</p>
            <p className="text-[11px] text-[#2C6A74]">Total registered candidates</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#D0EFEF] text-[#2C6A74] flex items-center justify-center border border-[#AEE3E0]">
            <Users className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="md:col-span-4 bg-[#D0EFEF] p-6 rounded-[28px] border border-[#AEE3E0] shadow-ocean-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C6A74]">Completed</p>
            <p className="text-4xl font-black text-[#0F3238]">{stats?.completedAttempts || 0}</p>
            <p className="text-[11px] text-[#2C6A74]">Submitted attempts</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#2C6A74] text-white flex items-center justify-center border border-[#23555E]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        </div>

        {/* Card 3: Average Score */}
        <div className="md:col-span-4 bg-[#AEE3E0] p-6 rounded-[28px] border border-[#5DA9B0]/40 shadow-ocean-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2C6A74]">Average Score</p>
            <p className="text-4xl font-black text-[#0F3238]">
              {stats?.averageScore || 0} <span className="text-xs font-normal text-[#2C6A74]">/ {stats?.totalMarks || 10}</span>
            </p>
            <p className="text-[11px] text-[#2C6A74]">Top Score: <strong>{stats?.highestScore || 0}</strong></p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#2C6A74] text-white flex items-center justify-center border border-[#23555E]">
            <Award className="w-7 h-7" />
          </div>
        </div>

      </div>

      {/* ROW 2: PARTICIPATION OVERVIEW & COLLEGE STATISTICS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Participation Overview */}
        <div className="md:col-span-7 bg-white p-6 rounded-[32px] border border-[#AEE3E0] shadow-ocean-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-3">
            <h3 className="text-base font-extrabold text-[#0F3238] uppercase">Attempt Status Overview</h3>
            <span className="text-xs font-semibold text-[#2C6A74]">{stats?.totalParticipants || 0} Total</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-[#F0F8F8] p-4 rounded-2xl border border-[#AEE3E0]">
              <p className="text-2xl font-black text-[#0F3238]">{stats?.completedAttempts || 0}</p>
              <p className="text-[10px] font-bold uppercase text-[#2C6A74] mt-1">Completed</p>
            </div>
            <div className="bg-[#F0F8F8] p-4 rounded-2xl border border-[#AEE3E0]">
              <p className="text-2xl font-black text-[#0F3238]">{stats?.inProgressAttempts || 0}</p>
              <p className="text-[10px] font-bold uppercase text-[#2C6A74] mt-1">In Progress</p>
            </div>
            <div className="bg-[#F0F8F8] p-4 rounded-2xl border border-[#AEE3E0]">
              <p className="text-2xl font-black text-[#0F3238]">{stats?.registeredAttempts || 0}</p>
              <p className="text-[10px] font-bold uppercase text-[#2C6A74] mt-1">Pending Start</p>
            </div>
          </div>
        </div>

        {/* College Summary */}
        <div className="md:col-span-5 bg-[#D0EFEF] p-6 rounded-[32px] border border-[#AEE3E0] shadow-ocean-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-3">
            <h3 className="text-base font-extrabold text-[#0F3238] uppercase">Colleges ({stats?.numColleges || 0})</h3>
            <Link to="/admin/colleges" className="text-xs font-bold text-[#2C6A74] hover:underline flex items-center">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {colleges.length === 0 ? (
              <div className="p-4 bg-white rounded-2xl text-center border border-[#AEE3E0]">
                <p className="text-xs font-semibold text-[#2C6A74]">
                  Colleges will be displayed when participants register
                </p>
              </div>
            ) : (
              colleges.slice(0, 4).map((c) => (
                <div key={c.college} className="flex items-center justify-between p-2.5 bg-white rounded-xl text-xs font-semibold border border-[#AEE3E0]">
                  <span className="truncate max-w-[160px] text-[#0F3238]">{c.college}</span>
                  <span className="text-[#2C6A74] font-bold">{c.totalParticipants} Candidates</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ROW 3: MODULE NAVIGATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Link
          to="/admin/results"
          className="bg-white p-6 rounded-[32px] border border-[#AEE3E0] shadow-ocean-sm hover:shadow-ocean-md transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D0EFEF] flex items-center justify-center text-[#2C6A74]">
              <Users className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-[#2C6A74] group-hover:translate-x-1.5 transition-transform" />
          </div>
          <h4 className="text-base font-bold text-[#0F3238]">Candidate Results Table</h4>
          <p className="text-xs text-[#2C6A74]">
            Search by name/phone/college/email, add & delete candidates, grant retakes, inspect answer sheets, and download CSV reports.
          </p>
        </Link>

        <Link
          to="/admin/colleges"
          className="bg-white p-6 rounded-[32px] border border-[#AEE3E0] shadow-ocean-sm hover:shadow-ocean-md transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#AEE3E0] flex items-center justify-center text-[#2C6A74]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-[#2C6A74] group-hover:translate-x-1.5 transition-transform" />
          </div>
          <h4 className="text-base font-bold text-[#0F3238]">College Statistics</h4>
          <p className="text-xs text-[#2C6A74]">
            Comparative performance charts, participant volume distribution, and college benchmark metrics.
          </p>
        </Link>

        <Link
          to="/admin/questions"
          className="bg-white p-6 rounded-[32px] border border-[#AEE3E0] shadow-ocean-sm hover:shadow-ocean-md transition-all group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#5DA9B0] flex items-center justify-center text-white">
              <HelpCircle className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-[#2C6A74] group-hover:translate-x-1.5 transition-transform" />
          </div>
          <h4 className="text-base font-bold text-[#0F3238]">Question Analysis & Bank</h4>
          <p className="text-xs text-[#2C6A74]">
            View question-level accuracy stats (Total, Correct, Wrong, %) and add, edit, or delete quiz questions.
          </p>
        </Link>

      </div>

    </div>
  );
}
