import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, Eye, Download, X, CheckCircle2, XCircle, RotateCcw, Ban, Unlock } from 'lucide-react';

export default function AdminResultsPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [search, setSearch] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modal State for Candidate Detail
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [search, selectedCollege, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchCollegeList();
  }, []);

  const fetchCollegeList = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/colleges', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setColleges(data.map((c) => c.college));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchResults = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedCollege) params.append('college', selectedCollege);
    if (selectedStatus) params.append('status', selectedStatus);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    try {
      const res = await fetch(`/api/admin/results?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      const data = await res.json();
      setResults(data);
      setLoading(false);
    } catch (err) {
      console.error('Results fetch error:', err);
      setLoading(false);
    }
  };

  const handleOpenDetailModal = async (participantDbId) => {
    setSelectedCandidateId(participantDbId);
    setLoadingModal(true);
    const token = localStorage.getItem('adminToken');

    try {
      const res = await fetch(`/api/admin/participant/${participantDbId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModalData(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingModal(false);
  };

  const handleAllowRetake = async (phone) => {
    if (!window.confirm(`Authorize a new attempt for participant with phone ${phone}?`)) return;

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/admin/participant/allow-retake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        alert('Retake attempt authorized for candidate.');
        fetchResults();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBlock = async (phone) => {
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/admin/participant/toggle-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        fetchResults();
      }
    } catch (e) {
      console.error(e);
    }
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

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#EDEEE9]">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#171717] uppercase tracking-tight">Participant Results & Access</h2>
          <p className="text-xs text-[#68635F]">
            Candidate scoreboard, filterable by college & status with attempt retake controls and CSV export.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="self-start md:self-auto px-5 py-3 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] rounded-2xl text-xs font-bold shadow-warm-sm transition-all flex items-center space-x-2 border border-[#E3D5CA]"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#F5EBE1] p-4 rounded-[28px] shadow-warm-sm border border-[#E3D5CA] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#68635F] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Name, Phone, College..."
            className="w-full pl-9 pr-3 py-2 bg-[#EDEEE9] border border-[#D6CCC2] rounded-xl text-xs sm:text-sm text-[#171717] focus:outline-none"
          />
        </div>

        {/* Filter College */}
        <div>
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="w-full px-3 py-2 bg-[#EDEEE9] border border-[#D6CCC2] rounded-xl text-xs sm:text-sm text-[#171717] focus:outline-none"
          >
            <option value="">All Colleges</option>
            {colleges.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-[#EDEEE9] border border-[#D6CCC2] rounded-xl text-xs sm:text-sm text-[#171717] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleSort('score')}
            className={`w-1/2 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1 transition-all ${
              sortBy === 'score'
                ? 'bg-[#D7BDB0] text-[#171717] border-[#E3D5CA]'
                : 'bg-[#EDEEE9] text-[#171717] border-[#D6CCC2]'
            }`}
          >
            <span>Sort Score</span>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleSort('submitted_at')}
            className={`w-1/2 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1 transition-all ${
              sortBy === 'submitted_at'
                ? 'bg-[#D7BDB0] text-[#171717] border-[#E3D5CA]'
                : 'bg-[#EDEEE9] text-[#171717] border-[#D6CCC2]'
            }`}
          >
            <span>Sort Time</span>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Results Table (No Participant ID!) */}
      <div className="bg-[#F5EBE1] rounded-[32px] shadow-warm-md border border-[#E3D5CA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#D7BDB0] text-[#171717] text-xs font-extrabold uppercase tracking-wider border-b border-[#E3D5CA]">
                <th className="p-4 pl-6">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">College</th>
                <th className="p-4 text-center">Attempt #</th>
                <th className="p-4">Score</th>
                <th className="p-4">Percentage</th>
                <th className="p-4">Time Taken</th>
                <th className="p-4">Submitted At</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D5CA]/60 text-xs sm:text-sm text-[#171717]">
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-[#68635F]">
                    <div className="inline-block w-6 h-6 border-2 border-[#D7BDB0] border-t-transparent rounded-full animate-spin mr-2" />
                    Loading records...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-[#68635F] font-semibold">
                    No participant records match the query.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={`${r.participant_db_id}-${r.attempt_id || 0}`} className="hover:bg-[#E3D5CA]/30 transition-colors">
                    <td className="p-4 pl-6 font-bold">{r.name}</td>
                    <td className="p-4 font-mono text-[#68635F]">{r.phone}</td>
                    <td className="p-4">{r.college}</td>
                    <td className="p-4 text-center font-bold">#{r.attempt_number || 1}</td>
                    <td className="p-4 font-bold">
                      {r.status === 'COMPLETED' ? (
                        <span>{r.score} <span className="text-[#68635F] font-normal text-xs">/ {r.total_marks || 10}</span></span>
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.status === 'COMPLETED' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E3D5CA] text-[#171717] border border-[#D6CCC2]">
                          {r.percentage}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-[#68635F]">
                      {r.time_taken ? `${r.time_taken}s` : '-'}
                    </td>
                    <td className="p-4 text-[#68635F] text-xs">
                      {r.submitted_at ? new Date(r.submitted_at + 'Z').toLocaleString() : '-'}
                    </td>
                    <td className="p-4">
                      {r.status === 'COMPLETED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#D7BDB0] text-[#171717] border border-[#E3D5CA]">
                          COMPLETED
                        </span>
                      )}
                      {r.status === 'IN_PROGRESS' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          IN_PROGRESS
                        </span>
                      )}
                      {r.status === 'REGISTERED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#E3D5CA] text-[#171717]">
                          REGISTERED
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(r.participant_db_id)}
                          className="p-1.5 rounded-xl bg-[#EDEEE9] hover:bg-[#D7BDB0] text-[#171717] border border-[#D6CCC2] transition-colors"
                          title="View Answer Breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleAllowRetake(r.phone)}
                          className="p-1.5 rounded-xl bg-[#EDEEE9] hover:bg-[#E3D5CA] text-[#171717] border border-[#D6CCC2] transition-colors"
                          title="Allow Retake Attempt"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleBlock(r.phone)}
                          className={`p-1.5 rounded-xl border transition-colors ${
                            r.access_status === 'BLOCKED'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-[#EDEEE9] text-[#68635F] border-[#D6CCC2] hover:bg-red-50'
                          }`}
                          title={r.access_status === 'BLOCKED' ? 'Unblock Candidate' : 'Block Candidate'}
                        >
                          {r.access_status === 'BLOCKED' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Answer Breakdown Modal */}
      {selectedCandidateId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5EBE1] rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-warm-lg border border-[#E3D5CA]">
            
            <div className="bg-[#D7BDB0] p-6 text-[#171717] flex items-center justify-between border-b border-[#E3D5CA]">
              <div>
                <h3 className="text-lg font-bold uppercase">Answer Sheet & History</h3>
                <p className="text-xs text-[#68635F]">Candidate Profile Inspection</p>
              </div>
              <button
                onClick={() => setSelectedCandidateId(null)}
                className="p-1.5 rounded-full hover:bg-[#E3D5CA]"
              >
                <X className="w-5 h-5 text-[#171717]" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {loadingModal ? (
                <div className="p-8 text-center text-[#68635F]">Loading data...</div>
              ) : modalData ? (
                <>
                  <div className="bg-[#EDEEE9] border border-[#D6CCC2] p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[#68635F] uppercase font-bold text-[10px]">Name</p>
                      <p className="font-bold text-[#171717]">{modalData.participant?.name}</p>
                    </div>
                    <div>
                      <p className="text-[#68635F] uppercase font-bold text-[10px]">Phone</p>
                      <p className="font-bold text-[#171717]">{modalData.participant?.phone}</p>
                    </div>
                    <div>
                      <p className="text-[#68635F] uppercase font-bold text-[10px]">College</p>
                      <p className="font-bold text-[#171717]">{modalData.participant?.college}</p>
                    </div>
                    <div>
                      <p className="text-[#68635F] uppercase font-bold text-[10px]">Score</p>
                      <p className="font-bold text-[#171717]">{modalData.latestAttempt?.score || 0} Marks</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                      Question Answers ({modalData.answers?.length || 0})
                    </h4>

                    {modalData.answers?.map((q, idx) => (
                      <div
                        key={q.question_id}
                        className={`p-4 rounded-2xl border text-xs space-y-2 ${
                          q.is_correct === 1
                            ? 'bg-[#E3D5CA]/50 border-emerald-300'
                            : q.selected_answer
                            ? 'bg-red-50 border-red-200'
                            : 'bg-[#EDEEE9] border-[#D6CCC2]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-[#171717]">
                            Q{idx + 1}. {q.question}
                          </span>
                          {q.is_correct === 1 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Correct
                            </span>
                          ) : q.selected_answer ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              Incorrect
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                              Unanswered
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <p>
                            Candidate Selected: <strong className="text-[#171717]">{q.selected_answer || 'None'}</strong>
                          </p>
                          <p>
                            Correct Answer: <strong className="text-emerald-800">{q.correct_answer}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-[#68635F]">No data available.</p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
