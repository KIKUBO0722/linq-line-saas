'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

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
    <div>
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">パスワードリセット</h2>
        <p className="text-sm text-slate-500 mt-1">
          登録済みのメールアドレスにリセット用リンクを送信します
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-emerald-50 text-emerald-700 text-sm p-4 rounded-lg border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">メールを送信しました</p>
              <p className="text-emerald-600 mt-1">
                リセット用のリンクを <strong>{email}</strong> に送信しました。メールをご確認ください。
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center">
            メールが届かない場合は迷惑メールフォルダをご確認ください。
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11"
            />
          </div>
          <Button type="submit" className="w-full h-11 bg-[#06C755] hover:bg-[#05b34d] text-white font-bold" disabled={loading}>
            {loading ? '送信中...' : 'リセットメールを送信'}
          </Button>
        </form>
      )}

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#06C755] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          ログインに戻る
        </Link>
      </div>
    </div>
  );
}
