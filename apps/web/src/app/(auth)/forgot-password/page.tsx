'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: API連携（メール送信機能が必要）
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 1000);
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
            <p className="text-sm text-muted-foreground mt-1">パスワードリセット</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 text-green-700 text-sm p-4 rounded-md">
                リセット用のメールを送信しました。メールをご確認ください。
              </div>
              <p className="text-xs text-muted-foreground">
                メールが届かない場合は迷惑メールフォルダをご確認ください。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '送信中...' : 'リセットメールを送信'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline">
            ログインに戻る
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
