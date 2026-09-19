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
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-8 bg-[#EDEEE9]">
      <div className="max-w-md w-full bg-[#F5EBE1] rounded-[32px] shadow-warm-md overflow-hidden border border-[#E3D5CA]">
        
        {/* Header */}
        <div className="bg-[#D7BDB0] p-6 text-[#171717] text-center border-b border-[#E3D5CA]">
          <div className="w-12 h-12 bg-[#F5EBE1] rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-warm-sm border border-[#E3D5CA]">
            <Lock className="w-6 h-6 text-[#171717]" />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight">Admin Portal</h2>
          <p className="text-xs text-[#68635F] mt-0.5">Authorized Organizers Only</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-[#EDEEE9] p-3 rounded-2xl border border-[#D6CCC2]">
            <label className="block text-[10px] font-bold uppercase text-[#68635F] mb-1">
              USERNAME
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-[#68635F] mr-2" />
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Admin username"
                required
                className="w-full bg-transparent text-sm font-semibold text-[#171717] focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-[#EDEEE9] p-3 rounded-2xl border border-[#D6CCC2]">
            <label className="block text-[10px] font-bold uppercase text-[#68635F] mb-1">
              PASSWORD
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-[#68635F] mr-2" />
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-sm font-semibold text-[#171717] focus:outline-none"
              />
            </div>
          </div>

          {/* Test Credentials */}
          <div className="p-3 rounded-2xl bg-[#EDEEE9] border border-[#D6CCC2] text-xs text-[#68635F]">
            <p className="font-bold text-[#171717]">Default Credentials:</p>
            <p className="mt-0.5 font-mono">Username: <strong className="text-[#171717]">admin</strong> | Password: <strong className="text-[#171717]">admin123</strong></p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#D7BDB0] hover:bg-[#C5A99B] text-[#171717] font-bold rounded-2xl shadow-warm-sm transition-all border border-[#E3D5CA] disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>

          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-[#68635F] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#171717]" />
            <span>Encrypted Session & Password Protection</span>
          </div>

        </form>
      </div>
    </div>
  );
}
