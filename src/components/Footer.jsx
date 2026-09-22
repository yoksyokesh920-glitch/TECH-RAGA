import React from 'react';
import { useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  if (location.pathname === '/quiz') return null;

  return (
    <footer className="bg-[#AEE3E0]/30 text-[#0F2F34] py-8 border-t border-[#5DA9B0]/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs space-y-1.5">
        <p className="font-semibold text-[#0F2F34]">
          WEB FORGE – PRELIMINARY TEST 2026 &copy; All Rights Reserved.
        </p>
        <p className="text-[#3D6E75]">
          Designed with a serene, modern, ocean-inspired examination workspace.
        </p>
      </div>
    </footer>
  );
}
