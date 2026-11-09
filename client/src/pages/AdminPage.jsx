import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  UserPlus,
  PlusCircle,
  Users,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  registerUser,
  createAccount,
  fetchAdminUsers,
  fetchAccounts,
  formatPaiseToRupees,
  parseRupeesToPaise,
} from '../services/api';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';

export default function AdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('create-account'); // 'create-account' | 'create-user' | 'users'
  const [usersList, setUsersList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states: Create User
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('holder');
  const [creatingUser, setCreatingUser] = useState(false);

  // Form states: Create Account
  const [accountName, setAccountName] = useState('');
  const [accountOwnerId, setAccountOwnerId] = useState('');
  const [initialBalanceRupees, setInitialBalanceRupees] = useState('0');
  const [creatingAccount, setCreatingAccount] = useState(false);

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, aRes] = await Promise.all([
        fetchAdminUsers(),
        fetchAccounts(),
      ]);

      if (uRes.ok && uRes.data?.users) {
        setUsersList(uRes.data.users);
        if (uRes.data.users.length > 0 && !accountOwnerId) {
          setAccountOwnerId(String(uRes.data.users[0].id));
        }
      }
      if (aRes.ok && aRes.data?.accounts) {
        setAccountsList(aRes.data.accounts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.includes('@') || newUserPassword.length < 8) {
      showToast({
        title: 'Validation failed',
        message: 'Valid email and password (minimum 8 characters) required.',
        type: 'error',
      });
      return;
    }

    setCreatingUser(true);
    try {
      const res = await registerUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        name: newUserName.trim() || 'Ledger User',
        role: newUserRole,
      });

      if (res.ok) {
        showToast({
          title: 'User provisioned',
          message: `Created ${newUserRole} account for ${newUserEmail}.`,
          type: 'success',
        });
        setNewUserEmail('');
        setNewUserName('');
        setNewUserPassword('');
        setNewUserRole('holder');
        loadData();
      } else {
        showToast({
          title: 'Creation rejected',
          message: res.error || 'Failed to create user.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle Create Account (POST /accounts - Admin only)
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast({
        title: 'Unauthorized',
        message: 'Only administrators may invoke POST /accounts.',
        type: 'error',
      });
      return;
    }

    if (!accountName.trim()) {
      showToast({ title: 'Validation failed', message: 'Account name is required.', type: 'error' });
      return;
    }

    const paise = parseRupeesToPaise(initialBalanceRupees || '0');
    if (paise === null || paise < 0) {
      showToast({
        title: 'Invalid balance',
        message: 'Initial balance must be a non-negative number.',
        type: 'error',
      });
      return;
    }

    setCreatingAccount(true);
    try {
      const res = await createAccount({
        name: accountName.trim(),
        ownerId: Number(accountOwnerId) || user.id,
        initialBalancePaise: paise,
      });

      if (res.ok) {
        showToast({
          title: 'Account Provisioned',
          message: `Account "${accountName}" created successfully with initial balance ${formatPaiseToRupees(paise)}.`,
          type: 'success',
        });
        setAccountName('');
        setInitialBalanceRupees('0');
        loadData();
      } else {
        showToast({
          title: 'Creation Failed',
          message: res.error || 'Backend rejected account creation.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setCreatingAccount(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <GlowCard className="p-8 text-center space-y-4 border-[rgba(255,93,122,0.3)]">
          <ShieldAlert className="h-10 w-10 text-[#ff5d7a] mx-auto" />
          <h2 className="text-xl font-bold font-mono text-[#ff5d7a]">Admin Clearance Required</h2>
          <p className="text-xs text-[#7ea594]">
            This administrative control panel is restricted to the <code className="text-[#2dff9a]">admin</code> role.
          </p>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-[rgba(60,255,160,0.12)] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Badge variant="amber" size="sm" className="mb-2">
            ROOT L3 CONSOLE
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#eafff5]">
            Administration & Provisioning
          </h1>
          <p className="text-xs sm:text-sm text-[#7ea594] mt-1">
            Provision financial ledger accounts and manage user clearance roles.
          </p>
        </div>

        <Badge variant="emerald" size="md" dot>
          POST /accounts AUTHORIZED
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#07110d] border border-[rgba(60,255,160,0.14)] w-fit">
        <button
          onClick={() => setActiveTab('create-account')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeTab === 'create-account'
              ? 'bg-[#2dff9a] text-[#020605] shadow-[0_0_15px_rgba(45,255,154,0.35)]'
              : 'text-[#7ea594] hover:text-[#eafff5]'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create Account (POST /accounts)</span>
        </button>

        <button
          onClick={() => setActiveTab('create-user')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeTab === 'create-user'
              ? 'bg-[#2dff9a] text-[#020605] shadow-[0_0_15px_rgba(45,255,154,0.35)]'
              : 'text-[#7ea594] hover:text-[#eafff5]'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Create User</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#2dff9a] text-[#020605] shadow-[0_0_15px_rgba(45,255,154,0.35)]'
              : 'text-[#7ea594] hover:text-[#eafff5]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Users Directory ({usersList.length})</span>
        </button>
      </div>

      {/* Tab: Create Account */}
      {activeTab === 'create-account' && (
        <GlowCard className="p-6 sm:p-8 max-w-2xl space-y-6">
          <div className="space-y-1 border-b border-[rgba(60,255,160,0.1)] pb-4">
            <h3 className="text-lg font-bold font-mono text-[#eafff5] flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[#2dff9a]" />
              <span>Provision New Ledger Account</span>
            </h3>
            <p className="text-xs text-[#7ea594]">
              Enforced by backend route <code className="text-[#2dff9a]">POST /api/accounts</code> (Admin role required).
            </p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#eafff5]">
                Account Name
              </label>
              <input
                type="text"
                placeholder="e.g. Corporate Treasury Reserve"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                className="w-full rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] px-4 py-3 text-xs sm:text-sm font-mono text-[#eafff5] focus:border-[#2dff9a] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#eafff5]">
                Account Owner (User ID)
              </label>
              <select
                value={accountOwnerId}
                onChange={(e) => setAccountOwnerId(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] px-4 py-3 text-xs sm:text-sm font-mono text-[#eafff5] focus:border-[#2dff9a] focus:outline-none"
              >
                {usersList.map((u) => (
                  <option key={u.id} value={u.id} className="bg-[#07110d] text-[#eafff5]">
                    #{u.id} — {u.name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#eafff5] flex items-center justify-between">
                <span>Initial Balance (₹ Rupees)</span>
                <span className="text-[10px] text-[#7ea594]">
                  Zero-sum funded via external pool
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base text-[#7ea594]">
                  ₹
                </span>
                <input
                  type="text"
                  placeholder="0.00"
                  value={initialBalanceRupees}
                  onChange={(e) => setInitialBalanceRupees(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] pl-9 pr-4 py-3 text-sm font-mono text-[#eafff5] focus:border-[#2dff9a] focus:outline-none"
                />
              </div>
            </div>

            {/* Admin-only Button Confirmation */}
            {isAdmin && (
              <GlowButton
                variant="primary"
                size="lg"
                type="submit"
                disabled={creatingAccount}
                className="w-full"
              >
                <span>
                  {creatingAccount
                    ? 'Writing Opening Journal Entry...'
                    : 'Create Account (POST /accounts)'}
                </span>
              </GlowButton>
            )}
          </form>
        </GlowCard>
      )}

      {/* Tab: Create User */}
      {activeTab === 'create-user' && (
        <GlowCard className="p-6 sm:p-8 max-w-2xl space-y-6">
          <div className="space-y-1 border-b border-[rgba(60,255,160,0.1)] pb-4">
            <h3 className="text-lg font-bold font-mono text-[#eafff5] flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#2dff9a]" />
              <span>Register System User</span>
            </h3>
            <p className="text-xs text-[#7ea594]">
              Admin authorization allows setting clearance roles: <code className="text-[#2dff9a]">admin</code>, <code className="text-[#2dff9a]">auditor</code>, or <code className="text-[#2dff9a]">holder</code>.
            </p>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#eafff5]">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alice Vance"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] px-4 py-3 text-xs sm:text-sm font-mono text-[#eafff5] focus:border-[#2dff9a] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#eafff5]">
                Email Address
              </label>
              <input
                type="email"
                placeholder="alice@ledgerline.local"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] px-4 py-3 text-xs sm:text-sm font-mono text-[#eafff5] focus:border-[#2dff9a] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#eafff5]">
                Password (min 8 characters)
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] px-4 py-3 text-xs sm:text-sm font-mono text-[#eafff5] focus:border-[#2dff9a] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-[#eafff5]">
                Access Role Clearance
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] px-4 py-3 text-xs sm:text-sm font-mono text-[#eafff5] focus:border-[#2dff9a] focus:outline-none"
              >
                <option value="holder" className="bg-[#07110d] text-[#eafff5]">Holder (Standard accounts, transfers, withdrawals)</option>
                <option value="auditor" className="bg-[#07110d] text-[#eafff5]">Auditor (Read-only verification & replay audit)</option>
                <option value="admin" className="bg-[#07110d] text-[#eafff5]">Admin (Root clearance, account creation, deposits)</option>
              </select>
            </div>

            <GlowButton
              variant="primary"
              size="lg"
              type="submit"
              disabled={creatingUser}
              className="w-full"
            >
              <span>{creatingUser ? 'Provisioning User...' : 'Register User'}</span>
            </GlowButton>
          </form>
        </GlowCard>
      )}

      {/* Tab: Users Directory */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-mono text-[#eafff5]">
              Registered System Users
            </h3>
            <span className="text-xs font-mono text-[#7ea594]">
              {usersList.length} Accounts Active
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[rgba(60,255,160,0.14)] bg-[#07110d]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[rgba(60,255,160,0.12)] bg-[#030a07] text-[#7ea594]">
                  <tr>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role Clearance</th>
                    <th className="py-3 px-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(60,255,160,0.08)]">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-[#030a07]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#eafff5]">#{u.id}</td>
                      <td className="py-3 px-4 text-[#eafff5]">{u.name || 'Account User'}</td>
                      <td className="py-3 px-4 text-[#7ea594]">{u.email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={u.role === 'admin' ? 'amber' : u.role === 'auditor' ? 'cyan' : 'emerald'}
                          size="sm"
                        >
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[#7ea594]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
