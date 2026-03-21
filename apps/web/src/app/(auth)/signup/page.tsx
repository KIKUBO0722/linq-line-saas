'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export default function SignupPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.signup({ email, password, tenantName });
      router.push('/overview');
    } catch (err: any) {
      setError(err.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 pb-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold">
              <span className="text-[#06C755]">Lin</span>
              <span className="text-slate-900">Q</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">14日間無料トライアル</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="tenantName">会社名・店舗名</Label>
              <Input id="tenantName" type="text" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="例: 田中ビューティーサロン" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '作成中...' : '無料で始める'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">ログイン</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
