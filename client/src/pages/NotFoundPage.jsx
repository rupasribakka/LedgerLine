import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Terminal } from 'lucide-react';
import GlowButton from '../components/ui/GlowButton';
import GlowCard from '../components/ui/GlowCard';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020605] text-[#eafff5] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        <GlowCard className="p-8 sm:p-12 text-center space-y-6 border-[rgba(60,255,160,0.18)]">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,93,122,0.12)] border border-[rgba(255,93,122,0.35)] text-[#ff5d7a] shadow-[0_0_25px_rgba(255,93,122,0.2)]">
              <ShieldAlert className="h-8 w-8" />
            </div>
          </div>

          <div className="space-y-2">
            <Badge variant="error" size="sm" dot className="font-mono">
              ERR_ROUTE_NOT_COMMITTED // 404
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-[#eafff5]">
              Ledger Block Not Found
            </h1>
            <p className="text-sm text-[#7ea594] max-w-md mx-auto leading-relaxed">
              The requested URI does not exist in the LedgerLine state tree. No balance change or ledger mutation occurred.
            </p>
          </div>

          <div className="rounded-xl border border-[rgba(60,255,160,0.12)] bg-[#030a07] p-3 text-left font-mono text-xs text-[#7ea594] flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#2dff9a] shrink-0" />
            <span className="truncate">INVARIANT: HTTP_404_SAFE_FALLBACK :: APPEND_ONLY_PROTECTED</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <GlowButton
              variant="secondary"
              size="md"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </GlowButton>

            <Link to={isAuthenticated ? '/app' : '/'}>
              <GlowButton variant="primary" size="md" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>{isAuthenticated ? 'Open Console' : 'Return Home'}</span>
              </GlowButton>
            </Link>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
