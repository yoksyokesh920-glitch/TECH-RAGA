import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle2, Clock, HelpCircle, ShieldAlert } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-9rem)] py-12 px-4 sm:px-6 lg:px-8 bg-[#EDEEE9] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto w-full space-y-16">
        
        {/* HERO SECTION — 12 Column Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT: 7 Columns Editorial Heading & CTA */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E3D5CA] text-[#171717] text-xs font-semibold tracking-wide border border-[#D6CCC2]">
              <Sparkles className="w-3.5 h-3.5 text-[#68635F]" />
              <span>Annual Inter-College Championship 2026</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-[1.08] uppercase">
              INTER-COLLEGE<br />
              <span className="text-[#68635F] font-light">QUIZ</span><br />
              COMPETITION
            </h1>

            <p className="text-base sm:text-lg text-[#68635F] font-normal leading-relaxed max-w-xl">
              A refined academic platform testing speed, accuracy, and technical knowledge. Compete with top institutions in a calm, streamlined environment.
            </p>

            <div className="pt-2">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] text-base font-bold rounded-2xl shadow-warm-md transition-all duration-300 flex items-center space-x-3 group border border-[#E3D5CA]"
              >
                <span>Participate Now</span>
                <ArrowRight className="w-5 h-5 text-[#171717] group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* RIGHT: 5 Columns Layered Card Visual (Inspired by Reference Image) */}
          <div className="lg:col-span-5 relative flex justify-center py-6">
            <div className="relative w-full max-w-md aspect-4/5">
              
              {/* Layer 1 - Deep Blush Base Card */}
              <div className="absolute inset-0 bg-[#D7BDB0] rounded-[36px] shadow-warm-lg transform rotate-[-6deg] transition-transform hover:rotate-[-4deg] border border-[#E3D5CA]/40" />

              {/* Layer 2 - Warm Beige Card */}
              <div className="absolute inset-2 bg-[#E3D5CA] rounded-[34px] shadow-warm-md transform rotate-[4deg] transition-transform hover:rotate-[2deg] border border-[#D6CCC2]" />

              {/* Layer 3 - Soft Cream Card */}
              <div className="absolute inset-5 bg-[#F5EBE1] rounded-[32px] shadow-warm-sm transform rotate-[-2deg] flex flex-col justify-between p-7 border border-white/60">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#68635F]">Event Brief</span>
                  <h3 className="text-xl font-bold text-[#171717]">Academic Challenge</h3>
                </div>

                <div className="space-y-3 bg-[#EDEEE9] p-4 rounded-2xl border border-[#D6CCC2]/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#68635F]">Questions</span>
                    <span className="font-bold text-[#171717]">30 Multiple Choice</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#68635F]">Duration</span>
                    <span className="font-bold text-[#171717]">30 Minutes</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#68635F]">Evaluation</span>
                    <span className="font-bold text-[#171717]">Server-Side Verified</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#D7BDB0] border-2 border-white flex items-center justify-center text-[10px] font-bold">IIT</div>
                    <div className="w-8 h-8 rounded-full bg-[#E3D5CA] border-2 border-white flex items-center justify-center text-[10px] font-bold">STX</div>
                    <div className="w-8 h-8 rounded-full bg-[#D6CCC2] border-2 border-white flex items-center justify-center text-[10px] font-bold">SRCC</div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#68635F]">Inter-College Event</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* BELOW HERO: 4-Card Asymmetrical Event Information Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
          
          <div className="bg-[#F5EBE1] p-6 rounded-[28px] border border-[#E3D5CA] shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-[#171717]">30</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#68635F]">Questions</p>
          </div>

          <div className="bg-[#E3D5CA] p-6 rounded-[28px] border border-[#D6CCC2] shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-[#171717]">30 MIN</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#68635F]">Duration</p>
          </div>

          <div className="bg-[#D7BDB0] p-6 rounded-[28px] border border-[#E3D5CA] shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-[#171717]">1</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#68635F]">Attempt</p>
          </div>

          <div className="bg-[#D6CCC2] p-6 rounded-[28px] border border-[#E3D5CA] shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-[#171717]">100%</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#68635F]">Focus</p>
          </div>

        </div>

      </div>
    </div>
  );
}
