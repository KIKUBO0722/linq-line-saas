'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialLoginButtons, AuthDivider } from '@/components/auth/social-login-buttons';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="h-6 w-6 border-2 border-[#06C755] border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const oauthError = searchParams.get('error');
  const [error, setError] = useState(
    oauthError === 'oauth_failed' ? 'ソーシャルログインに失敗しました。もう一度お試しください。'
    : oauthError === 'oauth_cancelled' ? 'ログインがキャンセルされました。'
    : '',
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.login({ email, password });
      router.push('/overview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">おかえりなさい</h2>
        <p className="text-sm text-slate-500 mt-1">アカウントにログイン</p>
      </div>

      {/* SSO Buttons */}
      <SocialLoginButtons mode="login" />

      <AuthDivider />

      {/* Email/Password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">メールアドレス</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">パスワード</Label>
            <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-[#06C755] transition-colors">
              パスワードをお忘れですか？
            </Link>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11" />
        </div>
        <Button type="submit" className="w-full h-11 bg-[#06C755] hover:bg-[#05b34d] text-white font-bold" disabled={loading}>
          {loading ? 'ログイン中...' : 'ログイン'}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-slate-500 mt-6">
        アカウントをお持ちでない方は{' '}
        <Link href="/signup" className="text-[#06C755] font-medium hover:underline">新規登録</Link>
      </p>
    </div>
  );
}
