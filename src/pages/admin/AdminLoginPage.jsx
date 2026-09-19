import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) navigate('/admin/dashboard');
  }, [navigate]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Admin login fetch error:', err);
      setError('Connection error. Server is unreachable.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-8 bg-[#EBF7F7]">
      <div className="max-w-md w-full bg-[#D0EFEF]/70 rounded-[32px] shadow-warm-md overflow-hidden border border-[#AEE3E0]">
        
        {/* Header - Tidal Depths (#2C6A74) */}
        <div className="bg-[#2C6A74] p-6 text-white text-center border-b border-[#5DA9B0]/30">
          <div className="w-12 h-12 bg-[#AEE3E0] rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-warm-sm border border-white/20">
            <Lock className="w-6 h-6 text-[#2C6A74]" />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">Admin Portal</h2>
          <p className="text-xs text-[#D0EFEF] mt-0.5">Authorized Organizers Only</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-[#EBF7F7] p-3 rounded-2xl border border-[#5DA9B0]/40 focus-within:ring-2 focus-within:ring-[#5DA9B0] transition-all">
            <label className="block text-[10px] font-bold uppercase text-[#3D6E75] mb-1">
              USERNAME
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-[#5DA9B0] mr-2" />
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Admin username"
                required
                className="w-full bg-transparent text-sm font-semibold text-[#0F2F34] focus:outline-none placeholder:text-[#3D6E75]/50"
              />
            </div>
          </div>

          <div className="bg-[#EBF7F7] p-3 rounded-2xl border border-[#5DA9B0]/40 focus-within:ring-2 focus-within:ring-[#5DA9B0] transition-all">
            <label className="block text-[10px] font-bold uppercase text-[#3D6E75] mb-1">
              PASSWORD
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-[#5DA9B0] mr-2" />
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-sm font-semibold text-[#0F2F34] focus:outline-none placeholder:text-[#3D6E75]/50"
              />
            </div>
          </div>

          {/* Test Credentials */}
          <div className="p-3 rounded-2xl bg-[#EBF7F7] border border-[#AEE3E0] text-xs text-[#3D6E75]">
            <p className="font-bold text-[#0F2F34]">Default Credentials:</p>
            <p className="mt-0.5 font-mono">Username: <strong className="text-[#0F2F34]">admin</strong> | Password: <strong className="text-[#0F2F34]">admin123</strong></p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#2C6A74] hover:bg-[#22555D] text-white font-bold rounded-2xl shadow-warm-sm transition-all border border-[#5DA9B0]/30 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>

          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-[#3D6E75] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2C6A74]" />
            <span>Encrypted Session & Password Protection</span>
          </div>

        </form>
      </div>
    </div>
  );
}
