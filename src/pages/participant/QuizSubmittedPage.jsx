import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Home } from 'lucide-react';

export default function QuizSubmittedPage() {
  const navigate = useNavigate();

  const handleFinish = () => {
    localStorage.removeItem('participant_phone');
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12 bg-[#EDEEE9]">
      <div className="max-w-md w-full bg-[#F5EBE1] rounded-[36px] shadow-warm-lg p-8 border border-[#E3D5CA] text-center space-y-6">
        
        {/* Animated Check Icon */}
        <div className="w-20 h-20 bg-[#D7BDB0] rounded-full flex items-center justify-center mx-auto shadow-warm-md border border-[#E3D5CA]">
          <CheckCircle2 className="w-10 h-10 text-[#171717]" />
        </div>

        {/* Text Messages explicitly matching Part 17 specifications */}
        <div className="space-y-3">
          <span className="inline-block px-3 py-1 bg-[#E3D5CA] text-[#171717] text-xs font-bold rounded-full border border-[#D6CCC2]">
            Status: Confirmed
          </span>
          <h2 className="text-3xl font-black text-[#171717] uppercase tracking-tight">
            Quiz Submitted
          </h2>
          <p className="text-base text-[#171717] font-semibold">
            Your responses have been recorded successfully.
          </p>
          <div className="p-4 rounded-2xl bg-[#EDEEE9] border border-[#D6CCC2] text-xs text-[#68635F] leading-relaxed">
            Results will be announced by the event organizers.
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] font-bold text-sm rounded-2xl shadow-warm-sm transition-all border border-[#E3D5CA] flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Finish</span>
          </button>
        </div>

        <div className="pt-2 border-t border-[#E3D5CA] flex items-center justify-center space-x-2 text-[11px] text-[#68635F]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#171717]" />
          <span>Evaluation conducted securely server-side.</span>
        </div>

      </div>
    </div>
  );
}
