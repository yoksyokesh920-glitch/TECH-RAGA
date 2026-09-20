import React, { useState, useEffect, useRef } from 'react';
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
  const [isExpired, setIsExpired] = useState(false);

  // Server-authoritative timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const testEndTimeRef = useRef(null);

  // Modals & UI State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showFullscreenLockModal, setShowFullscreenLockModal] = useState(false);
  const isSendingViolationRef = useRef(false);

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

      if (sessData.status === 'EXPIRED') {
        setIsExpired(true);
        setSession(sessData);
        setLoading(false);
        return;
      }

      if (sessData.status === 'COMPLETED' && sessData.access_status !== 'ALLOWED_RETAKE') {
        navigate('/quiz/submitted');
        return;
      }

      if (sessData.status === 'REGISTERED') {
        navigate('/quiz/start');
        return;
      }

      setSession(sessData);
      setWarningCount(sessData.warning_count || 0);

      if (sessData.savedAnswers) {
        setAnswers(sessData.savedAnswers);
      }

      if (sessData.test_end_time) {
        testEndTimeRef.current = new Date(sessData.test_end_time).getTime();
        const initialSecs = Math.max(0, Math.floor((testEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(initialSecs);
        if (initialSecs <= 0) {
          setIsExpired(true);
        }
      }

      // 2. Fetch Sanitized Questions
      const qRes = await fetch(`/api/quiz/questions?phone=${phone}`);
      if (!qRes.ok) {
        const errData = await qRes.json();
        if (errData.status === 'BLOCKED') setIsBlocked(true);
        if (errData.status === 'EXPIRED') setIsExpired(true);
        throw new Error(errData.error || 'Failed to fetch questions.');
      }
      const qData = await qRes.json();
      setQuestions(qData);

      // Attempt fullscreen request on quiz load
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      setLoading(false);
    } catch (err) {
      console.error('Quiz init error:', err);
      if (!isBlocked && !isExpired) {
        setError(err.message || 'Unable to load quiz content. Please ensure server is running.');
      }
      setLoading(false);
    }
  };

  // Security Violation Reporter with Server-Side Deduplication & Cooldown
  const handleSecurityViolation = async () => {
    if (loading || submitting || isBlocked || isExpired || !session || !session.phone) return;
    if (isSendingViolationRef.current) return;

    isSendingViolationRef.current = true;
    setTimeout(() => {
      isSendingViolationRef.current = false;
    }, 2500);

    try {
      const res = await fetch('/api/quiz/tab-switch-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: session.phone }),
      });

      const data = await res.json();
      if (data.status === 'BLOCKED' || data.blocked) {
        setIsBlocked(true);
        setShowWarningModal(false);
        setShowFullscreenLockModal(false);
        setWarningCount(3);
      } else if (data.warningCount === 1 || data.warningCount === 2) {
        setWarningCount(data.warningCount);
        setWarningMessage(data.message);
        setShowWarningModal(true);
      }
    } catch (err) {
      console.error('Error reporting security violation:', err);
    }
  };

  // Tab Switch & Fullscreen Exit Detection Effect
  useEffect(() => {
    if (loading || submitting || isBlocked || isExpired || !session || !session.phone) return;

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setShowFullscreenLockModal(true);
        handleSecurityViolation();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submitting && !isBlocked && !isExpired) {
        setShowFullscreenLockModal(true);
        handleSecurityViolation();
      } else if (document.fullscreenElement) {
        setShowFullscreenLockModal(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [loading, submitting, isBlocked, isExpired, session]);

  // Server-Authoritative Immutable Timer Effect
  useEffect(() => {
    if (loading || isBlocked || isExpired || submitting || !testEndTimeRef.current) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((testEndTimeRef.current - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setIsExpired(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isBlocked, isExpired, submitting]);

  // Handle Option Selection with Real-Time Server Auto-Save & Transparent Retry
  const handleSelectOption = (questionId, optionKey) => {
    if (isBlocked || isExpired || submitting) return;

    const newAnswers = { ...answers, [questionId]: optionKey };
    setAnswers(newAnswers);

    if (session && session.phone) {
      const saveWithRetry = (retriesLeft = 3, delay = 300) => {
        fetch('/api/quiz/save-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: session.phone,
            question_id: questionId,
            selected_answer: optionKey,
          }),
        })
        .then((res) => {
          if (!res.ok) {
            return res.json().then(data => {
              if (data.status === 'EXPIRED') setIsExpired(true);
              if (data.status === 'BLOCKED') setIsBlocked(true);
              if (retriesLeft > 0 && res.status >= 500) {
                setTimeout(() => saveWithRetry(retriesLeft - 1, delay * 2), delay);
              }
            });
          }
        })
        .catch((e) => {
          console.warn(`Auto-save retry (${3 - retriesLeft + 1}):`, e);
          if (retriesLeft > 0) {
            setTimeout(() => saveWithRetry(retriesLeft - 1, delay * 2), delay);
          }
        });
      };

      saveWithRetry();
    }
  };

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

  // Final Submit Action with Fullscreen Exit ONLY on successful submission
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
        if (data.status === 'EXPIRED') {
          setIsExpired(true);
        } else if (data.status === 'BLOCKED') {
          setIsBlocked(true);
        } else if (data.unansweredCount) {
          setShowUnansweredModal(true);
        } else {
          setError(data.error || 'Submission failed.');
        }
        setSubmitting(false);
        return;
      }

      // ONLY AFTER SUCCESSFUL SUBMISSION: Exit browser fullscreen mode
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      navigate('/quiz/submitted');
    } catch (err) {
      console.error('Submission fetch error:', err);
      setError('Connection error during submission. Please try again.');
      setSubmitting(false);
    }
  };

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
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center bg-[#EBF7F7]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#2C6A74] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0F2F34]">Loading Quiz Questions...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center p-4 bg-[#EBF7F7]">
        <div className="bg-[#D0EFEF] rounded-[36px] p-8 sm:p-10 shadow-warm-lg max-w-lg w-full border border-red-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <Lock className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider rounded-full border border-red-200 inline-block">
              Examination Security Violation
            </span>
            <h2 className="text-2xl font-black text-[#0F2F34] tracking-tight">
              QUIZ ATTEMPT BLOCKED
            </h2>
          </div>

          <div className="bg-[#EBF7F7] p-5 rounded-2xl border border-[#AEE3E0] text-left space-y-3">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-xs uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>2 Security Violations Exceeded</span>
            </div>
            <p className="text-xs text-[#0F2F34] font-medium leading-relaxed">
              Your test has been blocked due to repeated violations. Please contact the administrator.
            </p>
          </div>

          <div className="p-4 bg-[#AEE3E0]/60 rounded-2xl border border-[#5DA9B0]/30 text-xs font-semibold text-[#0F2F34] space-y-1">
            <p className="font-bold">Need assistance to unblock?</p>
            <p className="text-[#3D6E75]">
              Please inform your exam invigilator / quiz administrator. They can verify and unblock your candidate account from the Admin Panel if your test timer has not expired.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-extrabold border border-[#5DA9B0]/30 shadow-warm-sm transition-all cursor-pointer"
          >
            Check Status / Refresh
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center p-4 bg-[#EBF7F7]">
        <div className="bg-[#D0EFEF] rounded-[36px] p-8 sm:p-10 shadow-warm-lg max-w-lg w-full border border-[#AEE3E0] text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-300">
            <Clock className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider rounded-full border border-amber-200 inline-block">
              Time Limit Expired
            </span>
            <h2 className="text-2xl font-black text-[#0F2F34] tracking-tight">
              EXAMINATION TIME EXPIRED
            </h2>
          </div>

          <div className="bg-[#EBF7F7] p-5 rounded-2xl border border-[#AEE3E0] text-left space-y-2 text-xs">
            <p className="font-bold text-[#0F2F34]">Your test session has expired.</p>
            <p className="text-[#3D6E75]">Your answers have been saved in the database.</p>
            <p className="text-[#3D6E75]">Please contact the administrator if you require another attempt.</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/quiz/submitted')}
            className="w-full py-3.5 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-extrabold border border-[#5DA9B0]/30 shadow-warm-sm transition-all cursor-pointer"
          >
            View Saved Status
          </button>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center p-4 bg-[#EBF7F7]">
        <div className="bg-[#D0EFEF] rounded-[32px] p-8 shadow-warm-md max-w-md w-full border border-[#AEE3E0] text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-[#3D6E75] mx-auto" />
          <h3 className="text-lg font-bold text-[#0F2F34]">Quiz Error</h3>
          <p className="text-xs text-[#3D6E75]">{error || 'No questions available.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#2C6A74] text-white rounded-2xl text-xs font-bold hover:bg-[#22555D] border border-[#5DA9B0]/30"
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
    <div className="min-h-[calc(100vh-9rem)] py-8 px-4 sm:px-6 lg:px-8 bg-[#EBF7F7] flex flex-col justify-between max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Bar */}
      <div className="bg-[#D0EFEF]/80 rounded-[28px] p-4 shadow-warm-sm border border-[#AEE3E0] flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left: Progress info */}
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-xs font-bold text-[#0F2F34] uppercase tracking-wider">
            Question {currentIndex + 1} of {totalCount}
          </span>
          <p className="text-xs text-[#3D6E75]">
            Answered: <strong className="text-[#0F2F34]">{answeredCount} / {totalCount}</strong>
            <span className="ml-2 text-[#3D6E75]/70">({remainingCount} remaining)</span>
          </p>
        </div>

        {/* Center: Progress Bar */}
        <div className="w-full sm:w-1/3 space-y-1">
          <div className="flex justify-between text-[11px] font-semibold text-[#0F2F34]">
            <span>Completion</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-[#EBF7F7] h-2.5 rounded-full overflow-hidden border border-[#AEE3E0]">
            <div
              className="bg-[#2C6A74] h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Right: Server-Authoritative Timer & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-2 bg-[#2C6A74] px-3.5 py-2 rounded-2xl text-white border border-[#5DA9B0]/30 shadow-xs">
            <Clock className="w-4 h-4 text-[#AEE3E0]" />
            <span className="text-xs font-semibold text-[#D0EFEF]">Time:</span>
            <span className="text-sm font-mono font-extrabold text-white">{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowReviewModal(true)}
            className="px-3 py-2 rounded-2xl bg-[#AEE3E0] hover:bg-[#9CD5D2] text-[#0F2F34] text-xs font-bold flex items-center space-x-1.5 border border-[#5DA9B0]/40 transition-colors cursor-pointer"
            title="Review All Answers"
          >
            <Eye className="w-4 h-4 text-[#2C6A74]" />
            <span className="hidden sm:inline">Review All</span>
          </button>

          <button
            onClick={() => setShowMobileDrawer(true)}
            className="md:hidden px-3.5 py-2 rounded-2xl bg-[#2C6A74] text-white text-xs font-bold flex items-center space-x-1.5 border border-[#5DA9B0]/30"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main 2-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT AREA: 8 Columns Question & Options */}
        <div className="md:col-span-8 space-y-6">
          
          <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-warm-md border border-[#AEE3E0] space-y-6">
            
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-[#AEE3E0] text-[#0F2F34] text-xs font-bold rounded-xl border border-[#5DA9B0]/40">
                QUESTION {currentIndex + 1}
              </span>
              <h3 className="text-base sm:text-xl font-bold text-[#0F2F34] leading-relaxed">
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
                        ? 'bg-[#D0EFEF] border-[#2C6A74] ring-2 ring-[#2C6A74] shadow-warm-sm font-semibold'
                        : 'bg-[#EBF7F7] border-[#AEE3E0] hover:bg-[#D0EFEF]/50 text-[#0F2F34]'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-[#2C6A74] text-white border border-[#5DA9B0]'
                            : 'bg-white text-[#0F2F34] border border-[#AEE3E0]'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-[#0F2F34]">{opt.label}</span>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#2C6A74] text-white flex items-center justify-center border border-[#5DA9B0]">
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
              className="py-3 px-5 bg-white hover:bg-[#D0EFEF] text-[#0F2F34] text-xs sm:text-sm font-bold rounded-2xl border border-[#AEE3E0] shadow-warm-sm transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#2C6A74]" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="py-3 px-5 bg-[#AEE3E0] hover:bg-[#9CD5D2] text-[#0F2F34] text-xs sm:text-sm font-bold rounded-2xl border border-[#5DA9B0]/40 shadow-warm-sm transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#2C6A74]" />
              <span>Review All ({answeredCount}/{totalCount})</span>
            </button>

            {currentIndex < totalCount - 1 && (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                className="py-3 px-5 bg-white hover:bg-[#D0EFEF] text-[#0F2F34] text-xs sm:text-sm font-bold rounded-2xl border border-[#AEE3E0] shadow-warm-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 text-[#2C6A74]" />
              </button>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              onClick={handleAttemptSubmit}
              disabled={!isAllAnswered}
              className={`py-3 px-6 text-xs sm:text-sm font-extrabold rounded-2xl shadow-warm-md transition-all flex items-center space-x-2 border ${
                isAllAnswered
                  ? 'bg-[#2C6A74] hover:bg-[#22555D] text-white border-[#5DA9B0]/30 cursor-pointer'
                  : 'bg-[#5DA9B0]/30 text-[#3D6E75] border-[#AEE3E0] opacity-60 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isAllAnswered ? 'SUBMIT QUIZ' : `ANSWER ALL (${answeredCount}/${totalCount})`}</span>
            </button>
          </div>

        </div>

        {/* RIGHT AREA: 4 Columns Question Navigator Panel (Desktop) */}
        <div className="hidden md:block md:col-span-4">
          <div className="bg-white rounded-[32px] p-6 shadow-warm-md border border-[#AEE3E0] space-y-6 sticky top-28">
            
            <div className="border-b border-[#AEE3E0] pb-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F34]">
                QUESTION NAVIGATOR
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs pt-3">
                <div className="bg-[#EBF7F7] p-2.5 rounded-xl border border-[#AEE3E0]">
                  <p className="text-[10px] text-[#3D6E75] uppercase font-bold">Answered</p>
                  <p className="text-base font-extrabold text-[#0F2F34]">{answeredCount} / {totalCount}</p>
                </div>
                <div className="bg-[#EBF7F7] p-2.5 rounded-xl border border-[#AEE3E0]">
                  <p className="text-[10px] text-[#3D6E75] uppercase font-bold">Remaining</p>
                  <p className="text-base font-extrabold text-[#3D6E75]">{remainingCount}</p>
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
                        ? 'bg-[#2C6A74] text-white border-[#0F2F34] ring-2 ring-[#5DA9B0] shadow-warm-sm font-black'
                        : isAnswered
                        ? 'bg-[#AEE3E0] text-[#0F2F34] border-[#5DA9B0]/40 font-bold'
                        : 'bg-[#EBF7F7] text-[#3D6E75] border-[#AEE3E0] hover:bg-[#D0EFEF]'
                    }`}
                  >
                    {isAnswered ? (
                      <span className="flex items-center space-x-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-[#0F2F34]" />
                      </span>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-[#AEE3E0] grid grid-cols-3 gap-2 text-[10px] text-[#3D6E75] font-semibold">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-md bg-[#2C6A74] border border-[#0F2F34]" />
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-md bg-[#AEE3E0] border border-[#5DA9B0]" />
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-md bg-[#EBF7F7] border border-[#AEE3E0]" />
                <span>Pending</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* MOBILE BOTTOM DRAWER */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center md:hidden">
          <div className="bg-[#D0EFEF] rounded-t-[32px] w-full max-h-[80vh] p-6 shadow-warm-lg border-t border-[#AEE3E0] space-y-5 overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#AEE3E0] pb-3">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F34]">
                QUESTIONS NAVIGATOR
              </h4>
              <button
                onClick={() => setShowMobileDrawer(false)}
                className="p-1 rounded-full hover:bg-[#AEE3E0]"
              >
                <X className="w-5 h-5 text-[#0F2F34]" />
              </button>
            </div>

            <div className="flex justify-between text-xs text-[#3D6E75] font-semibold">
              <span>Answered: <strong className="text-[#0F2F34]">{answeredCount} / {totalCount}</strong></span>
              <span>Remaining: <strong className="text-[#0F2F34]">{remainingCount}</strong></span>
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
                        ? 'bg-[#2C6A74] text-white border-[#0F2F34] ring-2 ring-[#5DA9B0]'
                        : isAnswered
                        ? 'bg-[#AEE3E0] text-[#0F2F34] border-[#5DA9B0]/40'
                        : 'bg-[#EBF7F7] text-[#3D6E75] border-[#AEE3E0]'
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

      {/* REVIEW ALL ANSWERS MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#D0EFEF] rounded-[36px] max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-warm-lg border border-[#AEE3E0]">
            
            <div className="bg-[#2C6A74] p-6 text-white flex items-center justify-between border-b border-[#5DA9B0]/30">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white">Review All Questions & Answers</h3>
                <p className="text-xs text-[#D0EFEF] mt-0.5">
                  Verify your choices. Click "Change Answer" next to any question to edit.
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
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
                        ? 'bg-[#EBF7F7] border-[#AEE3E0]'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-[#0F2F34]">
                          Q{idx + 1}. {q.question}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJumpToQuestion(idx)}
                        className="px-3 py-1.5 bg-[#AEE3E0] hover:bg-[#9CD5D2] text-[#0F2F34] rounded-xl text-xs font-bold border border-[#5DA9B0]/40 flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#2C6A74]" />
                        <span>{selectedKey ? 'Change Answer' : 'Answer Now'}</span>
                      </button>
                    </div>

                    <div className="pt-1">
                      {selectedKey ? (
                        <div className="p-2.5 bg-[#AEE3E0]/40 rounded-xl border border-[#5DA9B0]/30 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#0F2F34]">
                            Selected Choice: <strong>Option {selectedKey}</strong> — {selectedText}
                          </span>
                          <Check className="w-4 h-4 text-[#2C6A74] stroke-[3]" />
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
            <div className="p-5 bg-[#AEE3E0] border-t border-[#5DA9B0]/30 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-6 py-3 bg-white hover:bg-[#EBF7F7] text-[#0F2F34] rounded-2xl text-xs font-bold border border-[#AEE3E0]"
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
                    ? 'bg-[#2C6A74] hover:bg-[#22555D] text-white border-[#5DA9B0]/30 cursor-pointer'
                    : 'bg-[#5DA9B0]/30 text-[#3D6E75] border-[#AEE3E0] opacity-60 cursor-not-allowed'
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
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#AEE3E0] space-y-5 text-center">
            
            <div className="w-14 h-14 rounded-full bg-[#AEE3E0] text-[#2C6A74] flex items-center justify-center mx-auto border border-[#5DA9B0]/40">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#0F2F34] uppercase">Complete Your Quiz</h3>
              <p className="text-sm font-semibold text-[#0F2F34]">
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
                    className="px-3 py-1 bg-[#2C6A74] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#22555D] border border-[#5DA9B0]/30"
                  >
                    Q{item.index}
                  </span>
                ))}
              </div>

              <p className="text-xs text-[#3D6E75]">
                Answer every question before submitting your attempt.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUnansweredModal(false)}
                className="w-1/2 py-3 bg-[#EBF7F7] text-[#0F2F34] rounded-2xl text-xs font-bold border border-[#AEE3E0]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleJumpToFirstUnanswered}
                className="w-1/2 py-3 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-extrabold border border-[#5DA9B0]/30 shadow-warm-sm"
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
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#AEE3E0] space-y-5 text-center">
            
            <div className="w-14 h-14 rounded-full bg-[#2C6A74] text-white flex items-center justify-center mx-auto border border-[#5DA9B0]">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#0F2F34] uppercase">Submit Your Quiz?</h3>
              <p className="text-sm font-semibold text-[#0F2F34]">
                You have answered all {totalCount} questions.
              </p>
              <p className="text-xs text-[#3D6E75]">
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
                className="w-1/2 py-3 bg-[#EBF7F7] text-[#0F2F34] rounded-2xl text-xs font-bold border border-[#AEE3E0]"
              >
                Review Answers
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="w-1/2 py-3 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-extrabold border border-[#5DA9B0]/30 shadow-warm-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WARNING MODAL (STAGE 1 & STAGE 2) */}
      {showWarningModal && !isBlocked && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#AEE3E0] space-y-5 text-center animate-in fade-in zoom-in duration-200">
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
              warningCount === 2
                ? 'bg-red-100 text-red-700 border-red-300'
                : 'bg-amber-100 text-amber-700 border-amber-300'
            }`}>
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#0F2F34] uppercase">
                {warningCount === 2 ? 'Final Security Warning' : 'Tab Switch / Window Blur Warning'}
              </h3>

              <div className={`inline-block text-xs font-extrabold px-3.5 py-1 rounded-full border mb-1 ${
                warningCount === 2
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {warningCount === 2 ? '⚠️ Warning 2 of 2 (FINAL WARNING)' : '⚠️ Warning 1 of 2 (1 Warning Remaining)'}
              </div>

              <p className="text-xs text-[#0F2F34] font-semibold pt-2 leading-relaxed">
                {warningMessage || (warningCount === 2
                  ? 'Warning 2 of 2 (FINAL WARNING): Switching tabs or leaving full screen again will permanently block your test!'
                  : 'Warning 1 of 2: Leaving the quiz/fullscreen or switching tabs is not allowed. 1 warning remaining.')}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
                className={`w-full py-3.5 text-white rounded-2xl text-sm font-extrabold shadow-warm-sm transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  warningCount === 2
                    ? 'bg-red-700 hover:bg-red-800 border border-red-800'
                    : 'bg-[#2C6A74] hover:bg-[#22555D] border border-[#5DA9B0]/30'
                }`}
              >
                <span>← Go Back & Resume Quiz</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULLSCREEN LOCK CONCEALMENT OVERLAY */}
      {showFullscreenLockModal && !isBlocked && !isExpired && (
        <div className="fixed inset-0 z-[9999] bg-[#0F2F34] flex items-center justify-center p-6 text-center text-white">
          <div className="bg-[#D0EFEF] text-[#0F2F34] rounded-[36px] p-8 sm:p-10 shadow-warm-lg max-w-lg w-full border border-[#AEE3E0] space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <Lock className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider rounded-full border border-red-200 inline-block">
                Examination Security Violation
              </span>
              <h2 className="text-2xl font-black text-[#0F2F34] tracking-tight">
                QUIZ ATTEMPT LOCKED
              </h2>
            </div>

            <p className="text-xs text-[#0F2F34] font-semibold leading-relaxed">
              Tab Switch / Window Blur Detected. You switched browser tabs, minimized the window, or lost active screen focus during the examination.
            </p>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-800 space-y-1">
              <p className="font-bold">⚠️ Security Notice (2 Warnings Policy)</p>
              <p>Under official competition anti-cheating regulations, questions are hidden when screen focus is lost. 2 warnings are allowed before a 3rd violation permanently blocks your attempt.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
                setShowFullscreenLockModal(false);
              }}
              className="w-full py-4 bg-[#2C6A74] hover:bg-[#22555D] text-white rounded-2xl text-xs font-extrabold border border-[#5DA9B0]/30 shadow-warm-sm transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>← Go Back & Re-Enter Fullscreen</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
