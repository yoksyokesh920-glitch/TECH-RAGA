import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BarChart2, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminCollegesPage() {
  const navigate = useNavigate();
  const [collegeStats, setCollegeStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const OCEAN_COLORS = ['#2C6A74', '#5DA9B0', '#AEE3E0', '#D0EFEF', '#3D6E75', '#22555D'];

  useEffect(() => {
    fetchCollegeStats();
  }, []);

  const fetchCollegeStats = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    try {
      const res = await fetch('/api/admin/colleges', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      const data = await res.json();
      setCollegeStats(data);
      setLoading(false);
    } catch (err) {
      console.error('College stats fetch error:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-[#EBF7F7]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#2C6A74] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0F2F34]">Loading College Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#EBF7F7]">
      
      <div>
        <h2 className="text-2xl font-black text-[#0F2F34] uppercase tracking-tight">College-Wise Analytics</h2>
        <p className="text-xs text-[#3D6E75]">
          Institutional benchmarks, completion distribution, and college score comparison.
        </p>
      </div>

      {/* College Statistics Table */}
      <div className="bg-white rounded-[32px] shadow-warm-md border border-[#AEE3E0] overflow-hidden">
        <div className="p-5 bg-[#2C6A74] text-white flex items-center justify-between border-b border-[#5DA9B0]/30">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-[#AEE3E0]" />
            <h3 className="font-extrabold text-base uppercase tracking-wider text-white">Institution Summary</h3>
          </div>
          <span className="text-xs bg-[#AEE3E0] text-[#0F2F34] px-3 py-1 rounded-full font-bold border border-white/20">
            {collegeStats.length} Colleges
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#AEE3E0]/40 text-[#0F2F34] text-xs font-bold uppercase tracking-wider border-b border-[#AEE3E0]">
                <th className="p-4 pl-6">College Name</th>
                <th className="p-4">Total Participants</th>
                <th className="p-4">Completed</th>
                <th className="p-4">Completion Rate</th>
                <th className="p-4">Average Score</th>
                <th className="p-4 pr-6">Highest Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#AEE3E0]/60 text-xs sm:text-sm text-[#0F2F34]">
              {collegeStats.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-[#3D6E75] font-semibold">
                    No college data recorded.
                  </td>
                </tr>
              ) : (
                collegeStats.map((c) => {
                  const rate = c.totalParticipants > 0
                    ? Math.round((c.completedParticipants / c.totalParticipants) * 100)
                    : 0;

                  return (
                    <tr key={c.college} className="hover:bg-[#D0EFEF]/40 transition-colors">
                      <td className="p-4 pl-6 font-bold text-[#0F2F34]">{c.college}</td>
                      <td className="p-4 font-bold text-[#0F2F34]">{c.totalParticipants}</td>
                      <td className="p-4 font-semibold text-[#3D6E75]">{c.completedParticipants}</td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#AEE3E0] text-[#0F2F34]">
                          {rate}%
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#0F2F34]">{c.avgScore}</td>
                      <td className="p-4 pr-6 font-extrabold text-[#0F2F34]">{c.highestScore}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Participants by College */}
        <div className="bg-white rounded-[32px] p-6 shadow-warm-md border border-[#AEE3E0] space-y-4">
          <h4 className="text-sm font-extrabold text-[#0F2F34] uppercase tracking-wider flex items-center space-x-2 border-b border-[#AEE3E0] pb-3">
            <BarChart2 className="w-5 h-5 text-[#2C6A74]" />
            <span>Participants by College</span>
          </h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#AEE3E0" />
                <XAxis dataKey="college" tick={{ fontSize: 11, fill: '#0F2F34' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#0F2F34' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F2F34', borderRadius: '16px', color: '#FFF', fontSize: '12px' }}
                />
                <Bar dataKey="totalParticipants" name="Participants" radius={[8, 8, 0, 0]}>
                  {collegeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OCEAN_COLORS[index % OCEAN_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Score by College */}
        <div className="bg-white rounded-[32px] p-6 shadow-warm-md border border-[#AEE3E0] space-y-4">
          <h4 className="text-sm font-extrabold text-[#0F2F34] uppercase tracking-wider flex items-center space-x-2 border-b border-[#AEE3E0] pb-3">
            <Award className="w-5 h-5 text-[#2C6A74]" />
            <span>Average Score by College</span>
          </h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#AEE3E0" />
                <XAxis dataKey="college" tick={{ fontSize: 11, fill: '#0F2F34' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#0F2F34' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F2F34', borderRadius: '16px', color: '#FFF', fontSize: '12px' }}
                />
                <Bar dataKey="avgScore" name="Avg Score" fill="#2C6A74" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
