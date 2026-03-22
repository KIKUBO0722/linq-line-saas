'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { Link2, Plus, BarChart3, Gift, Users, ChevronLeft, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ReferralProgram, ReferralStats, ReferralConversion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

export default function ReferralPage() {
  const [programs, setPrograms] = useState<ReferralProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'stats'>('list');
  const [selectedProgram, setSelectedProgram] = useState<ReferralProgram | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState('coupon');
  const [rewardValue, setRewardValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    setLoading(true);
    try {
      const data = await api.referral.listPrograms();
      setPrograms(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !rewardValue.trim()) return;
    setSaving(true);
    try {
      await api.referral.createProgram({ name, rewardType, rewardValue, description: description || undefined });
      setName('');
      setDescription('');
      setRewardType('coupon');
      setRewardValue('');
      setView('list');
      loadPrograms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function viewStats(program: ReferralProgram) {
    setSelectedProgram(program);
    try {
      const data = await api.referral.getProgramStats(program.id);
      setStats(data);
      setView('stats');
    } catch {
      setStats(null);
      setView('stats');
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const rewardTypeLabel: Record<string, string> = {
    coupon: 'クーポン',
    point: 'ポイント',
    message: 'メッセージ',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Stats view
  if (view === 'stats' && selectedProgram) {
    return (
      <div className="p-2 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); setSelectedProgram(null); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{selectedProgram.name}</h1>
            <p className="text-sm text-muted-foreground">紹介プログラムの統計</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Link2 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.totalCodes || 0}</p>
                  <p className="text-xs text-muted-foreground">紹介コード数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.totalConversions || 0}</p>
                  <p className="text-xs text-muted-foreground">紹介成功数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{rewardTypeLabel[selectedProgram.rewardType] || selectedProgram.rewardType}</p>
                  <p className="text-xs text-muted-foreground">{selectedProgram.rewardValue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {stats?.recentConversions && stats.recentConversions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近の紹介</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>紹介コード</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentConversions.map((conv: ReferralConversion) => (
                  <TableRow key={conv.id}>
                    <TableCell className="text-sm font-medium">{conv.code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(conv.createdAt).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell><Badge>成功</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  }

  // Create view
  if (view === 'create') {
    return (
      <div className="p-2 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">紹介プログラム作成</h1>
            <p className="text-sm text-muted-foreground">新しいお友だち紹介プログラムを設定</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>プログラム名</Label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 友だち紹介キャンペーン"
                />
              </div>

              <div className="space-y-2">
                <Label>説明 (任意)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="プログラムの説明..."
                />
              </div>

              <div className="space-y-2">
                <Label>報酬タイプ</Label>
                <select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="coupon">クーポン</option>
                  <option value="point">ポイント</option>
                  <option value="message">メッセージ</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>報酬内容</Label>
                <Input
                  type="text"
                  required
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  placeholder="例: 10%OFFクーポン / 500ポイント"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? '作成中...' : '作成する'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setView('list')}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">紹介プログラム</h1>
          <p className="text-sm text-muted-foreground">お友だち紹介の仕組みを管理</p>
        </div>
        <Button onClick={() => setView('create')}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              illustration="generic"
              title="紹介プログラムがありません"
              description="お友だち紹介プログラムを作成して、友だちの輪を広げましょう"
              action={{ label: '新規作成', onClick: () => setView('create'), icon: Plus }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>プログラム名</TableHead>
                <TableHead>報酬</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <span className="text-sm font-medium">{program.name}</span>
                    {program.description && (
                      <span className="text-xs text-muted-foreground block mt-0.5">{program.description}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Gift className="h-4 w-4 text-purple-500" />
                      {rewardTypeLabel[program.rewardType] || program.rewardType}: {program.rewardValue}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={program.isActive ? 'default' : 'secondary'}>
                      {program.isActive ? '有効' : '無効'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => viewStats(program)}>
                      <BarChart3 className="h-4 w-4 mr-1" />
                      統計
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
