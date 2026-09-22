import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, X, AlertCircle, FileText, FileUp, Sparkles, Check } from 'lucide-react';

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

  // Modal & Parser State for Plain Text Question Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [parsedErrors, setParsedErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importErrorMsg, setImportErrorMsg] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [fileName, setFileName] = useState('');

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

  // Custom Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, questionId: null, questionText: '', deleting: false });

  const openDeleteModal = (id, questionText) => {
    setDeleteModal({ isOpen: true, questionId: id, questionText, deleting: false });
  };

  const executeDelete = async () => {
    if (!deleteModal.questionId) return;
    const targetId = deleteModal.questionId;
    setDeleteModal((prev) => ({ ...prev, deleting: true }));
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`/api/admin/questions/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== targetId));
        setDeleteModal({ isOpen: false, questionId: null, questionText: '', deleting: false });
        fetchQuestionAnalysis();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete question.');
        setDeleteModal((prev) => ({ ...prev, deleting: false }));
      }
    } catch (e) {
      console.error('Delete question error:', e);
      alert('Connection error while deleting question.');
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Clear All Questions Confirmation Modal State
  const [clearAllModal, setClearAllModal] = useState({ isOpen: false, clearing: false });

  const executeClearAll = async () => {
    setClearAllModal((prev) => ({ ...prev, clearing: true }));
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      if (res.ok) {
        setQuestions([]);
        setClearAllModal({ isOpen: false, clearing: false });
        fetchQuestionAnalysis();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to clear questions.');
        setClearAllModal((prev) => ({ ...prev, clearing: false }));
      }
    } catch (e) {
      console.error('Clear all questions error:', e);
      alert('Connection error while clearing questions.');
      setClearAllModal((prev) => ({ ...prev, clearing: false }));
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

  // Robust 40+ Question Plain Text Format Parser
  const parseDocumentText = (text) => {
    if (!text || !text.trim()) {
      setParsedPreview([]);
      setParsedErrors([]);
      return;
    }

    // Try JSON Array parse first
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        const validJsonQs = json.filter(q => q.question && q.option_a && q.option_b).map((q, idx) => ({
          questionNumber: idx + 1,
          question: String(q.question).trim(),
          option_a: String(q.option_a || 'Option A').trim(),
          option_b: String(q.option_b || 'Option B').trim(),
          option_c: String(q.option_c || 'Option C').trim(),
          option_d: String(q.option_d || 'Option D').trim(),
          correct_answer: String(q.correct_answer || 'A').trim().toUpperCase(),
          marks: Number(q.marks) || 1
        }));
        if (validJsonQs.length > 0) {
          setParsedPreview(validJsonQs);
          setParsedErrors([]);
          return;
        }
      }
    } catch (e) {
      // Fall through to regex block text parser
    }

    const rawLines = text.split(/\r?\n/);
    const blocks = [];
    let currentBlock = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      const isQHeader = /^(?:\*\*|\#\#)?\s*(?:Q(?:uestion)?\s*\d+|\d+)[\.\:\)]/i.test(line);

      if (isQHeader && currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      if (line) {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    const validQuestions = [];
    const problems = [];

    blocks.forEach((blockLines, blockIdx) => {
      let qText = '';
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';
      let correctAns = '';
      let questionNumber = blockIdx + 1;

      for (let line of blockLines) {
        const cleanLine = line.replace(/\*\*/g, '').replace(/✅/g, '').trim();

        // Question header
        const qMatch = cleanLine.match(/^(?:Q(?:uestion)?\s*(\d+)[\.\:\)]|(\d+)[\.\:\)])\s*(.+)/i);
        if (qMatch && !qText) {
          questionNumber = parseInt(qMatch[1] || qMatch[2], 10) || (blockIdx + 1);
          qText = qMatch[3].trim();
          continue;
        }

        // Answer marker e.g. "Answer: A", "Ans: A", "Correct Answer: A"
        const ansMatch = cleanLine.match(/^(?:Ans(?:wer)?|Correct(?:\s*Answer|\s*Option)?|Key)[\:\-\s]*([A-D])/i);
        if (ansMatch) {
          correctAns = ansMatch[1].toUpperCase();
          continue;
        }

        // Options A, B, C, D
        const optAMatch = cleanLine.match(/^(?:\(A\)|A[\)\.\:]|\bA\b[\)\.\:])\s*(.+)/i);
        const optBMatch = cleanLine.match(/^(?:\(B\)|B[\)\.\:]|\bB\b[\)\.\:])\s*(.+)/i);
        const optCMatch = cleanLine.match(/^(?:\(C\)|C[\)\.\:]|\bC\b[\)\.\:])\s*(.+)/i);
        const optDMatch = cleanLine.match(/^(?:\(D\)|D[\)\.\:]|\bD\b[\)\.\:])\s*(.+)/i);

        if (optAMatch) { optA = optAMatch[1].trim(); continue; }
        if (optBMatch) { optB = optBMatch[1].trim(); continue; }
        if (optCMatch) { optC = optCMatch[1].trim(); continue; }
        if (optDMatch) { optD = optDMatch[1].trim(); continue; }

        if (!optA && qText) {
          qText += ' ' + cleanLine;
        } else if (!qText) {
          qText = cleanLine;
        }
      }

      const blockErrors = [];
      if (!qText) blockErrors.push('Missing Question Text');
      if (!optA) blockErrors.push('Missing Option A');
      if (!optB) blockErrors.push('Missing Option B');
      if (!optC) blockErrors.push('Missing Option C');
      if (!optD) blockErrors.push('Missing Option D');
      if (!correctAns || !['A', 'B', 'C', 'D'].includes(correctAns)) {
        blockErrors.push('Missing or invalid Answer (must be A, B, C, or D)');
      }

      if (blockErrors.length > 0) {
        problems.push({
          questionNumber,
          issues: blockErrors
        });
      } else {
        validQuestions.push({
          questionNumber,
          question: qText,
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_answer: correctAns,
          marks: 1
        });
      }
    });

    setParsedPreview(validQuestions);
    setParsedErrors(problems);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setImportErrorMsg('');
    setImportSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setRawImportText(content);
      parseDocumentText(content);
    };
    reader.onerror = () => {
      setImportErrorMsg('Failed to read file contents.');
    };
    reader.readAsText(file);
  };

  const handleRawTextChange = (e) => {
    const val = e.target.value;
    setRawImportText(val);
    parseDocumentText(val);
  };

  const handleExecuteImport = async () => {
    if (parsedPreview.length === 0) {
      setImportErrorMsg('No valid questions parsed from document text.');
      return;
    }

    if (parsedErrors.length > 0) {
      setImportErrorMsg(`Cannot import: ${parsedErrors.length} question(s) are malformed. Please fix errors first.`);
      return;
    }

    setImporting(true);
    setImportErrorMsg('');
    const token = localStorage.getItem('adminToken');

    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: parsedPreview }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportErrorMsg(data.error || 'Import failed.');
        setImporting(false);
        return;
      }

      setImportSuccessMsg(`Successfully imported ${data.importedCount || parsedPreview.length} questions into Question Bank!`);
      setImporting(false);
      fetchQuestionAnalysis();

      setTimeout(() => {
        setShowImportModal(false);
        setRawImportText('');
        setParsedPreview([]);
        setParsedErrors([]);
        setFileName('');
        setImportSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Execute import error:', err);
      setImportErrorMsg('Connection error during import.');
      setImporting(false);
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

        <div className="flex items-center space-x-3 self-start md:self-auto flex-wrap gap-2">
          <button
            onClick={() => {
              setRawImportText('');
              setParsedPreview([]);
              setParsedErrors([]);
              setFileName('');
              setImportErrorMsg('');
              setImportSuccessMsg('');
              setShowImportModal(true);
            }}
            className="px-5 py-3 bg-[#5DA9B0] hover:bg-[#489198] text-white rounded-2xl text-xs font-bold shadow-warm-sm transition-all flex items-center space-x-2 border border-white/20 cursor-pointer"
          >
            <FileUp className="w-4 h-4 text-white" />
            <span>Import Questions (Plain Text)</span>
          </button>

          {questions.length > 0 && (
            <button
              onClick={() => setClearAllModal({ isOpen: true, clearing: false })}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-warm-sm transition-all flex items-center space-x-2 border border-red-300 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Clear All Questions ({questions.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {questions.length === 0 && (
        <div className="bg-[#D0EFEF]/40 border-2 border-dashed border-[#5DA9B0] rounded-[32px] p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#AEE3E0] flex items-center justify-center mx-auto text-[#2C6A74]">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#0F2F34]">Question Bank is Empty</h3>
            <p className="text-xs text-[#3D6E75] max-w-md mx-auto">
              No questions found. Add questions manually using "Add New Question" or upload a batch using "Import Questions".
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={handleOpenAdd}
              className="px-6 py-3 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-bold shadow-warm-sm transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add First Question</span>
            </button>
          </div>
        </div>
      )}

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
                    onClick={() => openDeleteModal(q.id, q.question)}
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

      {/* Manual Add/Edit Question Modal */}
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

      {/* PDF / Plain Text Document Import Questions Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#D0EFEF] rounded-[36px] max-w-3xl w-full p-6 sm:p-8 shadow-warm-lg border border-[#AEE3E0] space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-4">
              <div className="flex items-center space-x-2">
                <FileUp className="w-6 h-6 text-[#2C6A74]" />
                <div>
                  <h3 className="text-xl font-black text-[#0F2F34] uppercase tracking-tight">Import Questions from Plain Text</h3>
                  <p className="text-xs text-[#3D6E75]">Supports 40+ questions in markdown format with bold markers & ✅ answers.</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1.5 rounded-full hover:bg-[#AEE3E0]">
                <X className="w-5 h-5 text-[#0F2F34]" />
              </button>
            </div>

            {/* File Upload Drop Zone */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#0F2F34] uppercase">Select Question Text / Document File</label>
              <div className="border-2 border-dashed border-[#5DA9B0] bg-[#EBF7F7] rounded-3xl p-5 text-center space-y-2 relative hover:bg-[#AEE3E0]/30 transition-all">
                <input
                  type="file"
                  accept=".txt,.doc,.docx,.pdf,.json"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileText className="w-8 h-8 text-[#2C6A74] mx-auto" />
                <p className="text-xs font-bold text-[#0F2F34]">
                  {fileName ? `Loaded: ${fileName}` : 'Click to Upload or Drag .txt / .doc / .pdf File'}
                </p>
              </div>
            </div>

            {/* Direct Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#0F2F34] uppercase">Question Text Input / Paste Box</label>
                <span className="text-[11px] font-bold text-[#2C6A74]">
                  Parsed Valid Questions: {parsedPreview.length}
                </span>
              </div>
              <textarea
                value={rawImportText}
                onChange={handleRawTextChange}
                rows={6}
                placeholder={`Format Example:\n**1. What does HTML stand for?**\n A) Hyper Text Markup Language\n B) High Text Machine Language\n C) Hyperlink Text Management Language\n D) Home Tool Markup Language\n ✅ **Answer: A**`}
                className="w-full p-4 bg-[#EBF7F7] border border-[#AEE3E0] rounded-2xl text-xs font-mono focus:outline-none text-[#0F2F34] leading-relaxed"
              />
            </div>

            {/* Error Reporting for Malformed Questions */}
            {parsedErrors.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Malformed Questions Identified ({parsedErrors.length}):</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  {parsedErrors.map((err, idx) => (
                    <li key={idx}>
                      <strong>Question #{err.questionNumber}:</strong> {err.issues.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Live Parsed Questions Preview Grid */}
            {parsedPreview.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-2">
                  <span className="text-xs font-black uppercase text-[#0F2F34]">Parsed Questions Preview ({parsedPreview.length})</span>
                  <span className="text-[10px] bg-[#2C6A74] text-white px-2.5 py-0.5 rounded-full font-bold">Ready to Import</span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
                  {parsedPreview.map((q, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#AEE3E0] text-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-[#0F2F34]">Q{idx + 1}. {q.question}</span>
                        <span className="bg-[#AEE3E0] text-[#0F2F34] px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0">Correct: {q.correct_answer}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#3D6E75]">
                        <div>A. {q.option_a}</div>
                        <div>B. {q.option_b}</div>
                        <div>C. {q.option_c}</div>
                        <div>D. {q.option_d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Messages */}
            {importErrorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 text-xs font-bold flex items-center space-x-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{importErrorMsg}</span>
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center space-x-2 border border-emerald-200">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-1/3 py-3.5 bg-[#EBF7F7] hover:bg-[#AEE3E0] text-[#0F2F34] rounded-2xl text-xs font-bold border border-[#AEE3E0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={parsedPreview.length === 0 || parsedErrors.length > 0 || importing}
                className="w-2/3 py-3.5 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-extrabold border border-[#5DA9B0]/30 shadow-warm-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <span>Importing Questions...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>IMPORT ALL ({parsedPreview.length}) QUESTIONS</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Delete Question Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-md w-full p-6 shadow-warm-lg border border-[#AEE3E0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-3">
              <h3 className="text-lg font-bold text-[#0F2F34] uppercase">Delete Question</h3>
              <button
                onClick={() => setDeleteModal({ isOpen: false, questionId: null, questionText: '', deleting: false })}
                className="p-1 rounded-full hover:bg-[#AEE3E0]"
              >
                <X className="w-5 h-5 text-[#0F2F34]" />
              </button>
            </div>
            <p className="text-xs text-[#0F2F34]">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="p-3 bg-[#EBF7F7] rounded-2xl border border-[#AEE3E0] text-xs font-semibold text-[#0F2F34] max-h-24 overflow-y-auto">
              "{deleteModal.questionText}"
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, questionId: null, questionText: '', deleting: false })}
                className="w-1/2 py-3 bg-[#EBF7F7] text-[#0F2F34] rounded-2xl font-bold border border-[#AEE3E0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleteModal.deleting}
                className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-extrabold shadow-warm-sm border border-red-300 cursor-pointer disabled:opacity-50"
              >
                {deleteModal.deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Questions Confirmation Modal */}
      {clearAllModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-md w-full p-6 shadow-warm-lg border border-[#AEE3E0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-3">
              <h3 className="text-lg font-bold text-red-700 uppercase flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Clear All Questions</span>
              </h3>
              <button
                onClick={() => setClearAllModal({ isOpen: false, clearing: false })}
                className="p-1 rounded-full hover:bg-[#AEE3E0]"
              >
                <X className="w-5 h-5 text-[#0F2F34]" />
              </button>
            </div>
            <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs font-medium text-red-800 space-y-1">
              <p className="font-bold">⚠️ Warning: Permanent Action</p>
              <p>This will delete ALL questions in the question bank ({questions.length} questions).</p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setClearAllModal({ isOpen: false, clearing: false })}
                className="w-1/2 py-3 bg-[#EBF7F7] text-[#0F2F34] rounded-2xl font-bold border border-[#AEE3E0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeClearAll}
                disabled={clearAllModal.clearing}
                className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-extrabold shadow-warm-sm border border-red-300 cursor-pointer disabled:opacity-50"
              >
                {clearAllModal.clearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
