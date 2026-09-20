import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, Eye, Download, X, RotateCcw, Unlock, UserX, CheckCircle2, AlertCircle } from 'lucide-react';

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

  // Custom UI Action Confirmation Modal & Toast State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    badgeText: '',
    iconType: '',
    actionLoading: false,
    onConfirm: null,
  });
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 4000);
  };

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

  // Admin Action: Reset & Restart Attempt (Creates a NEW attempt with fresh timer)
  const openResetModal = (phone, name) => {
    setActionModal({
      isOpen: true,
      title: 'Reset & Restart Attempt',
      badgeText: 'AUTHORIZE RETAKE',
      iconType: 'RESET',
      message: `Authorize a fresh attempt for ${name || 'candidate'} (${phone})? This will create a new attempt and grant a fresh timer.`,
      actionLoading: false,
      onConfirm: () => executeResetAttempt(phone),
    });
  };

  const executeResetAttempt = async (phone) => {
    setActionModal((prev) => ({ ...prev, actionLoading: true }));
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/admin/participant/reset-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionModal((prev) => ({ ...prev, isOpen: false, actionLoading: false }));
        showToast(data.message || 'New attempt authorized cleanly.');
        fetchResults();
      } else {
        setActionModal((prev) => ({ ...prev, actionLoading: false }));
      }
    } catch (e) {
      console.error(e);
      setActionModal((prev) => ({ ...prev, actionLoading: false }));
    }
  };

  // Admin Action: Unblock Candidate (Resumes existing timer if time remains)
  const openUnblockModal = (phone, name) => {
    setActionModal({
      isOpen: true,
      title: 'Unblock Candidate',
      badgeText: 'UNBLOCK ACCESS',
      iconType: 'UNBLOCK',
      message: `Unblock ${name || 'candidate'} (${phone})? If test time remains, candidate will be allowed to resume their active attempt.`,
      actionLoading: false,
      onConfirm: () => executeUnblockCandidate(phone),
    });
  };

  const executeUnblockCandidate = async (phone) => {
    setActionModal((prev) => ({ ...prev, actionLoading: true }));
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/admin/participant/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionModal((prev) => ({ ...prev, isOpen: false, actionLoading: false }));
        showToast(data.message || 'Candidate unblocked successfully.');
        fetchResults();
      } else {
        setActionModal((prev) => ({ ...prev, actionLoading: false }));
      }
    } catch (e) {
      console.error(e);
      setActionModal((prev) => ({ ...prev, actionLoading: false }));
    }
  };

  // Admin Action: Remove Registration (Allows phone number to re-register)
  const openRemoveModal = (phone, name) => {
    setActionModal({
      isOpen: true,
      title: 'Remove Registration',
      badgeText: 'REMOVE REGISTRATION',
      iconType: 'REMOVE',
      message: `Remove registration for candidate ${name || ''} (${phone})? This will free the phone number for re-registration.`,
      actionLoading: false,
      onConfirm: () => executeRemoveRegistration(phone),
    });
  };

  const executeRemoveRegistration = async (phone) => {
    setActionModal((prev) => ({ ...prev, actionLoading: true }));
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/admin/participant/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionModal((prev) => ({ ...prev, isOpen: false, actionLoading: false }));
        showToast(data.message || 'Registration removed successfully.');
        fetchResults();
      } else {
        setActionModal((prev) => ({ ...prev, actionLoading: false }));
      }
    } catch (e) {
      console.error(e);
      setActionModal((prev) => ({ ...prev, actionLoading: false }));
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

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '-';
    try {
      return new Date(isoStr).toLocaleString();
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#EBF7F7]">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F2F34] uppercase tracking-tight">Participant Results & Access Control</h2>
          <p className="text-xs text-[#3D6E75]">
            Candidate scoreboard, filterable by college & status with admin unblock, reset attempt, and registration removal.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="self-start md:self-auto px-5 py-3 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-bold shadow-warm-sm transition-all flex items-center space-x-2 border border-[#5DA9B0]/30 cursor-pointer"
        >
          <Download className="w-4 h-4 text-white" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#D0EFEF]/70 p-4 rounded-[28px] shadow-warm-sm border border-[#AEE3E0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#5DA9B0] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Name, Phone, Email, College..."
            className="w-full pl-9 pr-3 py-2 bg-[#EBF7F7] border border-[#AEE3E0] rounded-xl text-xs sm:text-sm text-[#0F2F34] focus:outline-none placeholder:text-[#3D6E75]/50"
          />
        </div>

        {/* Filter College */}
        <div>
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="w-full px-3 py-2 bg-[#EBF7F7] border border-[#AEE3E0] rounded-xl text-xs sm:text-sm text-[#0F2F34] focus:outline-none"
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
            className="w-full px-3 py-2 bg-[#EBF7F7] border border-[#AEE3E0] rounded-xl text-xs sm:text-sm text-[#0F2F34] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleSort('score')}
            className={`w-1/2 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
              sortBy === 'score'
                ? 'bg-[#2C6A74] text-white border-[#0F2F34]'
                : 'bg-[#EBF7F7] text-[#0F2F34] border-[#AEE3E0]'
            }`}
          >
            <span>Sort Score</span>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleSort('submitted_at')}
            className={`w-1/2 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
              sortBy === 'submitted_at'
                ? 'bg-[#2C6A74] text-white border-[#0F2F34]'
                : 'bg-[#EBF7F7] text-[#0F2F34] border-[#AEE3E0]'
            }`}
          >
            <span>Sort Time</span>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Results Table */}
      <div className="bg-white rounded-[32px] shadow-warm-md border border-[#AEE3E0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C6A74] text-white text-xs font-extrabold uppercase tracking-wider border-b border-[#5DA9B0]/30">
                <th className="p-4 pl-6">Candidate Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">College</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Warnings</th>
                <th className="p-4">Score</th>
                <th className="p-4">Start Time</th>
                <th className="p-4">End Time</th>
                <th className="p-4 text-center pr-6">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#AEE3E0]/60 text-xs sm:text-sm text-[#0F2F34]">
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-[#3D6E75]">
                    <div className="inline-block w-6 h-6 border-2 border-[#2C6A74] border-t-transparent rounded-full animate-spin mr-2" />
                    Loading participant records...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-[#3D6E75] font-semibold">
                    No participant records match the query.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={`${r.participant_db_id}-${r.attempt_id || 0}`} className="hover:bg-[#D0EFEF]/40 transition-colors">
                    <td className="p-4 pl-6 font-bold text-[#0F2F34]">{r.name}</td>
                    <td className="p-4 font-mono text-[#3D6E75]">{r.phone}</td>
                    <td className="p-4 text-[#3D6E75]">{r.email || '-'}</td>
                    <td className="p-4">{r.college}</td>
                    
                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      {r.status === 'BLOCKED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                          BLOCKED
                        </span>
                      )}
                      {r.status === 'COMPLETED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#2C6A74] text-white border border-[#5DA9B0]/30">
                          COMPLETED
                        </span>
                      )}
                      {r.status === 'IN_PROGRESS' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#AEE3E0] text-[#0F2F34] border border-[#5DA9B0]/40">
                          IN_PROGRESS
                        </span>
                      )}
                      {r.status === 'EXPIRED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          EXPIRED
                        </span>
                      )}
                      {r.status === 'REGISTERED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#D0EFEF] text-[#0F2F34] border border-[#AEE3E0]">
                          REGISTERED
                        </span>
                      )}
                    </td>

                    {/* Warning Count (Out of 2) */}
                    <td className="p-4 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-lg text-xs ${
                        (r.warning_count || 0) >= 2
                          ? 'bg-red-100 text-red-700 font-extrabold'
                          : (r.warning_count || 0) > 0
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : 'bg-[#EBF7F7] text-[#3D6E75]'
                      }`}>
                        {r.warning_count || 0} / 2
                      </span>
                    </td>

                    {/* Score */}
                    <td className="p-4 font-bold">
                      {r.status === 'COMPLETED' ? (
                        <span>{r.score} <span className="text-[#3D6E75] font-normal text-xs">/ {r.total_marks || 10}</span></span>
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Start & End Timestamps */}
                    <td className="p-4 text-[#3D6E75] text-xs">
                      {formatDateTime(r.started_at)}
                    </td>
                    <td className="p-4 text-[#3D6E75] text-xs">
                      {formatDateTime(r.test_end_time)}
                    </td>

                    {/* Admin Action Buttons */}
                    <td className="p-4 pr-6 text-center">
                      <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(r.participant_db_id)}
                          className="p-1.5 rounded-xl bg-[#EBF7F7] hover:bg-[#2C6A74] hover:text-white text-[#0F2F34] border border-[#AEE3E0] transition-colors cursor-pointer"
                          title="Inspect Answer Sheet"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Unblock Candidate (Only for BLOCKED) */}
                        {r.status === 'BLOCKED' && (
                          <button
                            onClick={() => openUnblockModal(r.phone, r.name)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                            title="Unblock Candidate (Resumes existing timer if time remains)"
                          >
                            <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Unblock Candidate</span>
                          </button>
                        )}

                        {/* Reset & Restart Attempt */}
                        <button
                          onClick={() => openResetModal(r.phone, r.name)}
                          className="px-2 py-1 rounded-xl bg-[#AEE3E0] hover:bg-[#9CD5D2] text-[#0F2F34] border border-[#5DA9B0]/40 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                          title="Reset & Restart Attempt (Starts fresh attempt & timer)"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#2C6A74]" />
                          <span>Reset & Restart</span>
                        </button>

                        {/* Remove Registration */}
                        <button
                          onClick={() => openRemoveModal(r.phone, r.name)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                          title="Remove Registration (Frees phone for re-registration)"
                        >
                          <UserX className="w-4 h-4" />
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
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-warm-lg border border-[#AEE3E0]">
            
            <div className="bg-[#2C6A74] p-6 text-white flex items-center justify-between border-b border-[#5DA9B0]/30">
              <div>
                <h3 className="text-lg font-bold uppercase text-white">Answer Sheet & History</h3>
                <p className="text-xs text-[#D0EFEF]">Candidate Profile Inspection</p>
              </div>
              <button
                onClick={() => setSelectedCandidateId(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {loadingModal ? (
                <div className="p-8 text-center text-[#3D6E75]">Loading data...</div>
              ) : modalData ? (
                <>
                  <div className="bg-[#EBF7F7] border border-[#AEE3E0] p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
                    <div>
                      <p className="text-[#3D6E75] uppercase font-bold text-[10px]">Name</p>
                      <p className="font-bold text-[#0F2F34]">{modalData.participant?.name}</p>
                    </div>
                    <div>
                      <p className="text-[#3D6E75] uppercase font-bold text-[10px]">Phone</p>
                      <p className="font-bold text-[#0F2F34]">{modalData.participant?.phone}</p>
                    </div>
                    <div>
                      <p className="text-[#3D6E75] uppercase font-bold text-[10px]">Email</p>
                      <p className="font-bold text-[#0F2F34] truncate">{modalData.participant?.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[#3D6E75] uppercase font-bold text-[10px]">College</p>
                      <p className="font-bold text-[#0F2F34]">{modalData.participant?.college}</p>
                    </div>
                    <div>
                      <p className="text-[#3D6E75] uppercase font-bold text-[10px]">Score</p>
                      <p className="font-bold text-[#0F2F34]">{modalData.latestAttempt?.score || 0} Marks</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0F2F34] uppercase tracking-wider">
                      Question Answers ({modalData.answers?.length || 0})
                    </h4>

                    {modalData.answers?.map((q, idx) => (
                      <div
                        key={q.question_id}
                        className={`p-4 rounded-2xl border text-xs space-y-2 ${
                          q.is_correct === 1
                            ? 'bg-[#AEE3E0]/40 border-emerald-300'
                            : q.selected_answer
                            ? 'bg-red-50 border-red-200'
                            : 'bg-[#EBF7F7] border-[#AEE3E0]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-[#0F2F34]">
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
                          <p className="text-[#3D6E75]">
                            Candidate Selected: <strong className="text-[#0F2F34]">{q.selected_answer || 'None'}</strong>
                          </p>
                          <p className="text-[#3D6E75]">
                            Correct Answer: <strong className="text-emerald-800">{q.correct_answer}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-[#3D6E75]">No data available.</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM UI ACTION CONFIRMATION MODAL */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#AEE3E0] space-y-5 text-center animate-in fade-in zoom-in duration-200">
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border shadow-warm-sm ${
              actionModal.iconType === 'REMOVE'
                ? 'bg-red-100 text-red-600 border-red-300'
                : actionModal.iconType === 'UNBLOCK'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-[#AEE3E0] text-[#2C6A74] border-[#5DA9B0]/40'
            }`}>
              {actionModal.iconType === 'REMOVE' ? (
                <UserX className="w-8 h-8" />
              ) : actionModal.iconType === 'UNBLOCK' ? (
                <Unlock className="w-8 h-8" />
              ) : (
                <RotateCcw className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-2">
              <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                actionModal.iconType === 'REMOVE'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : actionModal.iconType === 'UNBLOCK'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-[#AEE3E0] text-[#0F2F34] border-[#5DA9B0]/40'
              }`}>
                {actionModal.badgeText}
              </span>

              <h3 className="text-xl font-black text-[#0F2F34] uppercase tracking-tight">
                {actionModal.title}
              </h3>

              <p className="text-xs text-[#3D6E75] font-semibold leading-relaxed pt-1">
                {actionModal.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                disabled={actionModal.actionLoading}
                className="py-3.5 bg-[#EBF7F7] hover:bg-[#AEE3E0] text-[#0F2F34] font-bold text-xs rounded-2xl border border-[#AEE3E0] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={actionModal.onConfirm}
                disabled={actionModal.actionLoading}
                className={`py-3.5 text-white font-extrabold text-xs rounded-2xl shadow-warm-sm transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
                  actionModal.iconType === 'REMOVE'
                    ? 'bg-red-600 hover:bg-red-700 border-red-700'
                    : actionModal.iconType === 'UNBLOCK'
                    ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-800'
                    : 'bg-[#2C6A74] hover:bg-[#22555D] border-[#5DA9B0]/30'
                }`}
              >
                {actionModal.actionLoading ? (
                  <span>Processing...</span>
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING SUCCESS TOAST NOTIFICATION */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F2F34] text-white px-5 py-3.5 rounded-2xl shadow-warm-lg border border-[#5DA9B0] flex items-center space-x-3 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-[#AEE3E0]" />
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
