import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, GraduationCap, CheckCircle2, Play, AlertCircle } from 'lucide-react';

export default function QuizStartPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedPhone = localStorage.getItem('participant_phone');
    if (!savedPhone) {
      navigate('/register');
      return;
    }

    fetch(`/api/participant/session/${savedPhone}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'COMPLETED' && data.access_status !== 'ALLOWED_RETAKE') {
          navigate('/quiz/submitted');
        } else {
          setSession(data);
        }
      })
      .catch(() => navigate('/register'));
  }, [navigate]);

  const handleStartQuiz = async () => {
    if (!session || !session.phone) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: session.phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start quiz.');
        setLoading(false);
        return;
      }

      navigate('/quiz');
    } catch (err) {
      console.error('Start quiz error:', err);
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-[calc(100vh-9rem)] py-12 px-4 sm:px-6 lg:px-8 bg-[#EDEEE9] flex items-center justify-center">
      <div className="max-w-2xl w-full bg-[#F5EBE1] rounded-[32px] shadow-warm-md border border-[#E3D5CA] overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-[#D7BDB0] p-8 text-[#171717] text-center border-b border-[#E3D5CA]">
          <span className="inline-block px-3.5 py-1 bg-[#F5EBE1] text-[#171717] text-xs font-semibold rounded-full mb-2">
            Welcome Participant
          </span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Quiz Instructions</h2>
          <p className="text-xs text-[#68635F] mt-1">Please read all instructions before starting the quiz.</p>
        </div>

        <div className="p-8 space-y-6">
          
          {/* Candidate Info Summary */}
          <div className="bg-[#EDEEE9] border border-[#D6CCC2] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#E3D5CA] flex items-center justify-center text-[#171717]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#68635F]">Candidate Name</p>
                <p className="text-sm font-bold text-[#171717]">{session.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#E3D5CA] flex items-center justify-center text-[#171717]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#68635F]">College</p>
                <p className="text-sm font-bold text-[#171717]">{session.college}</p>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] border-b border-[#E3D5CA] pb-2">
              Rules & Format
            </h3>
            
            <ul className="space-y-2.5 text-xs text-[#171717]">
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#68635F] shrink-0 mt-0.5" />
                <span>Read every question carefully. Select <strong>one answer</strong> per question.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#68635F] shrink-0 mt-0.5" />
                <span>Selected responses are saved automatically in real-time.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#68635F] shrink-0 mt-0.5" />
                <span>Use the <strong>Right-side Question Navigator</strong> to jump directly to any question.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#68635F] shrink-0 mt-0.5" />
                <span><strong>Every question must be answered</strong> before final submission is allowed.</span>
              </li>
              <li className="flex items-start space-x-2.5 text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span><strong>Tab Switching Prohibition:</strong> Switching tabs or opening other windows is strictly monitored. Switching tabs will <strong>immediately lock your quiz</strong>, requiring administrator unblocking.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#68635F] shrink-0 mt-0.5" />
                <span>Do not refresh or navigate away from the browser tab during the attempt.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#68635F] shrink-0 mt-0.5" />
                <span>Scores and answer keys will <strong>not be displayed</strong> upon completion. Results are announced by organizers.</span>
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleStartQuiz}
              disabled={loading}
              className="w-full py-4 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] text-base font-extrabold rounded-2xl shadow-warm-sm transition-all flex items-center justify-center space-x-2 border border-[#E3D5CA] disabled:opacity-50"
            >
              {loading ? (
                <span>Initializing Quiz...</span>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>START QUIZ</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
