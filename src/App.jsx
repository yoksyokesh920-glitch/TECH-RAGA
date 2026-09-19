import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

// Participant Pages
import LandingPage from './pages/participant/LandingPage';
import RegisterPage from './pages/participant/RegisterPage';
import QuizStartPage from './pages/participant/QuizStartPage';
import QuizPage from './pages/participant/QuizPage';
import QuizSubmittedPage from './pages/participant/QuizSubmittedPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminResultsPage from './pages/admin/AdminResultsPage';
import AdminCollegesPage from './pages/admin/AdminCollegesPage';
import AdminQuestionsPage from './pages/admin/AdminQuestionsPage';

// Protected Admin Guard
function ProtectedAdminRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EDEEE9] text-[#171717] font-sans antialiased">
      <Header />
      <main className="flex-1">
        <Routes>
          {/* PARTICIPANT ROUTES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/quiz/start" element={<QuizStartPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/quiz/submitted" element={<QuizSubmittedPage />} />

          {/* ADMIN ROUTES */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/participants"
            element={
              <ProtectedAdminRoute>
                <AdminResultsPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/results"
            element={
              <ProtectedAdminRoute>
                <AdminResultsPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/colleges"
            element={
              <ProtectedAdminRoute>
                <AdminCollegesPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedAdminRoute>
                <AdminQuestionsPage />
              </ProtectedAdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
