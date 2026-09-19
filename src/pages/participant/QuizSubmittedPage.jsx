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
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12 bg-[#EBF7F7]">
      <div className="max-w-md w-full bg-[#D0EFEF]/70 rounded-[36px] shadow-warm-lg p-8 border border-[#AEE3E0] text-center space-y-6">
        
        {/* Animated Check Icon */}
        <div className="w-20 h-20 bg-[#2C6A74] text-white rounded-full flex items-center justify-center mx-auto shadow-warm-md border border-[#5DA9B0]">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        {/* Text Messages explicitly matching Part 17 specifications */}
        <div className="space-y-3">
          <span className="inline-block px-3.5 py-1 bg-[#AEE3E0] text-[#0F2F34] text-xs font-bold rounded-full border border-[#5DA9B0]/40">
            Status: Confirmed
          </span>
          <h2 className="text-3xl font-black text-[#0F2F34] uppercase tracking-tight">
            Quiz Submitted
          </h2>
          <p className="text-base text-[#0F2F34] font-semibold">
            Your responses have been recorded successfully.
          </p>
          <div className="p-4 rounded-2xl bg-[#EBF7F7] border border-[#AEE3E0] text-xs text-[#3D6E75] leading-relaxed">
            Results will be announced by the event organizers.
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-[#2C6A74] hover:bg-[#22555D] text-white font-bold text-sm rounded-2xl shadow-warm-sm transition-all border border-[#5DA9B0]/30 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Home className="w-4 h-4 text-white" />
            <span>Finish</span>
          </button>
        </div>

        <div className="pt-2 border-t border-[#AEE3E0] flex items-center justify-center space-x-2 text-[11px] text-[#3D6E75]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2C6A74]" />
          <span>Evaluation conducted securely server-side.</span>
        </div>

      </div>
    </div>
  );
}
