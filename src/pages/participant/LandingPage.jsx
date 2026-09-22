import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle2, Clock, HelpCircle, ShieldAlert } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-9rem)] py-12 px-4 sm:px-6 lg:px-8 bg-[#EBF7F7] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto w-full space-y-16">
        
        {/* HERO SECTION — 12 Column Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT: 7 Columns Editorial Heading & CTA */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#AEE3E0] text-[#0F2F34] text-xs font-semibold tracking-wide border border-[#5DA9B0]/40 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#2C6A74]" />
              <span>WEB FORGE – PRELIMINARY TEST 2026</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F2F34] tracking-tight leading-[1.08] uppercase">
              WEB FORGE<br />
              <span className="text-[#5DA9B0] font-light">– PRELIMINARY –</span><br />
              TEST
            </h1>

            <p className="text-base sm:text-lg text-[#3D6E75] font-normal leading-relaxed max-w-xl">
              A refined academic platform testing speed, accuracy, and technical knowledge. Compete with top institutions in a calm, streamlined ocean-inspired environment.
            </p>

            <div className="pt-2">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-[#2C6A74] hover:bg-[#22555D] text-white text-base font-bold rounded-2xl shadow-warm-md transition-all duration-300 flex items-center space-x-3 group border border-[#5DA9B0]/30 cursor-pointer"
              >
                <span>Participate Now</span>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* RIGHT: 5 Columns Layered Card Visual (Ocean Reference Image Palette) */}
          <div className="lg:col-span-5 relative flex justify-center py-6">
            <div className="relative w-full max-w-md aspect-4/5">
              
              {/* Layer 1 - Tidal Depths Base Card (#2C6A74) */}
              <div className="absolute inset-0 bg-[#2C6A74] rounded-[36px] shadow-warm-lg transform rotate-[-6deg] transition-transform hover:rotate-[-4deg] border border-[#5DA9B0]/40" />

              {/* Layer 2 - Driftwood Teal Card (#5DA9B0) */}
              <div className="absolute inset-2 bg-[#5DA9B0] rounded-[34px] shadow-warm-md transform rotate-[4deg] transition-transform hover:rotate-[2deg] border border-[#AEE3E0]" />

              {/* Layer 3 - Foam Whisper Card (#D0EFEF) */}
              <div className="absolute inset-5 bg-[#D0EFEF] rounded-[32px] shadow-warm-sm transform rotate-[-2deg] flex flex-col justify-between p-7 border border-white/80">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#3D6E75]">Event Brief</span>
                  <h3 className="text-xl font-bold text-[#0F2F34]">Academic Challenge</h3>
                </div>

                <div className="space-y-3 bg-white/80 p-4 rounded-2xl border border-[#AEE3E0]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#3D6E75]">Questions</span>
                    <span className="font-bold text-[#0F2F34]">40 Multiple Choice</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#3D6E75]">Duration</span>
                    <span className="font-bold text-[#0F2F34]">15 Minutes</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#3D6E75]">Evaluation</span>
                    <span className="font-bold text-[#0F2F34]">Server-Side Verified</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#2C6A74] text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">IIT</div>
                    <div className="w-8 h-8 rounded-full bg-[#5DA9B0] text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">STX</div>
                    <div className="w-8 h-8 rounded-full bg-[#AEE3E0] text-[#0F2F34] border-2 border-white flex items-center justify-center text-[10px] font-bold">SRCC</div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#3D6E75]">WEB FORGE – PRELIMINARY TEST</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* BELOW HERO: 4-Card Asymmetrical Event Information Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
          
          <div className="bg-[#D0EFEF] p-6 rounded-[28px] border border-[#AEE3E0] shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-[#0F2F34]">40</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#3D6E75]">Questions</p>
          </div>

          <div className="bg-[#AEE3E0] p-6 rounded-[28px] border border-[#5DA9B0]/40 shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-[#0F2F34]">15 MIN</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#3D6E75]">Duration</p>
          </div>

          <div className="bg-[#5DA9B0] text-white p-6 rounded-[28px] border border-white/20 shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-white">1</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#D0EFEF]">Attempt</p>
          </div>

          <div className="bg-[#2C6A74] text-white p-6 rounded-[28px] border border-white/20 shadow-warm-sm space-y-2">
            <span className="text-3xl sm:text-4xl font-black text-white">100%</span>
            <p className="text-xs font-bold uppercase tracking-wider text-[#D0EFEF]">Focus</p>
          </div>

        </div>

      </div>
    </div>
  );
}
