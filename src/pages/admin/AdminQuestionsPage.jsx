import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, X, AlertCircle } from 'lucide-react';

export default function AdminQuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    marks: 1,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQuestionAnalysis();
  }, []);

  const fetchQuestionAnalysis = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    try {
      const res = await fetch('/api/admin/question-analysis', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      const data = await res.json();
      setQuestions(data);
      setLoading(false);
    } catch (err) {
      console.error('Question analysis fetch error:', err);
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setFormData({
      question: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      marks: 1,
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (q) => {
    setEditingQuestion(q);
    setFormData({
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      marks: q.marks || 1,
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchQuestionAnalysis();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.question.trim() || !formData.option_a.trim() || !formData.option_b.trim() || !formData.option_c.trim() || !formData.option_d.trim()) {
      setError('All question text and option fields are required.');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('adminToken');
    const url = editingQuestion ? `/api/admin/questions/${editingQuestion.id}` : '/api/admin/questions';
    const method = editingQuestion ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save question.');
        setSaving(false);
        return;
      }

      setShowModal(false);
      setSaving(false);
      fetchQuestionAnalysis();
    } catch (err) {
      console.error('Save question error:', err);
      setError('Connection error.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-[#EBF7F7]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#2C6A74] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0F2F34]">Loading Question Bank...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#EBF7F7]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F2F34] uppercase tracking-tight">Question Bank & Analysis</h2>
          <p className="text-xs text-[#3D6E75]">
            Item response accuracy metrics, response distribution, and question CRUD management.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="self-start md:self-auto px-5 py-3 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-bold shadow-warm-sm transition-all flex items-center space-x-2 border border-[#5DA9B0]/30 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Question Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-[#D0EFEF]/60 rounded-[32px] p-6 shadow-warm-sm border border-[#AEE3E0] flex flex-col justify-between space-y-4 hover:shadow-warm-md transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block px-3 py-1 bg-[#AEE3E0] text-[#0F2F34] text-xs font-bold rounded-xl border border-[#5DA9B0]/40">
                  Question {idx + 1}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-2 rounded-xl bg-[#EBF7F7] hover:bg-[#AEE3E0] text-[#0F2F34] transition-colors border border-[#AEE3E0] cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#2C6A74]" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors border border-red-200 cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h4 className="text-sm font-bold text-[#0F2F34] leading-snug">{q.question}</h4>

              {/* Options */}
              <div className="grid grid-cols-2 gap-2 text-xs text-[#0F2F34] pt-1">
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'A' ? 'bg-[#2C6A74] text-white border-[#0F2F34] font-bold' : 'bg-[#EBF7F7] border-[#AEE3E0]'}`}>
                  A. {q.option_a}
                </div>
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'B' ? 'bg-[#2C6A74] text-white border-[#0F2F34] font-bold' : 'bg-[#EBF7F7] border-[#AEE3E0]'}`}>
                  B. {q.option_b}
                </div>
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'C' ? 'bg-[#2C6A74] text-white border-[#0F2F34] font-bold' : 'bg-[#EBF7F7] border-[#AEE3E0]'}`}>
                  C. {q.option_c}
                </div>
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'D' ? 'bg-[#2C6A74] text-white border-[#0F2F34] font-bold' : 'bg-[#EBF7F7] border-[#AEE3E0]'}`}>
                  D. {q.option_d}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-[#EBF7F7] p-4 rounded-2xl border border-[#AEE3E0] text-xs space-y-2">
              <div className="flex justify-between font-bold border-b border-[#AEE3E0] pb-1.5">
                <span className="text-[#3D6E75]">Total Responses: {q.totalResponses}</span>
                <span className="text-[#0F2F34]">Accuracy: {q.percentageCorrect}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="flex items-center space-x-1 font-semibold text-[#0F2F34]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2C6A74]" />
                  <span>Correct: <strong>{q.correctResponses}</strong></span>
                </div>
                <div className="flex items-center space-x-1 font-semibold text-[#3D6E75]">
                  <XCircle className="w-3.5 h-3.5 text-[#5DA9B0]" />
                  <span>Wrong: <strong>{q.wrongResponses}</strong></span>
                </div>
              </div>

              <div className="w-full bg-[#AEE3E0]/40 h-2 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-[#2C6A74] h-full rounded-full"
                  style={{ width: `${q.percentageCorrect}%` }}
                />
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-xl w-full p-6 shadow-warm-lg border border-[#AEE3E0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-3">
              <h3 className="text-lg font-bold text-[#0F2F34] uppercase">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-[#AEE3E0]">
                <X className="w-5 h-5 text-[#0F2F34]" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-2xl bg-red-50 text-red-700 font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#0F2F34] uppercase mb-1">Question Text</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={2}
                  required
                  placeholder="Enter problem statement..."
                  className="w-full p-3 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-sm font-semibold focus:outline-none text-[#0F2F34]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F2F34] uppercase mb-1">Option A</label>
                  <input
                    type="text"
                    value={formData.option_a}
                    onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-sm font-semibold focus:outline-none text-[#0F2F34]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F2F34] uppercase mb-1">Option B</label>
                  <input
                    type="text"
                    value={formData.option_b}
                    onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-sm font-semibold focus:outline-none text-[#0F2F34]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F2F34] uppercase mb-1">Option C</label>
                  <input
                    type="text"
                    value={formData.option_c}
                    onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-sm font-semibold focus:outline-none text-[#0F2F34]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F2F34] uppercase mb-1">Option D</label>
                  <input
                    type="text"
                    value={formData.option_d}
                    onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-sm font-semibold focus:outline-none text-[#0F2F34]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F2F34] uppercase mb-1">Correct Answer</label>
                  <select
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    className="w-full p-2.5 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-sm font-semibold focus:outline-none text-[#0F2F34]"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0F2F34] uppercase mb-1">Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-sm font-semibold focus:outline-none text-[#0F2F34]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-3 bg-[#EBF7F7] text-[#0F2F34] rounded-2xl font-bold border border-[#AEE3E0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-3 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl font-extrabold shadow-warm-sm border border-[#5DA9B0]/30"
                >
                  {saving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
