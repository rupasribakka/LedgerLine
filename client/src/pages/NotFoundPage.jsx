import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, FileQuestion } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card className="p-8 sm:p-10 text-center space-y-5">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-subdued)] text-[var(--text-secondary)]">
              <FileQuestion className="h-7 w-7" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Badge variant="neutral" size="sm">
              404 Page Not Found
            </Badge>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Page does not exist
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The requested address could not be located. No balance alteration or ledger transaction has occurred.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(-1)}
              icon={ArrowLeft}
            >
              <span>Go Back</span>
            </Button>

            <Link to={isAuthenticated ? '/app' : '/'}>
              <Button variant="primary" size="sm" icon={Home}>
                <span>{isAuthenticated ? 'Console' : 'Home'}</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
