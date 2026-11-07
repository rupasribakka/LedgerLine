import React, { useState, useEffect, useCallback } from 'react';
import CyberBackground from './components/CyberBackground';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import AuthModal from './components/AuthModal';
import TransferModal from './components/TransferModal';
import DepositWithdrawModal from './components/DepositWithdrawModal';
import {
  checkBackendHealth,
  getStoredUser,
  getStoredToken,
  clearStoredSession,
  fetchAccounts,
  fetchAccountStatement,
} from './services/api';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [backendHealth, setBackendHealth] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  // Data states
  const [accounts, setAccounts] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modal states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDepositWithdrawOpen, setIsDepositWithdrawOpen] = useState(false);
  const [depositWithdrawMode, setDepositWithdrawMode] = useState('deposit');

  // Health check
  const fetchHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const result = await checkBackendHealth();
    setBackendHealth(result);
    setIsCheckingHealth(false);
  }, []);

  // Fetch accounts and statement
  const loadUserData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setAccounts([]);
      setLedgerEntries([]);
      return;
    }

    setLoadingData(true);
    try {
      const accRes = await fetchAccounts();
      if (accRes.ok && Array.isArray(accRes.data?.accounts || accRes.data)) {
        const accList = accRes.data.accounts || accRes.data;
        setAccounts(accList);

        // Fetch statement for first account to populate journal
        if (accList.length > 0) {
          const stmtRes = await fetchAccountStatement(accList[0].id);
          if (stmtRes.ok) {
            setLedgerEntries(stmtRes.data?.entries || []);
          }
        }
      } else if (accRes.status === 401) {
        clearStoredSession();
        setCurrentUser(null);
        setAccounts([]);
        setLedgerEntries([]);
      }
    } catch (e) {
      console.error('Failed to load user account data:', e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser, loadUserData]);

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    loadUserData();
  }

  function handleLogout() {
    clearStoredSession();
    setCurrentUser(null);
    setAccounts([]);
    setLedgerEntries([]);
  }

  return (
    <div className="relative flex min-h-screen bg-[#030712] text-slate-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Full-viewport Animated Cybersecurity Background & Cursor Halo */}
      <CyberBackground />

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          backendHealth={{ ...backendHealth, checking: isCheckingHealth }}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <DashboardPage
              activeTab={activeTab}
              currentUser={currentUser}
              accounts={accounts}
              ledgerEntries={ledgerEntries}
              backendHealth={backendHealth}
              isCheckingHealth={isCheckingHealth}
              onRefreshHealth={fetchHealth}
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenTransfer={() => setIsTransferOpen(true)}
              onOpenDeposit={() => {
                setDepositWithdrawMode('deposit');
                setIsDepositWithdrawOpen(true);
              }}
              onOpenWithdraw={() => {
                setDepositWithdrawMode('withdraw');
                setIsDepositWithdrawOpen(true);
              }}
              onRefreshData={loadUserData}
              loadingData={loadingData}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        onTransferSuccess={loadUserData}
      />

      <DepositWithdrawModal
        isOpen={isDepositWithdrawOpen}
        onClose={() => setIsDepositWithdrawOpen(false)}
        initialMode={depositWithdrawMode}
        accounts={accounts}
        onSuccess={loadUserData}
      />
    </div>
  );
}
