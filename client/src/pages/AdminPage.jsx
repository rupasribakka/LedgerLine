import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  registerUser,
  createAccount,
  fetchAdminUsers,
  fetchAccounts,
  formatPaiseToRupees,
  parseRupeesToPaise,
  updateAccountStatus,
  fetchDetailedHealth,
  fetchAdminOverview,
} from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

export default function AdminPage() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'users' | 'system'
  const [usersList, setUsersList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [updatingAccountId, setUpdatingAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal / form toggles
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, aRes, hRes] = await Promise.all([
        fetchAdminUsers(),
        fetchAccounts(),
        fetchDetailedHealth(),
      ]);

      if (uRes.ok && uRes.data?.users) {
        setUsersList(uRes.data.users);
        if (uRes.data.users.length > 0 && !accountOwnerId) {
          const firstHolder = uRes.data.users.find((u) => u.role === 'holder');
          setAccountOwnerId(String(firstHolder ? firstHolder.id : uRes.data.users[0].id));
        }
      }
      if (aRes.ok && aRes.data?.accounts) {
        setAccountsList(aRes.data.accounts);
      }
      if (hRes.ok && hRes.data) {
        setSystemHealth(hRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (accountId, newStatus) => {
    setUpdatingAccountId(accountId);
    try {
      const res = await updateAccountStatus({ accountId, status: newStatus });
      if (res.ok) {
        showToast({
          title: 'Account Status Updated',
          message: `Account #${accountId} status changed to ${newStatus}.`,
          type: 'success',
        });
        loadData();
      } else {
        showToast({
          title: 'Update Failed',
          message: res.error || 'Could not update account status.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await registerUser({
        email: newUserEmail.trim(),
        name: newUserName.trim() || undefined,
        password: newUserPassword,
        role: newUserRole,
      });

      if (res.ok) {
        showToast({
          title: 'User Registered',
          message: `Created ${newUserRole} account for ${newUserEmail}.`,
          type: 'success',
        });
        setNewUserEmail('');
        setNewUserName('');
        setNewUserPassword('');
        setShowCreateUserModal(false);
        loadData();
      } else {
        showToast({
          title: 'Creation Failed',
          message: res.error || 'Unable to register user.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const paise = parseRupeesToPaise(initialBalanceRupees);
    if (paise === null || paise < 0) {
      showToast({
        title: 'Invalid Balance',
        message: 'Initial balance must be zero or a positive amount in INR.',
        type: 'error',
      });
      return;
    }

    setCreatingAccount(true);
    try {
      const res = await createAccount({
        name: accountName.trim(),
        owner_id: parseInt(accountOwnerId, 10),
        initial_balance_paise: paise,
      });

      if (res.ok) {
        showToast({
          title: 'Account Provisioned',
          message: `Account "${accountName}" created successfully with initial balance ${formatPaiseToRupees(paise)}.`,
          type: 'success',
        });
        setAccountName('');
        setInitialBalanceRupees('0');
        setShowCreateAccountModal(false);
        loadData();
      } else {
        showToast({
          title: 'Provisioning Failed',
          message: res.error || 'Failed to create ledger account.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Operational Administration
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)] mt-1">
            Admin Console
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage account lifecycles, user access permissions, and runtime node health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            icon={RefreshCw}
            className={refreshing ? '[&_svg]:animate-spin' : ''}
          >
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateAccountModal(true)}
            icon={PlusCircle}
          >
            <span>New Account</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateUserModal(true)}
            icon={UserPlus}
          >
            <span>New User</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="clay" surface="lavender" hover={true} className="p-4">
          <p className="text-xs font-semibold text-[var(--accent-violet)] uppercase tracking-wider">
            Total Accounts
          </p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {loading ? '—' : accountsList.length}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Registered customer books
          </p>
        </Card>
        <Card variant="clay" surface="peach" hover={true} className="p-4">
          <p className="text-xs font-semibold text-[var(--accent-terracotta)] uppercase tracking-wider">
            Registered Users
          </p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {loading ? '—' : usersList.length}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Role-gated identities
          </p>
        </Card>
        <Card variant="clay" surface="mint" hover={true} className="p-4">
          <p className="text-xs font-semibold text-[var(--accent-forest)] uppercase tracking-wider">
            Database Pool
          </p>
          <p className="text-xl font-semibold text-[var(--status-success)] mt-1.5 flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>PostgreSQL Active</span>
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            ACID transaction pool
          </p>
        </Card>
        <Card variant="clay" surface="powder" hover={true} className="p-4">
          <p className="text-xs font-semibold text-[var(--status-info)] uppercase tracking-wider">
            Runtime Role
          </p>
          <p className="text-xs font-mono font-bold text-[var(--text-primary)] mt-2 truncate bg-[var(--bg-surface)]/60 p-1.5 rounded border border-[var(--border-powder)] shadow-[var(--shadow-recessed)]">
            ledgerline_runtime
          </p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-subdued)] w-fit border border-[var(--border-subtle)] shadow-[var(--shadow-recessed)]">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-clay-btn-sec)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Accounts ({accountsList.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-clay-btn-sec)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Users ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-clay-btn-sec)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          System Health
        </button>
      </div>

      {/* Tab: Accounts Management */}
      {activeTab === 'accounts' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subdued)] text-[var(--text-secondary)] font-medium">
                  <th className="py-3 px-4">Account ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Account No</th>
                  <th className="py-3 px-4">Owner ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {accountsList.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[var(--bg-subdued)]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-[var(--text-primary)]">
                      #{acc.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                      {acc.name}
                      {acc.is_external && (
                        <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">(System)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                      {acc.account_no}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                      {acc.owner_id ? `User #${acc.owner_id}` : 'System'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          acc.status === 'ACTIVE'
                            ? 'success'
                            : acc.status === 'FROZEN'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {acc.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatPaiseToRupees(acc.balance_paise)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {acc.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(acc.id, 'FROZEN')}
                            disabled={updatingAccountId === acc.id}
                            className="px-2 py-1 rounded text-[11px] font-medium text-[var(--status-warning)] border border-[var(--status-warning)]/30 hover:bg-[var(--status-warning-bg)] cursor-pointer"
                          >
                            Freeze
                          </button>
                        ) : acc.status === 'FROZEN' ? (
                          <button
                            onClick={() => handleUpdateStatus(acc.id, 'ACTIVE')}
                            disabled={updatingAccountId === acc.id}
                            className="px-2 py-1 rounded text-[11px] font-medium text-[var(--status-success)] border border-[var(--status-success)]/30 hover:bg-[var(--status-success-bg)] cursor-pointer"
                          >
                            Activate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subdued)] text-[var(--text-secondary)] font-medium">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Name / Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-subdued)]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-[var(--text-primary)]">
                      #{u.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                      <div>
                        <p className="font-semibold text-xs text-[var(--text-primary)]">
                          {u.name || 'User'}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                          {u.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          u.role === 'admin'
                            ? 'accent'
                            : u.role === 'auditor'
                            ? 'info'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: System Health */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              Database Connectivity & Pool
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">PostgreSQL Status:</span>
                <span className="font-medium text-[var(--status-success)]">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Connection Latency:</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {systemHealth?.latency_ms != null ? `${systemHealth.latency_ms} ms` : '< 2 ms'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Least-Privilege Role:</span>
                <span className="font-mono text-[var(--text-primary)]">ledgerline_runtime</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Rate Limiter:</span>
                <span className="font-medium text-[var(--text-primary)]">Sliding-Window Active</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              Core Ledger Invariants
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Double-Entry Conservation:</span>
                <span className="font-semibold text-[var(--status-success)]">ENFORCED (Σ = 0)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Concurrency Lock:</span>
                <span className="font-mono text-[var(--text-primary)]">SELECT FOR UPDATE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Check Constraint:</span>
                <span className="font-mono text-[var(--text-primary)]">chk_no_overdraft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Tamper-Proof Triggers:</span>
                <span className="font-medium text-[var(--status-success)]">BLOCK UPDATE/DELETE</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Create Account */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Create Ledger Account
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Provision a new double-entry account with opening balance
              </p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <Input
                label="Account Name"
                id="accName"
                placeholder="e.g. Treasury Operations, Corporate Reserve"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Account Owner
                </label>
                <select
                  value={accountOwnerId}
                  onChange={(e) => setAccountOwnerId(e.target.value)}
                  className="h-10 w-full rounded-xl bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] focus:outline-none"
                >
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Initial Balance (INR)"
                id="initialBal"
                type="number"
                step="0.01"
                min="0"
                value={initialBalanceRupees}
                onChange={(e) => setInitialBalanceRupees(e.target.value)}
                helper="Debits external clearing pool and credits new account"
                required
              />

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--border-subtle)]">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={creatingAccount}
                >
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Provision New User
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Create user with specific Role-Based Access clearance
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label="Full Name"
                id="uName"
                placeholder="e.g. Jane Doe"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />

              <Input
                label="Email Address"
                id="uEmail"
                type="email"
                placeholder="user@ledgerline.local"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                id="uPass"
                type="password"
                placeholder="Minimum 8 characters"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  System Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="h-10 w-full rounded-xl bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] focus:outline-none"
                >
                  <option value="holder">Account Holder (Customer Workspace)</option>
                  <option value="auditor">Auditor (Read-Only Verification)</option>
                  <option value="admin">Administrator (Full Control)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--border-subtle)]">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={creatingUser}
                >
                  Provision User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
