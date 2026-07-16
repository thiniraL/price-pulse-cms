'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#0f1c27_0%,#1d3a35_55%,#f4f6f8_55%)] px-4">
      <form
        onSubmit={onSubmit}
        className="admin-card w-full max-w-md shadow-lg shadow-black/10"
      >
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          PricePulse
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Manage sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use the same account as the PricePulse backend.
        </p>

        <label className="mt-6 block text-sm font-medium">
          Email
          <input
            className="admin-input mt-1"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            className="admin-input mt-1"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="admin-btn admin-btn-primary mt-6 w-full"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
