import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Clock, Send, AlertTriangle, Menu, X, CheckCircle2, Edit3, Eye, ShieldAlert, Lock } from 'lucide-react';

export default function QuizPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  // Configurable countdown timer (defaults to 30 mins if not fetched)
  const [timeLeft, setTimeLeft] = useState(1800);

  // Modals & Drawers
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('participant_phone');
    if (!savedPhone) {
      navigate('/register');
      return;
    }

    fetchSessionAndQuestions(savedPhone);
  }, [navigate]);

  const fetchSessionAndQuestions = async (phone) => {
    try {
      // 1. Fetch Session
      const sessRes = await fetch(`/api/participant/session/${phone}`);
      if (!sessRes.ok) throw new Error('Failed to load session.');
      const sessData = await sessRes.json();

      if (sessData.access_status === 'BLOCKED' || sessData.status === 'BLOCKED') {
        setIsBlocked(true);
        setSession(sessData);
        setLoading(false);
        return;
      }

      if (sessData.status === 'COMPLETED' && sessData.access_status !== 'ALLOWED_RETAKE') {
        navigate('/quiz/submitted');
        return;
      }

      setSession(sessData);
      if (sessData.savedAnswers) {
        setAnswers(sessData.savedAnswers);
      }

      // 2. Fetch Sanitized Questions
      const qRes = await fetch('/api/quiz/questions');
      if (!qRes.ok) throw new Error('Failed to fetch questions.');
      const qData = await qRes.json();
      setQuestions(qData);

      // 3. Fetch Public Quiz Settings (Duration)
      const settingsRes = await fetch('/api/quiz/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.durationMinutes) {
          setTimeLeft(settingsData.durationMinutes * 60);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Quiz init error:', err);
      setError('Unable to load quiz content. Please ensure server is running.');
      setLoading(false);
    }
  };

  // Tab Switch & Window Blur Detection Effect
  useEffect(() => {
    if (loading || submitting || isBlocked || !session || !session.phone) return;

    const handleTabSwitch = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerTabSwitchBlock();
      }
    };

    const handleWindowBlur = () => {
      triggerTabSwitchBlock();
    };

    const triggerTabSwitchBlock = async () => {
      setIsBlocked(true);
      try {
        await fetch('/api/quiz/tab-switch-block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: session.phone }),
        });
      } catch (err) {
        console.error('Error reporting tab switch block:', err);
      }
    };

    document.addEventListener('visibilitychange', handleTabSwitch);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleTabSwitch);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [loading, submitting, isBlocked, session]);

  // Timer Effect
  useEffect(() => {
    if (loading || isBlocked || showSubmitModal || showReviewModal || showUnansweredModal || submitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(); // Auto-submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isBlocked, showSubmitModal, showReviewModal, showUnansweredModal, submitting]);

  // Handle Option Selection with Auto-Save
  const handleSelectOption = (questionId, optionKey) => {
    const newAnswers = { ...answers, [questionId]: optionKey };
    setAnswers(newAnswers);

    if (session && session.phone) {
      fetch('/api/quiz/save-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: session.phone,
          question_id: questionId,
          selected_answer: optionKey,
        }),
      }).catch((e) => console.error('Auto-save error:', e));
    }
  };

  // Check unanswered questions
  const getUnansweredQuestionIndices = () => {
    return questions
      .map((q, idx) => ({ qId: q.id, index: idx + 1, answered: !!answers[q.id] }))
      .filter((q) => !q.answered);
  };

  const handleAttemptSubmit = () => {
    const unanswered = getUnansweredQuestionIndices();
    if (unanswered.length > 0) {
      setShowUnansweredModal(true);
    } else {
      setShowSubmitModal(true);
    }
  };

  // Final Submit Action
  const handleFinalSubmit = async () => {
    if (!session || !session.phone || submitting) return;

    setSubmitting(true);
    setShowSubmitModal(false);
    setShowReviewModal(false);

    const answerPayload = Object.keys(answers).map((qId) => ({
      question_id: Number(qId),
      selected_answer: answers[qId],
    }));

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: session.phone,
          answers: answerPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.unansweredCount) {
          setShowUnansweredModal(true);
        } else {
          setError(data.error || 'Submission failed.');
        }
        setSubmitting(false);
        return;
      }

      navigate('/quiz/submitted');
    } catch (err) {
      console.error('Submission fetch error:', err);
      setError('Connection error during submission. Please try again.');
      setSubmitting(false);
    }
  };

  // Jump to specific question for editing
  const handleJumpToQuestion = (index) => {
    setCurrentIndex(index);
    setShowReviewModal(false);
    setShowUnansweredModal(false);
  };

  const handleJumpToFirstUnanswered = () => {
    const unanswered = getUnansweredQuestionIndices();
    if (unanswered.length > 0) {
      setCurrentIndex(unanswered[0].index - 1);
    }
    setShowUnansweredModal(false);
  };

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-[#EDEEE9]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#D7BDB0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#171717]">Loading Quiz Questions...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center p-4 bg-[#EDEEE9]">
        <div className="bg-[#F5EBE1] rounded-[36px] p-8 sm:p-10 shadow-warm-lg max-w-lg w-full border border-red-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <Lock className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider rounded-full border border-red-200 inline-block">
              Examination Security Violation
            </span>
            <h2 className="text-2xl font-black text-[#171717] tracking-tight">
              QUIZ ATTEMPT LOCKED
            </h2>
          </div>

          <div className="bg-[#EDEEE9] p-5 rounded-2xl border border-[#D6CCC2] text-left space-y-3">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-xs uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Tab Switch / Window Blur Detected</span>
            </div>
            <p className="text-xs text-[#68635F] leading-relaxed">
              You switched browser tabs, minimized the window, or lost active screen focus during the examination. Under official competition anti-cheating regulations, your quiz session has been immediately suspended.
            </p>
          </div>

          <div className="p-4 bg-[#E3D5CA] rounded-2xl border border-[#D6CCC2] text-xs font-semibold text-[#171717] space-y-1">
            <p className="font-bold">Need assistance to resume?</p>
            <p className="text-[#68635F]">
              Please inform your exam invigilator / quiz administrator. They can verify and unblock your access directly from the admin dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] rounded-2xl text-xs font-extrabold border border-[#E3D5CA] shadow-warm-sm transition-all"
          >
            Check Status / Refresh
          </button>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center p-4 bg-[#EDEEE9]">
        <div className="bg-[#F5EBE1] rounded-[32px] p-8 shadow-warm-md max-w-md w-full border border-[#E3D5CA] text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-[#68635F] mx-auto" />
          <h3 className="text-lg font-bold text-[#171717]">Quiz Error</h3>
          <p className="text-xs text-[#68635F]">{error || 'No questions available.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#D7BDB0] text-[#171717] rounded-2xl text-xs font-bold hover:bg-[#C5A99B] border border-[#E3D5CA]"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const remainingCount = totalCount - answeredCount;
  const isAllAnswered = answeredCount === totalCount;
  const progressPct = Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="min-h-[calc(100vh-9rem)] py-8 px-4 sm:px-6 lg:px-8 bg-[#EDEEE9] flex flex-col justify-between max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Bar */}
      <div className="bg-[#F5EBE1] rounded-[28px] p-4 shadow-warm-sm border border-[#E3D5CA] flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left: Progress info */}
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
            Question {currentIndex + 1} of {totalCount}
          </span>
          <p className="text-xs text-[#68635F]">
            Answered: <strong className="text-[#171717]">{answeredCount} / {totalCount}</strong>
            <span className="ml-2 text-gray-400">({remainingCount} remaining)</span>
          </p>
        </div>

        {/* Center: Progress Bar */}
        <div className="w-full sm:w-1/3 space-y-1">
          <div className="flex justify-between text-[11px] font-semibold text-[#171717]">
            <span>Completion</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-[#EDEEE9] h-2.5 rounded-full overflow-hidden border border-[#D6CCC2]">
            <div
              className="bg-[#D7BDB0] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Right: Timer & Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-2 bg-[#E3D5CA] px-3.5 py-2 rounded-2xl border border-[#D6CCC2]">
            <Clock className="w-4 h-4 text-[#171717]" />
            <span className="text-xs font-semibold text-[#171717]">Time:</span>
            <span className="text-sm font-mono font-extrabold text-[#171717]">{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowReviewModal(true)}
            className="px-3 py-2 rounded-2xl bg-[#E3D5CA] hover:bg-[#D6CCC2] text-[#171717] text-xs font-bold flex items-center space-x-1.5 border border-[#D6CCC2] transition-colors cursor-pointer"
            title="Review All Answers"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Review All</span>
          </button>

          <button
            onClick={() => setShowMobileDrawer(true)}
            className="md:hidden px-3.5 py-2 rounded-2xl bg-[#D7BDB0] text-[#171717] text-xs font-bold flex items-center space-x-1.5 border border-[#E3D5CA]"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main 2-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT AREA: 8 Columns Question & Options */}
        <div className="md:col-span-8 space-y-6">
          
          <div className="bg-[#F5EBE1] rounded-[32px] p-6 sm:p-8 shadow-warm-md border border-[#E3D5CA] space-y-6">
            
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-[#E3D5CA] text-[#171717] text-xs font-bold rounded-xl border border-[#D6CCC2]">
                QUESTION {currentIndex + 1}
              </span>
              <h3 className="text-base sm:text-xl font-bold text-[#171717] leading-relaxed">
                {currentQ.question}
              </h3>
            </div>

            {/* 4 Answer Option Cards */}
            <div className="space-y-3 pt-2">
              {[
                { key: 'A', label: currentQ.option_a },
                { key: 'B', label: currentQ.option_b },
                { key: 'C', label: currentQ.option_c },
                { key: 'D', label: currentQ.option_d },
              ].map((opt) => {
                const isSelected = answers[currentQ.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, opt.key)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#E3D5CA] border-[#D7BDB0] ring-2 ring-[#D7BDB0] shadow-warm-sm font-semibold'
                        : 'bg-[#EDEEE9] border-[#D6CCC2] hover:bg-[#E3D5CA]/50 text-[#171717]'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-[#D7BDB0] text-[#171717] border border-[#E3D5CA]'
                            : 'bg-[#F5EBE1] text-[#171717] border border-[#D6CCC2]'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-[#171717]">{opt.label}</span>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#D7BDB0] text-[#171717] flex items-center justify-center border border-[#E3D5CA]">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Navigation & Submit Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="py-3 px-5 bg-[#F5EBE1] hover:bg-[#E3D5CA] text-[#171717] text-xs sm:text-sm font-bold rounded-2xl border border-[#E3D5CA] shadow-warm-sm transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="py-3 px-5 bg-[#E3D5CA] hover:bg-[#D6CCC2] text-[#171717] text-xs sm:text-sm font-bold rounded-2xl border border-[#D6CCC2] shadow-warm-sm transition-all flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Review All ({answeredCount}/{totalCount})</span>
            </button>

            {currentIndex < totalCount - 1 && (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                className="py-3 px-5 bg-[#F5EBE1] hover:bg-[#E3D5CA] text-[#171717] text-xs sm:text-sm font-bold rounded-2xl border border-[#E3D5CA] shadow-warm-sm transition-all flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              onClick={handleAttemptSubmit}
              disabled={!isAllAnswered}
              className={`py-3 px-6 text-xs sm:text-sm font-extrabold rounded-2xl shadow-warm-md transition-all flex items-center space-x-2 border ${
                isAllAnswered
                  ? 'bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] border-[#E3D5CA] cursor-pointer'
                  : 'bg-[#D6CCC2] text-[#68635F] border-gray-300 opacity-60 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isAllAnswered ? 'SUBMIT QUIZ' : `ANSWER ALL (${answeredCount}/${totalCount})`}</span>
            </button>
          </div>

        </div>

        {/* RIGHT AREA: 4 Columns Question Navigator Panel (Desktop) */}
        <div className="hidden md:block md:col-span-4">
          <div className="bg-[#F5EBE1] rounded-[32px] p-6 shadow-warm-md border border-[#E3D5CA] space-y-6 sticky top-28">
            
            <div className="border-b border-[#E3D5CA] pb-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#171717]">
                QUESTION NAVIGATOR
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs pt-3">
                <div className="bg-[#EDEEE9] p-2.5 rounded-xl border border-[#D6CCC2]">
                  <p className="text-[10px] text-[#68635F] uppercase font-bold">Answered</p>
                  <p className="text-base font-extrabold text-[#171717]">{answeredCount} / {totalCount}</p>
                </div>
                <div className="bg-[#EDEEE9] p-2.5 rounded-xl border border-[#D6CCC2]">
                  <p className="text-[10px] text-[#68635F] uppercase font-bold">Remaining</p>
                  <p className="text-base font-extrabold text-[#68635F]">{remainingCount}</p>
                </div>
              </div>
            </div>

            {/* CSS Grid of Question Numbers */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isCurrent = currentIndex === idx;
                const isAnswered = !!answers[q.id];

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-[#D7BDB0] text-[#171717] border-[#171717] ring-2 ring-[#D7BDB0] shadow-warm-sm font-black'
                        : isAnswered
                        ? 'bg-[#E3D5CA] text-[#171717] border-[#D6CCC2]'
                        : 'bg-[#EDEEE9] text-[#68635F] border-[#D6CCC2] hover:bg-[#E3D5CA]/40'
                    }`}
                  >
                    {isAnswered ? (
                      <span className="flex items-center space-x-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-[#171717]" />
                      </span>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-[#E3D5CA] grid grid-cols-3 gap-2 text-[10px] text-[#68635F] font-semibold">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-md bg-[#D7BDB0] border border-[#171717]" />
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-md bg-[#E3D5CA] border border-[#D6CCC2]" />
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-md bg-[#EDEEE9] border border-[#D6CCC2]" />
                <span>Pending</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* MOBILE BOTTOM DRAWER */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center md:hidden">
          <div className="bg-[#F5EBE1] rounded-t-[32px] w-full max-h-[80vh] p-6 shadow-warm-lg border-t border-[#E3D5CA] space-y-5 overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#E3D5CA] pb-3">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#171717]">
                QUESTIONS NAVIGATOR
              </h4>
              <button
                onClick={() => setShowMobileDrawer(false)}
                className="p-1 rounded-full hover:bg-[#E3D5CA]"
              >
                <X className="w-5 h-5 text-[#171717]" />
              </button>
            </div>

            <div className="flex justify-between text-xs text-[#68635F] font-semibold">
              <span>Answered: <strong className="text-[#171717]">{answeredCount} / {totalCount}</strong></span>
              <span>Remaining: <strong className="text-[#171717]">{remainingCount}</strong></span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {questions.map((q, idx) => {
                const isCurrent = currentIndex === idx;
                const isAnswered = !!answers[q.id];

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowMobileDrawer(false);
                    }}
                    className={`h-12 rounded-xl text-xs font-bold flex items-center justify-center border ${
                      isCurrent
                        ? 'bg-[#D7BDB0] text-[#171717] border-[#171717] ring-2 ring-[#D7BDB0]'
                        : isAnswered
                        ? 'bg-[#E3D5CA] text-[#171717] border-[#D6CCC2]'
                        : 'bg-[#EDEEE9] text-[#68635F] border-[#D6CCC2]'
                    }`}
                  >
                    {isAnswered ? `✓ ${idx + 1}` : idx + 1}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* REVIEW ALL ANSWERS MODAL (Scrollable list with Change Answer buttons) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5EBE1] rounded-[36px] max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-warm-lg border border-[#E3D5CA]">
            
            <div className="bg-[#D7BDB0] p-6 text-[#171717] flex items-center justify-between border-b border-[#E3D5CA]">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Review All Questions & Answers</h3>
                <p className="text-xs text-[#68635F] mt-0.5">
                  Verify your choices. Click "Change Answer" next to any question to edit.
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-full hover:bg-[#E3D5CA]"
              >
                <X className="w-5 h-5 text-[#171717]" />
              </button>
            </div>

            {/* Scrollable Questions List */}
            <div className="p-6 overflow-y-auto space-y-4">
              {questions.map((q, idx) => {
                const selectedKey = answers[q.id];
                const optionMap = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
                const selectedText = selectedKey ? optionMap[selectedKey] : null;

                return (
                  <div
                    key={q.id}
                    className={`p-5 rounded-2xl border text-xs sm:text-sm space-y-3 ${
                      selectedKey
                        ? 'bg-[#EDEEE9] border-[#D6CCC2]'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-[#171717]">
                          Q{idx + 1}. {q.question}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJumpToQuestion(idx)}
                        className="px-3 py-1.5 bg-[#E3D5CA] hover:bg-[#D7BDB0] text-[#171717] rounded-xl text-xs font-bold border border-[#D6CCC2] flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{selectedKey ? 'Change Answer' : 'Answer Now'}</span>
                      </button>
                    </div>

                    <div className="pt-1">
                      {selectedKey ? (
                        <div className="p-2.5 bg-[#E3D5CA]/60 rounded-xl border border-[#D6CCC2] flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#171717]">
                            Selected Choice: <strong>Option {selectedKey}</strong> — {selectedText}
                          </span>
                          <Check className="w-4 h-4 text-[#171717] stroke-[3]" />
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 font-semibold">
                          ⚠️ Unanswered
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="p-5 bg-[#E3D5CA] border-t border-[#D6CCC2] flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-6 py-3 bg-[#F5EBE1] hover:bg-[#EDEEE9] text-[#171717] rounded-2xl text-xs font-bold border border-[#D6CCC2]"
              >
                Make Changes
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  handleAttemptSubmit();
                }}
                disabled={!isAllAnswered}
                className={`px-8 py-3 rounded-2xl text-xs font-extrabold border shadow-warm-sm flex items-center space-x-2 ${
                  isAllAnswered
                    ? 'bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] border-[#E3D5CA] cursor-pointer'
                    : 'bg-[#D6CCC2] text-[#68635F] border-gray-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Submit Quiz</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* UNANSWERED QUESTION POPUP MODAL */}
      {showUnansweredModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5EBE1] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#E3D5CA] space-y-5 text-center">
            
            <div className="w-14 h-14 rounded-full bg-[#E3D5CA] text-[#171717] flex items-center justify-center mx-auto border border-[#D6CCC2]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#171717] uppercase">Complete Your Quiz</h3>
              <p className="text-sm font-semibold text-[#171717]">
                {remainingCount} question{remainingCount > 1 ? 's are' : ' is'} still unanswered.
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 pt-2 pb-1">
                {getUnansweredQuestionIndices().map((item) => (
                  <span
                    key={item.qId}
                    onClick={() => {
                      setCurrentIndex(item.index - 1);
                      setShowUnansweredModal(false);
                    }}
                    className="px-3 py-1 bg-[#D7BDB0] text-[#171717] text-xs font-bold rounded-lg cursor-pointer hover:bg-[#C5A99B] border border-[#E3D5CA]"
                  >
                    Q{item.index}
                  </span>
                ))}
              </div>

              <p className="text-xs text-[#68635F]">
                Answer every question before submitting your attempt.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUnansweredModal(false)}
                className="w-1/2 py-3 bg-[#EDEEE9] text-[#171717] rounded-2xl text-xs font-bold border border-[#D6CCC2]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleJumpToFirstUnanswered}
                className="w-1/2 py-3 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] rounded-2xl text-xs font-extrabold border border-[#E3D5CA] shadow-warm-sm"
              >
                Go to Unanswered
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION SUBMIT MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5EBE1] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#E3D5CA] space-y-5 text-center">
            
            <div className="w-14 h-14 rounded-full bg-[#D7BDB0] text-[#171717] flex items-center justify-center mx-auto border border-[#E3D5CA]">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#171717] uppercase">Submit Your Quiz?</h3>
              <p className="text-sm font-semibold text-[#171717]">
                You have answered all {totalCount} questions.
              </p>
              <p className="text-xs text-[#68635F]">
                Once submitted, your answers cannot be changed.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  setShowReviewModal(true);
                }}
                className="w-1/2 py-3 bg-[#EDEEE9] text-[#171717] rounded-2xl text-xs font-bold border border-[#D6CCC2]"
              >
                Review Answers
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="w-1/2 py-3 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] rounded-2xl text-xs font-extrabold border border-[#E3D5CA] shadow-warm-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
