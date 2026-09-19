import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    college: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyRegisteredMsg, setAlreadyRegisteredMsg] = useState('');
  const [showAlreadyRegisteredModal, setShowAlreadyRegisteredModal] = useState(false);

  useEffect(() => {
    // If active session exists in localStorage, check server status
    const savedPhone = localStorage.getItem('participant_phone');
    if (savedPhone) {
      fetch(`/api/participant/session/${savedPhone}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'COMPLETED' && data.access_status !== 'ALLOWED_RETAKE') {
            navigate('/quiz/submitted');
          } else if (data.status === 'IN_PROGRESS' || data.status === 'BLOCKED' || data.status === 'EXPIRED') {
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
    if (/^[6-9][0-9]{9}$/.test(digits)) {
      return digits;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAlreadyRegisteredMsg('');

    if (!formData.name.trim()) {
      setError('Full Name is required.');
      return;
    }
    const cleanPhone = cleanAndValidatePhone(formData.phone);
    if (!cleanPhone) {
      setError('Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.');
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
        if (data.alreadyRegistered || data.alreadyCompleted) {
          setAlreadyRegisteredMsg(data.error || 'This phone number is already registered. You can register again only after an administrator removes the previous registration.');
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
    <div className="min-h-[calc(100vh-9rem)] py-12 px-4 sm:px-6 lg:px-8 bg-[#EBF7F7] flex flex-col justify-center">
      <div className="max-w-5xl mx-auto w-full">
        
        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          
          {/* LEFT: Editorial Title & Info */}
          <div className="md:col-span-5 space-y-6">
            <span className="inline-block px-3.5 py-1 bg-[#AEE3E0] text-[#0F2F34] text-xs font-semibold rounded-full border border-[#5DA9B0]/40 shadow-sm">
              Registration
            </span>

            <h2 className="text-4xl sm:text-5xl font-black text-[#0F2F34] tracking-tight uppercase leading-tight">
              BEFORE YOU<br />
              <span className="text-[#5DA9B0] font-light">BEGIN</span>
            </h2>

            <p className="text-sm text-[#3D6E75] leading-relaxed">
              Please enter your full details accurately. Your phone number serves as your unique verification key for this examination.
            </p>

            <div className="p-4 rounded-2xl bg-[#D0EFEF]/80 border border-[#AEE3E0] text-xs text-[#0F2F34] space-y-2">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#2C6A74]" />
                <span>Single active registration per phone number</span>
              </div>
              <p className="text-[#3D6E75]">Ensure browser tab remains open during the quiz window.</p>
            </div>
          </div>

          {/* RIGHT: Ocean Foam Registration Card */}
          <div className="md:col-span-7">
            <div className="bg-[#D0EFEF]/60 rounded-[32px] p-8 shadow-warm-md border border-[#AEE3E0] space-y-6">
              
              <div className="border-b border-[#AEE3E0] pb-4">
                <h3 className="text-xl font-bold text-[#0F2F34]">Participant Information</h3>
                <p className="text-xs text-[#3D6E75] mt-0.5">All mandatory fields must be completed.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Field: Full Name */}
                <div className="bg-[#EBF7F7] p-3.5 rounded-2xl border border-[#5DA9B0]/40 focus-within:ring-2 focus-within:ring-[#5DA9B0] transition-all">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#3D6E75] mb-1">
                    FULL NAME *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full bg-transparent text-sm font-semibold text-[#0F2F34] focus:outline-none placeholder:text-[#3D6E75]/50"
                  />
                </div>

                {/* Field: Phone Number */}
                <div className="bg-[#EBF7F7] p-3.5 rounded-2xl border border-[#5DA9B0]/40 focus-within:ring-2 focus-within:ring-[#5DA9B0] transition-all">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#3D6E75] mb-1">
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
                    className="w-full bg-transparent text-sm font-semibold text-[#0F2F34] focus:outline-none placeholder:text-[#3D6E75]/50"
                  />
                  <p className="text-[10px] text-[#3D6E75] mt-1">Must be an exact 10-digit mobile number.</p>
                </div>

                {/* Field: College Name */}
                <div className="bg-[#EBF7F7] p-3.5 rounded-2xl border border-[#5DA9B0]/40 focus-within:ring-2 focus-within:ring-[#5DA9B0] transition-all">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#3D6E75] mb-1">
                    COLLEGE NAME *
                  </label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    placeholder="Enter your college or university"
                    required
                    className="w-full bg-transparent text-sm font-semibold text-[#0F2F34] focus:outline-none placeholder:text-[#3D6E75]/50"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#2C6A74] hover:bg-[#22555D] text-white font-bold rounded-2xl shadow-warm-sm transition-all flex items-center justify-center space-x-2 border border-[#5DA9B0]/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Processing Registration...</span>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-white" />
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
          <div className="bg-[#D0EFEF] rounded-[32px] max-w-md w-full p-8 shadow-warm-lg border border-[#AEE3E0] text-center space-y-5 animate-fadeIn">
            
            <div className="w-16 h-16 rounded-full bg-[#2C6A74] text-white flex items-center justify-center mx-auto shadow-warm-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#0F2F34] uppercase">Already Registered</h3>
              <p className="text-xs font-semibold text-[#0F2F34] leading-relaxed">
                {alreadyRegisteredMsg || 'This phone number is already registered. You can register again only after an administrator removes the previous registration.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAlreadyRegisteredModal(false)}
                className="w-full py-3.5 bg-[#2C6A74] hover:bg-[#22555D] text-white text-sm font-bold rounded-2xl shadow-warm-sm transition-all border border-[#5DA9B0]/30"
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
