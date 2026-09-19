import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, Eye, Download, X, CheckCircle2, XCircle, RotateCcw, Ban, Unlock, UserPlus, Trash2, Mail } from 'lucide-react';

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

  // Modal State for Add Candidate
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [addCandidateForm, setAddCandidateForm] = useState({ name: '', phone: '', college: '', email: '' });
  const [addError, setAddError] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);

  // Modal State for Delete Candidate Confirmation
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [deletingCandidate, setDeletingCandidate] = useState(false);

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

  const handleAddCandidateSubmit = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!addCandidateForm.name.trim() || !addCandidateForm.phone.trim() || !addCandidateForm.college.trim()) {
      setAddError('Name, Phone number, and College are required.');
      return;
    }

    setAddingCandidate(true);
    const token = localStorage.getItem('adminToken');

    try {
      const res = await fetch('/api/admin/participant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addCandidateForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Failed to add candidate.');
        setAddingCandidate(false);
        return;
      }

      setShowAddCandidateModal(false);
      setAddCandidateForm({ name: '', phone: '', college: '', email: '' });
      setAddingCandidate(false);
      fetchResults();
      fetchCollegeList();
    } catch (err) {
      console.error(err);
      setAddError('Server connection error.');
      setAddingCandidate(false);
    }
  };

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setDeletingCandidate(true);
    const token = localStorage.getItem('adminToken');

    try {
      const res = await fetch(`/api/admin/participant/${candidateToDelete.participant_db_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setCandidateToDelete(null);
        fetchResults();
        fetchCollegeList();
      }
    } catch (e) {
      console.error(e);
    }
    setDeletingCandidate(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#F0F8F8]">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F3238] uppercase tracking-tight">Participant Results & Candidates</h2>
          <p className="text-xs text-[#2C6A74]">
            Candidate management scoreboard with email details, candidate add/delete options, retake authorization, and CSV export.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          <button
            onClick={() => {
              setAddError('');
              setShowAddCandidateModal(true);
            }}
            className="px-5 py-3 bg-[#2C6A74] hover:bg-[#23555E] text-white rounded-2xl text-xs font-bold shadow-ocean-sm transition-all border border-[#23555E] flex items-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>Add Candidate</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-5 py-3 bg-[#AEE3E0] hover:bg-[#D0EFEF] text-[#2C6A74] rounded-2xl text-xs font-bold shadow-ocean-sm transition-all border border-[#AEE3E0] flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-[28px] shadow-ocean-sm border border-[#AEE3E0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#2C6A74] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Name, Phone, College, Email..."
            className="w-full pl-9 pr-3 py-2 bg-[#F0F8F8] border border-[#AEE3E0] rounded-xl text-xs sm:text-sm text-[#0F3238] focus:outline-none placeholder-gray-400"
          />
        </div>

        {/* Filter College */}
        <div>
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="w-full px-3 py-2 bg-[#F0F8F8] border border-[#AEE3E0] rounded-xl text-xs sm:text-sm text-[#0F3238] focus:outline-none"
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
            className="w-full px-3 py-2 bg-[#F0F8F8] border border-[#AEE3E0] rounded-xl text-xs sm:text-sm text-[#0F3238] focus:outline-none"
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
            className={`w-1/2 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
              sortBy === 'score'
                ? 'bg-[#2C6A74] text-white border-[#23555E]'
                : 'bg-[#F0F8F8] text-[#2C6A74] border-[#AEE3E0]'
            }`}
          >
            <span>Sort Score</span>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleSort('submitted_at')}
            className={`w-1/2 py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
              sortBy === 'submitted_at'
                ? 'bg-[#2C6A74] text-white border-[#23555E]'
                : 'bg-[#F0F8F8] text-[#2C6A74] border-[#AEE3E0]'
            }`}
          >
            <span>Sort Time</span>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Results Table */}
      <div className="bg-white rounded-[32px] shadow-ocean-md border border-[#AEE3E0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2C6A74] text-white text-xs font-extrabold uppercase tracking-wider border-b border-[#23555E]">
                <th className="p-4 pl-6">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">College</th>
                <th className="p-4">Email</th>
                <th className="p-4 text-center">Attempt #</th>
                <th className="p-4">Score</th>
                <th className="p-4">Percentage</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#AEE3E0]/60 text-xs sm:text-sm text-[#0F3238]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-[#2C6A74]">
                    <div className="inline-block w-6 h-6 border-2 border-[#2C6A74] border-t-transparent rounded-full animate-spin mr-2" />
                    Loading records...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-[#2C6A74] font-semibold">
                    No candidate records match the query.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={`${r.participant_db_id}-${r.attempt_id || 0}`} className="hover:bg-[#D0EFEF]/30 transition-colors">
                    <td className="p-4 pl-6 font-bold">{r.name}</td>
                    <td className="p-4 font-mono text-[#2C6A74]">{r.phone}</td>
                    <td className="p-4">{r.college}</td>
                    <td className="p-4 text-[#2C6A74]">{r.email || '-'}</td>
                    <td className="p-4 text-center font-bold">#{r.attempt_number || 1}</td>
                    <td className="p-4 font-bold">
                      {r.status === 'COMPLETED' ? (
                        <span>{r.score} <span className="text-[#2C6A74] font-normal text-xs">/ {r.total_marks || 10}</span></span>
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.status === 'COMPLETED' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D0EFEF] text-[#2C6A74] border border-[#AEE3E0]">
                          {r.percentage}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.status === 'COMPLETED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#2C6A74] text-white border border-[#23555E]">
                          COMPLETED
                        </span>
                      )}
                      {r.status === 'IN_PROGRESS' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#AEE3E0] text-[#0F3238]">
                          IN_PROGRESS
                        </span>
                      )}
                      {r.status === 'REGISTERED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#D0EFEF] text-[#2C6A74]">
                          REGISTERED
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(r.participant_db_id)}
                          className="p-1.5 rounded-xl bg-[#F0F8F8] hover:bg-[#D0EFEF] text-[#2C6A74] border border-[#AEE3E0] transition-colors cursor-pointer"
                          title="View Candidate Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleAllowRetake(r.phone)}
                          className="p-1.5 rounded-xl bg-[#F0F8F8] hover:bg-[#AEE3E0] text-[#2C6A74] border border-[#AEE3E0] transition-colors cursor-pointer"
                          title="Allow Retake Attempt"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleBlock(r.phone)}
                          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                            r.access_status === 'BLOCKED'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-[#F0F8F8] text-[#2C6A74] border-[#AEE3E0] hover:bg-red-50 hover:text-red-600'
                          }`}
                          title={r.access_status === 'BLOCKED' ? 'Unblock Candidate' : 'Block Candidate'}
                        >
                          {r.access_status === 'BLOCKED' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => setCandidateToDelete(r)}
                          className="p-1.5 rounded-xl bg-[#F0F8F8] hover:bg-red-100 text-red-600 border border-[#AEE3E0] hover:border-red-200 transition-colors cursor-pointer"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ADD CANDIDATE MODAL */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-ocean-lg border border-[#AEE3E0] space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2C6A74] text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F3238] uppercase">Add New Candidate</h3>
                  <p className="text-xs text-[#2C6A74]">Manually register a candidate into the system</p>
                </div>
              </div>
              <button onClick={() => setShowAddCandidateModal(false)} className="p-1.5 rounded-full hover:bg-[#D0EFEF]">
                <X className="w-5 h-5 text-[#0F3238]" />
              </button>
            </div>

            <form onSubmit={handleAddCandidateSubmit} className="space-y-4">
              {addError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {addError}
                </div>
              )}

              <div className="bg-[#F0F8F8] p-3 rounded-2xl border border-[#AEE3E0]">
                <label className="block text-[10px] font-bold uppercase text-[#2C6A74] mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  value={addCandidateForm.name}
                  onChange={(e) => setAddCandidateForm({ ...addCandidateForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full bg-transparent text-sm font-semibold text-[#0F3238] focus:outline-none"
                />
              </div>

              <div className="bg-[#F0F8F8] p-3 rounded-2xl border border-[#AEE3E0]">
                <label className="block text-[10px] font-bold uppercase text-[#2C6A74] mb-1">
                  PHONE NUMBER (10 Digits) *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={addCandidateForm.phone}
                  onChange={(e) => setAddCandidateForm({ ...addCandidateForm, phone: e.target.value })}
                  placeholder="9876543210"
                  required
                  className="w-full bg-transparent text-sm font-semibold text-[#0F3238] focus:outline-none"
                />
              </div>

              <div className="bg-[#F0F8F8] p-3 rounded-2xl border border-[#AEE3E0]">
                <label className="block text-[10px] font-bold uppercase text-[#2C6A74] mb-1">
                  COLLEGE NAME *
                </label>
                <input
                  type="text"
                  value={addCandidateForm.college}
                  onChange={(e) => setAddCandidateForm({ ...addCandidateForm, college: e.target.value })}
                  placeholder="e.g. IIT Delhi"
                  required
                  className="w-full bg-transparent text-sm font-semibold text-[#0F3238] focus:outline-none"
                />
              </div>

              <div className="bg-[#F0F8F8] p-3 rounded-2xl border border-[#AEE3E0]">
                <label className="block text-[10px] font-bold uppercase text-[#2C6A74] mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={addCandidateForm.email}
                  onChange={(e) => setAddCandidateForm({ ...addCandidateForm, email: e.target.value })}
                  placeholder="student@college.edu"
                  className="w-full bg-transparent text-sm font-semibold text-[#0F3238] focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="w-1/2 py-3 bg-[#F0F8F8] text-[#0F3238] rounded-2xl text-xs font-bold border border-[#AEE3E0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCandidate}
                  className="w-1/2 py-3 bg-[#2C6A74] hover:bg-[#23555E] text-white rounded-2xl text-xs font-bold border border-[#23555E] shadow-ocean-sm"
                >
                  {addingCandidate ? 'Saving...' : 'Add Candidate'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-ocean-lg border border-red-200 text-center space-y-5">
            
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#0F3238] uppercase">Delete Candidate?</h3>
              <p className="text-sm font-bold text-[#0F3238]">{candidateToDelete.name}</p>
              <p className="text-xs text-[#2C6A74]">
                This action will permanently delete candidate records, quiz attempts, and recorded answer sheets.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className="w-1/2 py-3 bg-[#F0F8F8] text-[#0F3238] rounded-2xl text-xs font-bold border border-[#AEE3E0]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteCandidate}
                disabled={deletingCandidate}
                className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-extrabold border border-red-700 shadow-ocean-sm"
              >
                {deletingCandidate ? 'Deleting...' : 'Delete'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Answer Breakdown Detail Modal */}
      {selectedCandidateId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-ocean-lg border border-[#AEE3E0]">
            
            <div className="bg-[#2C6A74] p-6 text-white flex items-center justify-between border-b border-[#23555E]">
              <div>
                <h3 className="text-lg font-bold uppercase text-white">Answer Sheet & History</h3>
                <p className="text-xs text-[#D0EFEF]">Candidate Profile Inspection</p>
              </div>
              <button
                onClick={() => setSelectedCandidateId(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {loadingModal ? (
                <div className="p-8 text-center text-[#2C6A74]">Loading candidate data...</div>
              ) : modalData ? (
                <>
                  <div className="bg-[#F0F8F8] border border-[#AEE3E0] p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[#2C6A74] uppercase font-bold text-[10px]">Name</p>
                      <p className="font-bold text-[#0F3238]">{modalData.participant?.name}</p>
                    </div>
                    <div>
                      <p className="text-[#2C6A74] uppercase font-bold text-[10px]">Phone</p>
                      <p className="font-bold text-[#0F3238]">{modalData.participant?.phone}</p>
                    </div>
                    <div>
                      <p className="text-[#2C6A74] uppercase font-bold text-[10px]">College</p>
                      <p className="font-bold text-[#0F3238]">{modalData.participant?.college}</p>
                    </div>
                    <div>
                      <p className="text-[#2C6A74] uppercase font-bold text-[10px]">Email</p>
                      <p className="font-bold text-[#0F3238]">{modalData.participant?.email || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0F3238] uppercase tracking-wider">
                      Question Answers ({modalData.answers?.length || 0})
                    </h4>

                    {modalData.answers?.map((q, idx) => (
                      <div
                        key={q.question_id}
                        className={`p-4 rounded-2xl border text-xs space-y-2 ${
                          q.is_correct === 1
                            ? 'bg-[#D0EFEF]/50 border-emerald-300'
                            : q.selected_answer
                            ? 'bg-red-50 border-red-200'
                            : 'bg-[#F0F8F8] border-[#AEE3E0]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-[#0F3238]">
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
                            Candidate Selected: <strong className="text-[#0F3238]">{q.selected_answer || 'None'}</strong>
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
                <p className="text-center text-[#2C6A74]">No candidate data available.</p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
