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
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12 bg-[#F0F8F8]">
      <div className="max-w-md w-full bg-white rounded-[36px] shadow-ocean-lg p-8 border border-[#AEE3E0] text-center space-y-6">
        
        {/* Animated Check Icon */}
        <div className="w-20 h-20 bg-[#2C6A74] text-white rounded-full flex items-center justify-center mx-auto shadow-ocean-md border border-[#23555E]">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        {/* Text Messages explicitly matching Part 17 specifications */}
        <div className="space-y-3">
          <span className="inline-block px-3 py-1 bg-[#D0EFEF] text-[#2C6A74] text-xs font-bold rounded-full border border-[#AEE3E0]">
            Status: Confirmed
          </span>
          <h2 className="text-3xl font-black text-[#0F3238] uppercase tracking-tight">
            Quiz Submitted
          </h2>
          <p className="text-base text-[#0F3238] font-semibold">
            Your responses have been recorded successfully.
          </p>
          <div className="p-4 rounded-2xl bg-[#F0F8F8] border border-[#AEE3E0] text-xs text-[#2C6A74] leading-relaxed">
            Results will be announced by the event organizers.
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-[#2C6A74] hover:bg-[#23555E] text-white font-bold text-sm rounded-2xl shadow-ocean-sm transition-all border border-[#23555E] flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Home className="w-4 h-4 text-white" />
            <span>Finish</span>
          </button>
        </div>

        <div className="pt-2 border-t border-[#AEE3E0] flex items-center justify-center space-x-2 text-[11px] text-[#2C6A74]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2C6A74]" />
          <span>Evaluation conducted securely server-side.</span>
        </div>

      </div>
    </div>
  );
}
