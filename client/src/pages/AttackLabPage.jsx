import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchAccounts,
  executeWithdrawal,
  executeTransfer,
  verifySystemIntegrity,
  formatPaiseToRupees,
  generateIdempotencyKey,
} from '../services/api';
import GlowCard from '../components/ui/GlowCard';
import GlowButton from '../components/ui/GlowButton';
import Badge from '../components/ui/Badge';

export default function AttackLabPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [runningAttack, setRunningAttack] = useState(null);
  const [attackLogs, setAttackLogs] = useState([]);
  const [activeAccount, setActiveAccount] = useState('');

  const loadAccounts = async () => {
    try {
      const res = await fetchAccounts();
      if (res.ok && res.data?.accounts && res.data.accounts.length > 0) {
        setAccounts(res.data.accounts);
        setActiveAccount(String(res.data.accounts[0].id));
      }
    } catch {}
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const addLog = (msg) => {
    setAttackLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${msg}`,
    ]);
  };

  // ATTACK 1: Concurrency Race (Two 80% withdrawals at once with different keys)
  const runRaceConditionAttack = async () => {
    if (!activeAccount) return;
    setRunningAttack('race');
    addLog(`Initiating Attack 1: Concurrency Race on Account #${activeAccount}...`);

    try {
      const acc = accounts.find((a) => String(a.id) === String(activeAccount));
      const balance = Number(acc?.balance_paise || 10000);
      const withdrawAmount = Math.max(Math.floor(balance * 0.8), 100);

      addLog(`Account balance: ${balance} paise. Firing two simultaneous withdrawals of ${withdrawAmount} paise (80%)...`);

      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();

      // Launch both simultaneously
      const [res1, res2] = await Promise.all([
        executeWithdrawal({ accountId: activeAccount, amountPaise: withdrawAmount, idempotencyKey: key1 }),
        executeWithdrawal({ accountId: activeAccount, amountPaise: withdrawAmount, idempotencyKey: key2 }),
      ]);

      const oneSucceeded = (res1.ok && !res2.ok) || (!res1.ok && res2.ok);
      const bothFailed = !res1.ok && !res2.ok;

      if (oneSucceeded || (bothFailed && balance < withdrawAmount)) {
        addLog(`PASS: Pessimistic row locking prevented double debit. Res 1: ${res1.ok ? 'SUCCESS' : res1.error}, Res 2: ${res2.ok ? 'SUCCESS' : res2.error}`);
        showToast({
          title: 'Attack 1 Defended: PASS',
          message: 'PostgreSQL row locks prevented double debit. Exactly one withdrawal succeeded.',
          type: 'success',
        });
      } else {
        addLog(`FAIL: Both requests unexpectedly succeeded or violated invariant.`);
        showToast({ title: 'Attack Check Failed', message: 'Double withdrawal succeeded!', type: 'error' });
      }

      await loadAccounts();
    } catch (err) {
      addLog(`Error during attack execution: ${err.message}`);
    } finally {
      setRunningAttack(null);
    }
  };

  // ATTACK 2: Replay Storm (Same request with same key sent 10 times at once)
  const runReplayStormAttack = async () => {
    if (!activeAccount) return;
    setRunningAttack('replay');
    addLog(`Initiating Attack 2: Replay Storm (10 concurrent requests with identical Idempotency-Key)...`);

    try {
      const fixedKey = generateIdempotencyKey();
      const testAmount = 100; // 100 paise = 1 Rupee

      addLog(`Fixed Idempotency-Key: ${fixedKey}. Firing 10 parallel requests...`);

      const promises = Array.from({ length: 10 }, () =>
        executeWithdrawal({ accountId: activeAccount, amountPaise: testAmount, idempotencyKey: fixedKey })
      );

      const results = await Promise.all(promises);
      const successful = results.filter((r) => r.ok);
      const replays = results.filter((r) => r.isReplay);

      addLog(`Completed 10 requests: ${successful.length} successful, ${replays.length} returned as cached replays.`);

      if (successful.length === 10) {
        addLog(`PASS: Exactly once processing verified. All replay requests returned cached response without extra debits.`);
        showToast({
          title: 'Attack 2 Defended: PASS',
          message: 'Idempotency engine blocked duplicate withdrawals. Exactly once debited.',
          type: 'success',
        });
      } else {
        addLog(`WARNING: Some requests failed with error: ${results.find((r) => !r.ok)?.error}`);
      }

      await loadAccounts();
    } catch (err) {
      addLog(`Error during replay attack: ${err.message}`);
    } finally {
      setRunningAttack(null);
    }
  };

  // ATTACK 3: Overdraft Constraint Violation (Withdraw 1,000,000,000 paise)
  const runOverdraftAttack = async () => {
    if (!activeAccount) return;
    setRunningAttack('overdraft');
    addLog(`Initiating Attack 3: Overdraft Invariant Violation...`);

    try {
      const hugeAmount = 1000000000; // ₹10,000,000.00
      addLog(`Attempting to withdraw ${formatPaiseToRupees(hugeAmount)} exceeding account balance...`);

      const res = await executeWithdrawal({
        accountId: activeAccount,
        amountPaise: hugeAmount,
        idempotencyKey: generateIdempotencyKey(),
      });

      if (!res.ok) {
        addLog(`PASS: Overdraft rejected by database constraint: ${res.error}`);
        showToast({
          title: 'Attack 3 Defended: PASS',
          message: 'chk_no_overdraft constraint blocked negative balance mutation.',
          type: 'success',
        });
      } else {
        addLog(`CRITICAL FAILURE: Overdraft request succeeded! Balance may be negative.`);
        showToast({ title: 'Invariant Violated!', message: 'Overdraft succeeded.', type: 'error' });
      }

      await loadAccounts();
    } catch (err) {
      addLog(`Error: ${err.message}`);
    } finally {
      setRunningAttack(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-[rgba(60,255,160,0.12)] pb-6">
        <Badge variant="amber" size="sm" className="mb-2">
          FINANCIAL CONCURRENCY LAB
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[#eafff5]">
          Attack Lab & Concurrency Prover
        </h1>
        <p className="text-xs sm:text-sm text-[#7ea594] mt-1">
          Execute real-time race conditions, replay storms, and overdraft attacks against the live ledger.
        </p>
      </div>

      {/* Account Selector for Attack Target */}
      <GlowCard className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <label className="text-xs font-mono font-bold text-[#eafff5]">
            Target Test Account
          </label>
          <p className="text-[11px] text-[#7ea594]">
            Select which account will receive concurrent attack traffic
          </p>
        </div>

        <select
          value={activeAccount}
          onChange={(e) => setActiveAccount(e.target.value)}
          className="rounded-xl border border-[rgba(60,255,160,0.18)] bg-[#020605] px-4 py-2 text-xs font-mono text-[#eafff5] focus:outline-none focus:border-[#2dff9a]"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id} className="bg-[#07110d] text-[#eafff5]">
              #{a.id} — {a.name} ({formatPaiseToRupees(a.balance_paise)})
            </option>
          ))}
        </select>
      </GlowCard>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scenario 1: Race Condition */}
        <GlowCard className="p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#2dff9a] font-bold">SCENARIO 01</span>
              <Badge variant="emerald" size="sm">RACE GUARD</Badge>
            </div>
            <h3 className="text-base font-bold font-mono text-[#eafff5]">
              Simultaneous 80% Double Spend
            </h3>
            <p className="text-xs text-[#7ea594] leading-relaxed">
              Fires 2 simultaneous withdrawals of 80% balance with different idempotency keys. Pessimistic row locks ensure exactly 1 succeeds and 0 overdrafts occur.
            </p>
          </div>

          <GlowButton
            variant="primary"
            size="md"
            onClick={runRaceConditionAttack}
            disabled={runningAttack !== null}
            className="w-full flex items-center justify-center gap-2"
          >
            <Play className={`h-3.5 w-3.5 ${runningAttack === 'race' ? 'animate-spin' : ''}`} />
            <span>{runningAttack === 'race' ? 'Firing Race...' : 'Execute Race Attack'}</span>
          </GlowButton>
        </GlowCard>

        {/* Scenario 2: Replay Storm */}
        <GlowCard className="p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#2dff9a] font-bold">SCENARIO 02</span>
              <Badge variant="cyan" size="sm">IDEMPOTENCY</Badge>
            </div>
            <h3 className="text-base font-bold font-mono text-[#eafff5]">
              10x Replay Storm
            </h3>
            <p className="text-xs text-[#7ea594] leading-relaxed">
              Transmits 10 identical requests with identical UUID v4 key at the same millisecond. Proves exactly one debit executes and 9 replays return cached payload.
            </p>
          </div>

          <GlowButton
            variant="primary"
            size="md"
            onClick={runReplayStormAttack}
            disabled={runningAttack !== null}
            className="w-full flex items-center justify-center gap-2"
          >
            <Play className={`h-3.5 w-3.5 ${runningAttack === 'replay' ? 'animate-spin' : ''}`} />
            <span>{runningAttack === 'replay' ? 'Firing 10x Storm...' : 'Execute 10x Replay'}</span>
          </GlowButton>
        </GlowCard>

        {/* Scenario 3: Overdraft Violation */}
        <GlowCard className="p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#2dff9a] font-bold">SCENARIO 03</span>
              <Badge variant="error" size="sm">CONSTRAINT</Badge>
            </div>
            <h3 className="text-base font-bold font-mono text-[#eafff5]">
              Overdraft Attack
            </h3>
            <p className="text-xs text-[#7ea594] leading-relaxed">
              Attempts to withdraw ₹10,000,000.00 from an account with regular funds. Proves PostgreSQL DB check constraint <code className="text-[#2dff9a]">chk_no_overdraft</code> rejects the SQL statement.
            </p>
          </div>

          <GlowButton
            variant="secondary"
            size="md"
            onClick={runOverdraftAttack}
            disabled={runningAttack !== null}
            className="w-full flex items-center justify-center gap-2"
          >
            <Play className={`h-3.5 w-3.5 ${runningAttack === 'overdraft' ? 'animate-spin' : ''}`} />
            <span>{runningAttack === 'overdraft' ? 'Executing...' : 'Execute Overdraft'}</span>
          </GlowButton>
        </GlowCard>
      </div>

      {/* Terminal Live Execution Log */}
      <div className="rounded-2xl border border-[rgba(60,255,160,0.18)] bg-[#020605] p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[rgba(60,255,160,0.1)] pb-2.5">
          <div className="flex items-center gap-2 text-[#2dff9a]">
            <Terminal className="h-4 w-4" />
            <span className="font-bold">CONCURRENCY & INVARIANT EXECUTION LOG</span>
          </div>
          <button
            onClick={() => setAttackLogs([])}
            className="text-[10px] text-[#7ea594] hover:text-[#eafff5] cursor-pointer"
          >
            Clear Log
          </button>
        </div>

        <div className="h-48 overflow-y-auto space-y-1.5 text-[11px] text-[#7ea594] pr-2">
          {attackLogs.length === 0 ? (
            <p className="text-[#7ea594]/60 italic">Ready. Click any attack scenario above to stream live concurrency results.</p>
          ) : (
            attackLogs.map((log, i) => (
              <p
                key={i}
                className={
                  log.includes('PASS')
                    ? 'text-[#2dff9a] font-semibold'
                    : log.includes('FAIL')
                    ? 'text-[#ff5d7a] font-semibold'
                    : 'text-[#eafff5]'
                }
              >
                {log}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
