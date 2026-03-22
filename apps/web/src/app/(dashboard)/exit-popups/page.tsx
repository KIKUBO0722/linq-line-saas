'use client';

import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
  ShieldAlert, Plus, Trash2, ToggleLeft, ToggleRight, Eye, MousePointerClick,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function ExitPopupsPage() {
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [title, setTitle] = useState('ちょっと待ってください！');
  const [message, setMessage] = useState('今なら特別クーポンをプレゼント中です。');
  const [ctaText, setCtaText] = useState('特典を受け取る');
  const [couponCode, setCouponCode] = useState('');
  const [couponLabel, setCouponLabel] = useState('');
  const [triggerType, setTriggerType] = useState('exit_intent');
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.exitPopups.list()
      .then((data) => setPopups(Array.isArray(data) ? data : []))
      .catch(() => { toast.error('離脱ポップアップの読み込みに失敗しました'); setPopups([]); })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const popup = await api.exitPopups.create({
        name: name.trim(),
        title: title.trim(),
        message: message.trim(),
        ctaText: ctaText.trim(),
        couponCode: couponCode.trim() || null,
        couponLabel: couponLabel.trim() || null,
        triggerType,
        delaySeconds,
      });
      setPopups((prev) => [popup, ...prev]);
      setShowForm(false);
      setName('');
      toast.success('離脱防止ポップアップを作成しました');
    } catch {
      toast.error('作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="p-2 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            離脱防止ポップアップ
          </h1>
          <p className="text-sm text-muted-foreground">フォームやLPからの離脱時にクーポンや特典でユーザーを引き留め</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          ポップアップ作成
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">新規ポップアップ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">管理名 *</label>
              <Input className="mt-1" placeholder="例: フォーム離脱防止_クーポン" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">ポップアップタイトル</label>
                <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">CTAボタンテキスト</label>
                <Input className="mt-1" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">メッセージ</label>
              <Input className="mt-1" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">クーポンコード (任意)</label>
                <Input className="mt-1" placeholder="例: WELCOME10" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">クーポン説明 (任意)</label>
                <Input className="mt-1" placeholder="例: 10%OFFクーポン" value={couponLabel} onChange={(e) => setCouponLabel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">トリガー</label>
                <select
                  className="flex h-9 w-full mt-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                >
                  <option value="exit_intent">離脱意図検知（マウスが画面外に）</option>
                  <option value="back_button">戻るボタン押下</option>
                  <option value="scroll_up">スクロールアップ</option>
                  <option value="timer">時間経過</option>
                </select>
              </div>
              {triggerType === 'timer' && (
                <div>
                  <label className="text-sm font-medium">表示までの秒数</label>
                  <Input className="mt-1" type="number" min={0} value={delaySeconds} onChange={(e) => setDelaySeconds(Number(e.target.value))} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>キャンセル</Button>
              <Button disabled={!name.trim() || creating} onClick={handleCreate}>作成</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {popups.length === 0 && !showForm ? (
        <Card>
          <CardContent>
            <EmptyState
              illustration="generic"
              title="離脱防止ポップアップがありません"
              description="「ポップアップ作成」からフォーム離脱時のポップアップを設定しましょう"
              action={{ label: 'ポップアップ作成', onClick: () => setShowForm(true), icon: Plus }}
            />
          </CardContent>
        </Card>
      ) : popups.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead className="w-28">トリガー</TableHead>
                  <TableHead className="w-24 text-center">表示数</TableHead>
                  <TableHead className="w-24 text-center">クリック数</TableHead>
                  <TableHead className="w-20 text-center">CVR</TableHead>
                  <TableHead className="w-16 text-center">状態</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {popups.map((p) => {
                  const cvr = p.showCount > 0 ? Math.round((p.clickCount / p.showCount) * 100) : 0;
                  const triggerLabels: Record<string, string> = {
                    exit_intent: '離脱検知',
                    back_button: '戻るボタン',
                    scroll_up: 'スクロール',
                    timer: `${p.delaySeconds}秒後`,
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.title}</p>
                          {p.couponCode && (
                            <Badge variant="outline" className="mt-1 text-[10px]">{p.couponLabel || p.couponCode}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{triggerLabels[p.triggerType] || p.triggerType}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1 text-sm">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          {p.showCount ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1 text-sm">
                          <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                          {p.clickCount ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cvr > 10 ? 'default' : 'secondary'} className="text-[10px]">{cvr}%</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={async () => {
                            try {
                              const updated = await api.exitPopups.update(p.id, { isActive: !p.isActive });
                              setPopups((prev) => prev.map((x) => x.id === p.id ? updated : x));
                              toast.success(updated.isActive ? '有効化しました' : '無効化しました');
                            } catch {
                              toast.error('更新に失敗しました');
                            }
                          }}
                          aria-label="有効/無効切替"
                        >
                          {p.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={async () => {
                            if (!confirm('削除しますか？')) return;
                            try {
                              await api.exitPopups.delete(p.id);
                              setPopups((prev) => prev.filter((x) => x.id !== p.id));
                              toast.success('削除しました');
                            } catch {
                              toast.error('削除に失敗しました');
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
