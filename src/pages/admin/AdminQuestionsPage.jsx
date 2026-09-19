import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, X, AlertCircle, FileUp, UploadCloud, Check, HelpCircle } from 'lucide-react';

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

  // Modal State for Import Questions
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

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

  // SMART DOCUMENT / TEXT PARSER FOR MULTIPLE CHOICE QUESTIONS
  const parseQuestionsFromText = (rawText) => {
    if (!rawText || !rawText.trim()) return [];

    // Try parsing as JSON first
    try {
      const json = JSON.parse(rawText);
      if (Array.isArray(json)) {
        return json.map((q, idx) => ({
          id: idx + 1,
          question: q.question || q.Question || `Question ${idx + 1}`,
          option_a: q.option_a || q.optionA || q.A || 'Option A',
          option_b: q.option_b || q.optionB || q.B || 'Option B',
          option_c: q.option_c || q.optionC || q.C || 'Option C',
          option_d: q.option_d || q.optionD || q.D || 'Option D',
          correct_answer: (q.correct_answer || q.correctAnswer || q.answer || 'A').toUpperCase(),
          marks: Number(q.marks || 1),
        }));
      }
    } catch (e) {
      // Not JSON, fallback to smart text parsing
    }

    // Split text into blocks by question numbers or double newlines
    const blocks = rawText.split(/(?=\n\s*(?:Q?\d+[\.\:\)]|\bQuestion\s+\d+[\.\:\)]))/i)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const parsedList = [];

    blocks.forEach((block, index) => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      let questionText = lines[0].replace(/^(?:Q?\d+[\.\:\)]|\bQuestion\s+\d+[\.\:\)]?)\s*/i, '').trim();
      let optA = '', optB = '', optC = '', optD = '', ansKey = 'A', marks = 1;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Check for option lines
        if (/^(?:A[\.\:\)]|\(A\))\s*/i.test(line)) {
          optA = line.replace(/^(?:A[\.\:\)]|\(A\))\s*/i, '').trim();
        } else if (/^(?:B[\.\:\)]|\(B\))\s*/i.test(line)) {
          optB = line.replace(/^(?:B[\.\:\)]|\(B\))\s*/i, '').trim();
        } else if (/^(?:C[\.\:\)]|\(C\))\s*/i.test(line)) {
          optC = line.replace(/^(?:C[\.\:\)]|\(C\))\s*/i, '').trim();
        } else if (/^(?:D[\.\:\)]|\(D\))\s*/i.test(line)) {
          optD = line.replace(/^(?:D[\.\:\)]|\(D\))\s*/i, '').trim();
        } else if (/^(?:Ans|Answer|Correct Answer|Key)[\.\:\)]?\s*([A-D])/i.test(line)) {
          const match = line.match(/^(?:Ans|Answer|Correct Answer|Key)[\.\:\)]?\s*([A-D])/i);
          if (match) ansKey = match[1].toUpperCase();
        } else if (!optA) {
          // Append multi-line question text if options haven't started
          questionText += ' ' + line;
        }
      }

      if (questionText) {
        parsedList.push({
          id: index + 1,
          question: questionText,
          option_a: optA || 'Option A',
          option_b: optB || 'Option B',
          option_c: optC || 'Option C',
          option_d: optD || 'Option D',
          correct_answer: ansKey,
          marks: marks,
        });
      }
    });

    return parsedList;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setImportError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setImportText(content);
      const parsed = parseQuestionsFromText(content);
      setParsedQuestions(parsed);
      if (parsed.length === 0) {
        setImportError('Could not automatically identify questions. Please ensure document has formatted questions or paste text directly.');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setImportText(text);
    setImportError('');
    const parsed = parseQuestionsFromText(text);
    setParsedQuestions(parsed);
  };

  const handleUpdateParsedQuestion = (index, field, value) => {
    const updated = [...parsedQuestions];
    updated[index][field] = value;
    setParsedQuestions(updated);
  };

  const handleDeleteParsedQuestion = (index) => {
    const updated = parsedQuestions.filter((_, i) => i !== index);
    setParsedQuestions(updated);
  };

  const handleConfirmImport = async () => {
    if (parsedQuestions.length === 0) {
      setImportError('No questions ready to import.');
      return;
    }

    setImporting(true);
    setImportError('');
    const token = localStorage.getItem('adminToken');

    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: parsedQuestions }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || 'Failed to import questions.');
        setImporting(false);
        return;
      }

      setImportSuccessMsg(`Successfully imported ${data.count} questions!`);
      setTimeout(() => setImportSuccessMsg(''), 4000);
      setShowImportModal(false);
      setImportText('');
      setFileName('');
      setParsedQuestions([]);
      setImporting(false);
      fetchQuestionAnalysis();
    } catch (err) {
      console.error(err);
      setImportError('Server connection error.');
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-[#F0F8F8]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#5DA9B0] border-t-[#2C6A74] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0F3238]">Loading Question Bank...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#F0F8F8]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F3238] uppercase tracking-tight">Question Bank & Analysis</h2>
          <p className="text-xs text-[#2C6A74]">
            Item response accuracy metrics, response distribution, and question CRUD & document import management.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          <button
            onClick={() => {
              setImportError('');
              setShowImportModal(true);
            }}
            className="px-5 py-3 bg-[#AEE3E0] hover:bg-[#D0EFEF] text-[#2C6A74] rounded-2xl text-xs font-bold shadow-ocean-sm transition-all border border-[#AEE3E0] flex items-center space-x-2 cursor-pointer"
          >
            <FileUp className="w-4 h-4" />
            <span>Import Questions</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-[#2C6A74] hover:bg-[#23555E] text-white rounded-2xl text-xs font-bold shadow-ocean-sm transition-all flex items-center space-x-2 border border-[#23555E] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add New Question</span>
          </button>
        </div>
      </div>

      {importSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-[#D0EFEF] border border-[#5DA9B0] text-[#0F3238] text-xs font-bold flex items-center space-x-2">
          <Check className="w-4 h-4 text-[#2C6A74] stroke-[3]" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* Question Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-white rounded-[32px] p-6 shadow-ocean-sm border border-[#AEE3E0] flex flex-col justify-between space-y-4 hover:shadow-ocean-md transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block px-3 py-1 bg-[#D0EFEF] text-[#2C6A74] text-xs font-bold rounded-xl border border-[#AEE3E0]">
                  Question {idx + 1}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-2 rounded-xl bg-[#F0F8F8] hover:bg-[#D0EFEF] text-[#2C6A74] transition-colors border border-[#AEE3E0] cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
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

              <h4 className="text-sm font-bold text-[#0F3238] leading-snug">{q.question}</h4>

              {/* Options */}
              <div className="grid grid-cols-2 gap-2 text-xs text-[#0F3238] pt-1">
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'A' ? 'bg-[#2C6A74] text-white border-[#23555E] font-bold' : 'bg-[#F0F8F8] border-[#AEE3E0]'}`}>
                  A. {q.option_a}
                </div>
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'B' ? 'bg-[#2C6A74] text-white border-[#23555E] font-bold' : 'bg-[#F0F8F8] border-[#AEE3E0]'}`}>
                  B. {q.option_b}
                </div>
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'C' ? 'bg-[#2C6A74] text-white border-[#23555E] font-bold' : 'bg-[#F0F8F8] border-[#AEE3E0]'}`}>
                  C. {q.option_c}
                </div>
                <div className={`p-2.5 rounded-xl border ${q.correct_answer === 'D' ? 'bg-[#2C6A74] text-white border-[#23555E] font-bold' : 'bg-[#F0F8F8] border-[#AEE3E0]'}`}>
                  D. {q.option_d}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-[#F0F8F8] p-4 rounded-2xl border border-[#AEE3E0] text-xs space-y-2">
              <div className="flex justify-between font-bold border-b border-[#AEE3E0] pb-1.5">
                <span>Total Responses: {q.totalResponses}</span>
                <span className="text-[#0F3238]">Accuracy: {q.percentageCorrect}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="flex items-center space-x-1 font-semibold text-[#0F3238]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2C6A74]" />
                  <span>Correct: <strong>{q.correctResponses}</strong></span>
                </div>
                <div className="flex items-center space-x-1 font-semibold text-[#2C6A74]">
                  <XCircle className="w-3.5 h-3.5 text-[#2C6A74]" />
                  <span>Wrong: <strong>{q.wrongResponses}</strong></span>
                </div>
              </div>

              <div className="w-full bg-[#D0EFEF] h-2 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-[#2C6A74] h-full rounded-full"
                  style={{ width: `${q.percentageCorrect}%` }}
                />
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Add / Edit Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-6 shadow-ocean-lg border border-[#AEE3E0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-3">
              <h3 className="text-lg font-bold text-[#0F3238] uppercase">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-[#D0EFEF]">
                <X className="w-5 h-5 text-[#0F3238]" />
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
                <label className="block font-bold text-[#2C6A74] uppercase mb-1">Question Text</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={2}
                  required
                  placeholder="Enter problem statement..."
                  className="w-full p-3 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-sm font-semibold text-[#0F3238] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2C6A74] uppercase mb-1">Option A</label>
                  <input
                    type="text"
                    value={formData.option_a}
                    onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-sm font-semibold text-[#0F3238] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2C6A74] uppercase mb-1">Option B</label>
                  <input
                    type="text"
                    value={formData.option_b}
                    onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-sm font-semibold text-[#0F3238] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2C6A74] uppercase mb-1">Option C</label>
                  <input
                    type="text"
                    value={formData.option_c}
                    onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-sm font-semibold text-[#0F3238] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2C6A74] uppercase mb-1">Option D</label>
                  <input
                    type="text"
                    value={formData.option_d}
                    onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                    required
                    className="w-full p-2.5 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-sm font-semibold text-[#0F3238] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2C6A74] uppercase mb-1">Correct Answer</label>
                  <select
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    className="w-full p-2.5 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-sm font-semibold text-[#0F3238] focus:outline-none"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2C6A74] uppercase mb-1">Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-sm font-semibold text-[#0F3238] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-3 bg-[#F0F8F8] text-[#0F3238] rounded-2xl font-bold border border-[#AEE3E0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-3 bg-[#2C6A74] hover:bg-[#23555E] text-white rounded-2xl font-extrabold shadow-ocean-sm border border-[#23555E]"
                >
                  {saving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT / PDF IMPORT QUESTIONS MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-ocean-lg border border-[#AEE3E0]">
            
            <div className="bg-[#2C6A74] p-6 text-white flex items-center justify-between border-b border-[#23555E]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <FileUp className="w-5 h-5 text-[#D0EFEF]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase text-white">Import Questions from Document / PDF</h3>
                  <p className="text-xs text-[#D0EFEF]">Upload a document (.pdf, .docx, .txt, .json, .csv) or paste formatted question text</p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              {importError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* File Upload Box */}
                <div className="bg-[#F0F8F8] border-2 border-dashed border-[#AEE3E0] rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-3">
                  <UploadCloud className="w-10 h-10 text-[#2C6A74]" />
                  <div>
                    <p className="text-xs font-bold text-[#0F3238]">Upload Question Document</p>
                    <p className="text-[11px] text-[#2C6A74] mt-0.5">Supports PDF, DOCX, TXT, JSON, CSV files</p>
                  </div>
                  <label className="px-4 py-2 bg-[#2C6A74] hover:bg-[#23555E] text-white text-xs font-bold rounded-xl cursor-pointer shadow-ocean-sm border border-[#23555E]">
                    Choose Document File
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.json,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {fileName && <p className="text-xs font-bold text-[#2C6A74]">Loaded: {fileName}</p>}
                </div>

                {/* Direct Text Area */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#0F3238] uppercase">
                    Or Paste Formatted Text:
                  </label>
                  <textarea
                    rows={6}
                    value={importText}
                    onChange={handleTextChange}
                    placeholder={`Example Format:
1. What does CSS stand for?
A) Creative Style Sheets
B) Cascading Style Sheets
C) Computer Style Software
D) Colorful Style Syntax
Answer: B`}
                    className="w-full p-3 bg-[#F0F8F8] border border-[#AEE3E0] rounded-2xl text-xs font-mono text-[#0F3238] focus:outline-none"
                  />
                </div>

              </div>

              {/* Parsed Questions Preview Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F3238]">
                    Parsed Questions Preview ({parsedQuestions.length})
                  </h4>
                  {parsedQuestions.length > 0 && (
                    <span className="text-[11px] text-[#2C6A74] font-semibold">
                      Verify or edit options before saving to database
                    </span>
                  )}
                </div>

                {parsedQuestions.length === 0 ? (
                  <div className="p-6 bg-[#F0F8F8] rounded-2xl text-center border border-[#AEE3E0] text-xs text-[#2C6A74]">
                    No parsed questions detected yet. Upload a document or paste text above.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {parsedQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 bg-[#F0F8F8] rounded-2xl border border-[#AEE3E0] text-xs space-y-3 relative">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#2C6A74] uppercase">Question {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteParsedQuestion(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => handleUpdateParsedQuestion(idx, 'question', e.target.value)}
                            className="w-full p-2 bg-white border border-[#AEE3E0] rounded-xl text-xs font-bold text-[#0F3238]"
                            placeholder="Question text"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={q.option_a}
                            onChange={(e) => handleUpdateParsedQuestion(idx, 'option_a', e.target.value)}
                            className="p-1.5 bg-white border border-[#AEE3E0] rounded-lg text-xs"
                            placeholder="Option A"
                          />
                          <input
                            type="text"
                            value={q.option_b}
                            onChange={(e) => handleUpdateParsedQuestion(idx, 'option_b', e.target.value)}
                            className="p-1.5 bg-white border border-[#AEE3E0] rounded-lg text-xs"
                            placeholder="Option B"
                          />
                          <input
                            type="text"
                            value={q.option_c}
                            onChange={(e) => handleUpdateParsedQuestion(idx, 'option_c', e.target.value)}
                            className="p-1.5 bg-white border border-[#AEE3E0] rounded-lg text-xs"
                            placeholder="Option C"
                          />
                          <input
                            type="text"
                            value={q.option_d}
                            onChange={(e) => handleUpdateParsedQuestion(idx, 'option_d', e.target.value)}
                            className="p-1.5 bg-white border border-[#AEE3E0] rounded-lg text-xs"
                            placeholder="Option D"
                          />
                        </div>

                        <div className="flex items-center space-x-4 pt-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-[#2C6A74]">Correct Key:</span>
                            <select
                              value={q.correct_answer}
                              onChange={(e) => handleUpdateParsedQuestion(idx, 'correct_answer', e.target.value)}
                              className="p-1 bg-white border border-[#AEE3E0] rounded-lg text-xs font-bold text-[#0F3238]"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Modal Actions */}
            <div className="p-5 bg-[#F0F8F8] border-t border-[#AEE3E0] flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-6 py-3 bg-white hover:bg-[#D0EFEF] text-[#0F3238] rounded-2xl text-xs font-bold border border-[#AEE3E0]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || parsedQuestions.length === 0}
                className="px-8 py-3 bg-[#2C6A74] hover:bg-[#23555E] text-white rounded-2xl text-xs font-extrabold border border-[#23555E] shadow-ocean-sm flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{importing ? 'Importing...' : `Confirm & Import ${parsedQuestions.length} Questions`}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
