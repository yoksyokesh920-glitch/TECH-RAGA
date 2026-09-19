import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, ShieldAlert, X, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    college: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAlreadyRegisteredModal, setShowAlreadyRegisteredModal] = useState(false);

  useEffect(() => {
    // If active session exists in localStorage, check status
    const savedPhone = localStorage.getItem('participant_phone');
    if (savedPhone) {
      fetch(`/api/participant/session/${savedPhone}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'COMPLETED' && data.access_status !== 'ALLOWED_RETAKE') {
            navigate('/quiz/submitted');
          } else if (data.status === 'IN_PROGRESS') {
            navigate('/quiz');
          } else if (data.status === 'REGISTERED') {
            navigate('/quiz/start');
          }
        })
        .catch(() => localStorage.removeItem('participant_phone'));
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const cleanAndValidatePhone = (rawPhone) => {
    if (!rawPhone || typeof rawPhone !== 'string') return null;
    let digits = rawPhone.replace(/[\s\-\+]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (/^[0-9]{10}$/.test(digits)) {
      return digits;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Full Name is required.');
      return;
    }
    const cleanPhone = cleanAndValidatePhone(formData.phone);
    if (!cleanPhone) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!formData.college.trim()) {
      setError('College Name is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/participant/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyCompleted) {
          setShowAlreadyRegisteredModal(true);
        } else {
          setError(data.error || 'Registration failed.');
        }
        setLoading(false);
        return;
      }

      // Store phone number as primary unique participant identifier
      localStorage.setItem('participant_phone', cleanPhone);

      if (data.status === 'IN_PROGRESS') {
        navigate('/quiz');
      } else {
        navigate('/quiz/start');
      }
    } catch (err) {
      console.error('Registration fetch error:', err);
      setError('Connection error. Server unreachable.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-9rem)] py-12 px-4 sm:px-6 lg:px-8 bg-[#EDEEE9] flex flex-col justify-center">
      <div className="max-w-5xl mx-auto w-full">
        
        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          
          {/* LEFT: 5 Columns Editorial Title & Info */}
          <div className="md:col-span-5 space-y-6">
            <span className="inline-block px-3 py-1 bg-[#D7BDB0] text-[#171717] text-xs font-semibold rounded-full border border-[#E3D5CA]">
              Registration
            </span>

            <h2 className="text-4xl sm:text-5xl font-black text-[#171717] tracking-tight uppercase leading-tight">
              BEFORE YOU<br />
              <span className="text-[#68635F] font-light">BEGIN</span>
            </h2>

            <p className="text-sm text-[#68635F] leading-relaxed">
              Please enter your full details accurately. Your phone number serves as your unique verification key for this examination.
            </p>

            <div className="p-4 rounded-2xl bg-[#E3D5CA]/50 border border-[#D6CCC2] text-xs text-[#171717] space-y-2">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#68635F]" />
                <span>Single attempt per participant policy</span>
              </div>
              <p className="text-[#68635F]">Ensure browser tab remains open during the 30-minute quiz window.</p>
            </div>
          </div>

          {/* RIGHT: 7 Columns Warm Cream Registration Card */}
          <div className="md:col-span-7">
            <div className="bg-[#F5EBE1] rounded-[32px] p-8 shadow-warm-md border border-[#E3D5CA] space-y-6">
              
              <div className="border-b border-[#E3D5CA] pb-4">
                <h3 className="text-xl font-bold text-[#171717]">Participant Information</h3>
                <p className="text-xs text-[#68635F] mt-0.5">All mandatory fields must be completed.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Field: Full Name */}
                <div className="bg-[#EDEEE9] p-3.5 rounded-2xl border border-[#D6CCC2] focus-within:ring-2 focus-within:ring-[#D7BDB0] transition-all">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#68635F] mb-1">
                    FULL NAME *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full bg-transparent text-sm font-semibold text-[#171717] focus:outline-none placeholder-gray-400"
                  />
                </div>

                {/* Field: Phone Number */}
                <div className="bg-[#EDEEE9] p-3.5 rounded-2xl border border-[#D6CCC2] focus-within:ring-2 focus-within:ring-[#D7BDB0] transition-all">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#68635F] mb-1">
                    PHONE NUMBER *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    required
                    className="w-full bg-transparent text-sm font-semibold text-[#171717] focus:outline-none placeholder-gray-400"
                  />
                  <p className="text-[10px] text-[#68635F] mt-1">Must be an exact 10-digit mobile number.</p>
                </div>

                {/* Field: College Name */}
                <div className="bg-[#EDEEE9] p-3.5 rounded-2xl border border-[#D6CCC2] focus-within:ring-2 focus-within:ring-[#D7BDB0] transition-all">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#68635F] mb-1">
                    COLLEGE NAME *
                  </label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    placeholder="Enter your college or university"
                    required
                    className="w-full bg-transparent text-sm font-semibold text-[#171717] focus:outline-none placeholder-gray-400"
                  />
                </div>

                {/* Field: Email Address (Optional) */}
                <div className="bg-[#EDEEE9] p-3.5 rounded-2xl border border-[#D6CCC2] focus-within:ring-2 focus-within:ring-[#D7BDB0] transition-all">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#68635F] mb-1">
                    EMAIL ADDRESS <span className="font-normal text-[9px] text-gray-400">(OPTIONAL)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="student@college.edu"
                    className="w-full bg-transparent text-sm font-semibold text-[#171717] focus:outline-none placeholder-gray-400"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] font-bold rounded-2xl shadow-warm-sm transition-all flex items-center justify-center space-x-2 border border-[#E3D5CA] disabled:opacity-50"
                >
                  {loading ? (
                    <span>Processing Registration...</span>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-[#171717]" />
                    </>
                  )}
                </button>

              </form>

            </div>
          </div>

        </div>

      </div>

      {/* ALREADY REGISTERED MODAL */}
      {showAlreadyRegisteredModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5EBE1] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#E3D5CA] text-center space-y-5 animate-fadeIn">
            
            <div className="w-16 h-16 rounded-full bg-[#D7BDB0] text-[#171717] flex items-center justify-center mx-auto shadow-warm-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#171717] uppercase">Already Registered</h3>
              <p className="text-sm font-semibold text-[#171717]">
                This phone number has already been used for this quiz.
              </p>
              <p className="text-xs text-[#68635F] pt-1">
                Please contact the event organizers if you need another attempt.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAlreadyRegisteredModal(false)}
                className="w-full py-3.5 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] text-sm font-bold rounded-2xl shadow-warm-sm transition-all border border-[#E3D5CA]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
