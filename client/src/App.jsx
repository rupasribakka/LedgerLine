import React, { useState, useEffect, useCallback } from 'react';
import CyberBackground from './components/CyberBackground';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import { checkBackendHealth } from './services/api';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState('Account Holder');
  const [backendHealth, setBackendHealth] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  const fetchHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const result = await checkBackendHealth();
    setBackendHealth(result);
    setIsCheckingHealth(false);
  }, []);

  useEffect(() => {
    fetchHealth();
    // Poll health status every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="relative flex min-h-screen bg-[#030712] text-slate-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Full-viewport Animated Cybersecurity Background & Cursor Halo */}
      <CyberBackground />

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          backendHealth={{ ...backendHealth, checking: isCheckingHealth }}
          currentRole={currentRole}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <DashboardPage
              backendHealth={backendHealth}
              isCheckingHealth={isCheckingHealth}
              onRefreshHealth={fetchHealth}
              currentRole={currentRole}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
