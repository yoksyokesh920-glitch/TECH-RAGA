import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BarChart2, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminCollegesPage() {
  const navigate = useNavigate();
  const [collegeStats, setCollegeStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const OCEAN_COLORS = ['#2C6A74', '#5DA9B0', '#AEE3E0', '#D0EFEF', '#1C434A', '#3A8A94'];

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
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-[#F0F8F8]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#5DA9B0] border-t-[#2C6A74] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0F3238]">Loading College Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#F0F8F8]">
      
      <div>
        <h2 className="text-2xl font-black text-[#0F3238] uppercase tracking-tight">College-Wise Analytics</h2>
        <p className="text-xs text-[#2C6A74]">
          Institutional benchmarks, completion distribution, and college score comparison.
        </p>
      </div>

      {/* College Statistics Table */}
      <div className="bg-white rounded-[32px] shadow-ocean-md border border-[#AEE3E0] overflow-hidden">
        <div className="p-5 bg-[#2C6A74] text-white flex items-center justify-between border-b border-[#23555E]">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5" />
            <h3 className="font-extrabold text-base uppercase tracking-wider text-white">Institution Summary</h3>
          </div>
          <span className="text-xs bg-white text-[#2C6A74] px-3 py-1 rounded-full font-bold border border-[#AEE3E0]">
            {collegeStats.length} Colleges
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F0F8F8] text-[#0F3238] text-xs font-bold uppercase tracking-wider border-b border-[#AEE3E0]">
                <th className="p-4 pl-6">College Name</th>
                <th className="p-4">Total Participants</th>
                <th className="p-4">Completed</th>
                <th className="p-4">Completion Rate</th>
                <th className="p-4">Average Score</th>
                <th className="p-4 pr-6">Highest Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#AEE3E0]/60 text-xs sm:text-sm text-[#0F3238]">
              {collegeStats.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-[#2C6A74] font-semibold">
                    No college data recorded.
                  </td>
                </tr>
              ) : (
                collegeStats.map((c) => {
                  const rate = c.totalParticipants > 0
                    ? Math.round((c.completedParticipants / c.totalParticipants) * 100)
                    : 0;

                  return (
                    <tr key={c.college} className="hover:bg-[#D0EFEF]/30 transition-colors">
                      <td className="p-4 pl-6 font-bold">{c.college}</td>
                      <td className="p-4 font-bold text-[#0F3238]">{c.totalParticipants}</td>
                      <td className="p-4 font-semibold text-[#2C6A74]">{c.completedParticipants}</td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D0EFEF] text-[#2C6A74] border border-[#AEE3E0]">
                          {rate}%
                        </span>
                      </td>
                      <td className="p-4 font-bold">{c.avgScore}</td>
                      <td className="p-4 pr-6 font-extrabold text-[#0F3238]">{c.highestScore}</td>
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
        <div className="bg-white rounded-[32px] p-6 shadow-ocean-md border border-[#AEE3E0] space-y-4">
          <h4 className="text-sm font-extrabold text-[#0F3238] uppercase tracking-wider flex items-center space-x-2 border-b border-[#AEE3E0] pb-3">
            <BarChart2 className="w-5 h-5 text-[#2C6A74]" />
            <span>Participants by College</span>
          </h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#AEE3E0" />
                <XAxis dataKey="college" tick={{ fontSize: 11, fill: '#0F3238' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#0F3238' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2C6A74', borderRadius: '16px', color: '#FFF', fontSize: '12px' }}
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

        {/* Chart 2: Score Benchmark */}
        <div className="bg-white rounded-[32px] p-6 shadow-ocean-md border border-[#AEE3E0] space-y-4">
          <h4 className="text-sm font-extrabold text-[#0F3238] uppercase tracking-wider flex items-center space-x-2 border-b border-[#AEE3E0] pb-3">
            <Award className="w-5 h-5 text-[#2C6A74]" />
            <span>Average Score Benchmark</span>
          </h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#AEE3E0" />
                <XAxis dataKey="college" tick={{ fontSize: 11, fill: '#0F3238' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#0F3238' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2C6A74', borderRadius: '16px', color: '#FFF', fontSize: '12px' }}
                />
                <Bar dataKey="avgScore" name="Avg Score" radius={[8, 8, 0, 0]}>
                  {collegeStats.map((entry, index) => (
                    <Cell key={`cell-avg-${index}`} fill={OCEAN_COLORS[(index + 1) % OCEAN_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
