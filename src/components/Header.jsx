import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Award, LogOut, LayoutDashboard, Users, GraduationCap, HelpCircle, ArrowLeft } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.startsWith('/admin');
  const token = localStorage.getItem('adminToken');
  const showBack = location.pathname !== '/';

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin');
  };

  return (
    <header className="bg-[#2C6A74] text-white shadow-warm-md border-b border-[#5DA9B0]/30 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left: Back Arrow < and Brand Header */}
        <div className="flex items-center space-x-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-2xl bg-[#AEE3E0]/20 hover:bg-[#AEE3E0]/30 text-white border border-[#AEE3E0]/30 transition-all shadow-sm flex items-center justify-center cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          <Link to="/" className="flex items-center space-x-3.5 group">
            <div className="w-11 h-11 rounded-2xl bg-[#AEE3E0] flex items-center justify-center border border-white/20 shadow-sm group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6 text-[#2C6A74]" />
            </div>
            <div>
              <h1 className="font-bold text-lg sm:text-xl tracking-tight text-white leading-tight">
                {isAdminPath ? 'Quiz Admin Portal' : 'Inter-College Quiz Competition'}
              </h1>
              <p className="text-xs text-[#D0EFEF] font-medium">
                {isAdminPath ? 'Event Management System' : 'Academic Excellence Championship 2026'}
              </p>
            </div>
          </Link>
        </div>

        {/* ADMIN NAVIGATION (Only on /admin/* when logged in) */}
        {isAdminPath && token && (
          <nav className="hidden md:flex items-center space-x-1.5">
            <Link
              to="/admin/dashboard"
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === '/admin/dashboard'
                  ? 'bg-[#AEE3E0] text-[#0F2F34] shadow-sm'
                  : 'text-[#D0EFEF] hover:bg-[#5DA9B0]/40 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/admin/results"
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === '/admin/results' || location.pathname === '/admin/participants'
                  ? 'bg-[#AEE3E0] text-[#0F2F34] shadow-sm'
                  : 'text-[#D0EFEF] hover:bg-[#5DA9B0]/40 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Results & Candidates</span>
            </Link>

            <Link
              to="/admin/colleges"
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === '/admin/colleges'
                  ? 'bg-[#AEE3E0] text-[#0F2F34] shadow-sm'
                  : 'text-[#D0EFEF] hover:bg-[#5DA9B0]/40 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Colleges</span>
            </Link>

            <Link
              to="/admin/questions"
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                location.pathname === '/admin/questions'
                  ? 'bg-[#AEE3E0] text-[#0F2F34] shadow-sm'
                  : 'text-[#D0EFEF] hover:bg-[#5DA9B0]/40 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Questions</span>
            </Link>

            <button
              onClick={handleLogout}
              className="ml-3 flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#5DA9B0] text-white hover:bg-[#4C989F] transition-colors border border-white/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </nav>
        )}

        {/* Mobile Admin indicator */}
        {isAdminPath && token && (
          <div className="md:hidden flex items-center">
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-[#5DA9B0] text-white"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Sub-header navigation bar for mobile Admin */}
      {isAdminPath && token && (
        <div className="md:hidden bg-[#22555D] px-4 py-2 flex items-center justify-around text-xs border-t border-[#5DA9B0]/30">
          <Link
            to="/admin/dashboard"
            className={`py-1 ${location.pathname === '/admin/dashboard' ? 'font-bold text-[#AEE3E0]' : 'text-[#D0EFEF]'}`}
          >
            Dashboard
          </Link>
          <Link
            to="/admin/results"
            className={`py-1 ${location.pathname === '/admin/results' ? 'font-bold text-[#AEE3E0]' : 'text-[#D0EFEF]'}`}
          >
            Results
          </Link>
          <Link
            to="/admin/colleges"
            className={`py-1 ${location.pathname === '/admin/colleges' ? 'font-bold text-[#AEE3E0]' : 'text-[#D0EFEF]'}`}
          >
            Colleges
          </Link>
          <Link
            to="/admin/questions"
            className={`py-1 ${location.pathname === '/admin/questions' ? 'font-bold text-[#AEE3E0]' : 'text-[#D0EFEF]'}`}
          >
            Questions
          </Link>
        </div>
      )}
    </header>
  );
}
