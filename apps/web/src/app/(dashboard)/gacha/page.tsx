'use client';

import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Dices, Plus, Trash2, Gift, Trophy, Settings2, Play, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { GachaCampaign, GachaDraw, GachaPrize, GachaStyle, PrizeType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { HelpTip } from '@/components/ui/help-tip';

type View = 'list' | 'create' | 'detail';

export default function GachaPage() {
  const [campaigns, setCampaigns] = useState<GachaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<GachaCampaign | null>(null);
  const [draws, setDraws] = useState<GachaDraw[]>([]);

  // Create form
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [maxDraws, setMaxDraws] = useState(1);
  const [style, setStyle] = useState('capsule');
  const [creating, setCreating] = useState(false);

  // Prize form
  const [prizeName, setPrizeName] = useState('');
  const [prizeWeight, setPrizeWeight] = useState(1);
  const [prizeType, setPrizeType] = useState('message');
  const [prizeMessage, setPrizeMessage] = useState('');
  const [prizeMaxQty, setPrizeMaxQty] = useState(0);

  useEffect(() => {
    api.gacha.listCampaigns()
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => { toast.error('ガチャキャンペーンの読み込みに失敗しました'); setCampaigns([]); })
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(campaign: GachaCampaign) {
    try {
      const detail = await api.gacha.getCampaign(campaign.id);
      setSelected(detail);
      const history = await api.gacha.getDrawHistory(campaign.id);
      setDraws(Array.isArray(history) ? history : []);
      setView('detail');
    } catch {
      toast.error('読み込みに失敗しました');
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const c = await api.gacha.createCampaign({ name, description: desc, maxDrawsPerUser: maxDraws, style: style as GachaStyle });
      setCampaigns((prev) => [c, ...prev]);
      setName(''); setDesc(''); setMaxDraws(1); setStyle('capsule');
      toast.success('ガチャキャンペーンを作成しました');
      openDetail(c);
    } catch {
      toast.error('作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddPrize() {
    if (!selected || !prizeName.trim()) return;
    try {
      const prize = await api.gacha.addPrize(selected.id, {
        name: prizeName.trim(),
        weight: prizeWeight,
        prizeType: prizeType as PrizeType,
        winMessage: prizeMessage || null,
        maxQuantity: prizeMaxQty,
      });
      setSelected((prev) => prev ? { ...prev, prizes: [...(prev.prizes || []), prize as GachaPrize] } : prev);
      setPrizeName(''); setPrizeWeight(1); setPrizeType('message'); setPrizeMessage(''); setPrizeMaxQty(0);
      toast.success('景品を追加しました');
    } catch {
      toast.error('景品追加に失敗しました');
    }
  }

  async function handleDeletePrize(prizeId: string) {
    try {
      await api.gacha.deletePrize(prizeId);
      setSelected((prev) => prev ? {
        ...prev,
        prizes: (prev.prizes || []).filter((p) => p.id !== prizeId),
      } : prev);
      toast.success('景品を削除しました');
    } catch {
      toast.error('削除に失敗しました');
    }
  }

  async function handleTestDraw() {
    if (!selected) return;
    try {
      const result = await api.gacha.draw(selected.id) as GachaDraw & { error?: string };
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`当選: ${result.prize?.name || '不明'}`);
        // Refresh
        openDetail(selected);
      }
    } catch {
      toast.error('抽選に失敗しました');
    }
  }

  if (loading) return <PageSkeleton />;

  // --- Detail view ---
  if (view === 'detail' && selected) {
    const prizes = selected.prizes || [];
    const totalWeight = prizes.reduce((s: number, p: GachaPrize) => s + p.weight, 0);

    return (
      <div className="p-2 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} aria-label="戻る">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Dices className="h-5 w-5 text-primary" />
              {selected.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              合計 {selected.totalDraws ?? 0} 回抽選 · {selected.isActive ? '有効' : '無効'}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleTestDraw}>
            <Play className="h-4 w-4" />
            テスト抽選
          </Button>
        </div>

        {/* Prizes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" />
              景品一覧
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prizes.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>景品名</TableHead>
                    <TableHead className="w-20 text-center">確率</TableHead>
                    <TableHead className="w-20 text-center">当選数</TableHead>
                    <TableHead className="w-20 text-center">上限</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prizes.map((p: GachaPrize) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.winMessage && <p className="text-xs text-muted-foreground mt-0.5">{p.winMessage}</p>}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {totalWeight > 0 ? Math.round((p.weight / totalWeight) * 100) : 0}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{p.wonCount ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {p.maxQuantity === 0 ? '無制限' : p.maxQuantity}
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleDeletePrize(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="削除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Add prize form */}
            <div className="mt-4 space-y-3 border-t pt-4">
              <p className="text-sm font-medium">景品を追加</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input placeholder="景品名" value={prizeName} onChange={(e) => setPrizeName(e.target.value)} />
                <Input type="number" placeholder="重み" min={1} value={prizeWeight} onChange={(e) => setPrizeWeight(Number(e.target.value))} />
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={prizeType}
                  onChange={(e) => setPrizeType(e.target.value)}
                >
                  <option value="message">メッセージ</option>
                  <option value="coupon">クーポン</option>
                  <option value="nothing">ハズレ</option>
                </select>
                <Input type="number" placeholder="上限(0=無制限)" min={0} value={prizeMaxQty} onChange={(e) => setPrizeMaxQty(Number(e.target.value))} />
              </div>
              <Input placeholder="当選メッセージ (任意)" value={prizeMessage} onChange={(e) => setPrizeMessage(e.target.value)} />
              <Button size="sm" disabled={!prizeName.trim()} onClick={handleAddPrize} className="gap-1.5">
                <Plus className="h-4 w-4" />
                景品追加
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Draw history */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              抽選履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            {draws.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">まだ抽選がありません</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>友だち</TableHead>
                    <TableHead>景品</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draws.slice(0, 50).map((d: GachaDraw) => {
                    const prize = prizes.find((p: GachaPrize) => p.id === d.prizeId);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs">{new Date(d.drawnAt).toLocaleString('ja-JP')}</TableCell>
                        <TableCell className="text-xs">
                          {d.friendId ? <Badge variant="outline" className="text-[10px]">ID: {d.friendId.slice(0, 8)}</Badge> : <span className="text-muted-foreground">テスト</span>}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{prize?.name || '不明'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Create view ---
  if (view === 'create') {
    return (
      <div className="p-2 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} aria-label="戻る">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">新規ガチャキャンペーン</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">キャンペーン名 *</label>
              <Input className="mt-1" placeholder="例: 新規友だちキャンペーン" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">説明</label>
              <Input className="mt-1" placeholder="キャンペーンの説明" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">1人あたり上限回数</label>
                <Input className="mt-1" type="number" min={0} value={maxDraws} onChange={(e) => setMaxDraws(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground mt-1">0 = 無制限</p>
              </div>
              <div>
                <label className="text-sm font-medium">演出スタイル</label>
                <select
                  className="flex h-9 w-full mt-1 rounded-md border border-input bg-background px-3 text-sm"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="capsule">カプセル</option>
                  <option value="roulette">ルーレット</option>
                  <option value="scratch">スクラッチ</option>
                  <option value="slot">スロット</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setView('list')}>キャンセル</Button>
              <Button disabled={!name.trim() || creating} onClick={handleCreate} className="gap-1.5">
                <Dices className="h-4 w-4" />
                作成して景品を設定
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="p-2 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Dices className="h-6 w-6 text-primary" />
              ガチャ
            </h1>
            <HelpTip content="友だちが楽しめるガチャ（くじ引き）キャンペーンを作成します。当選確率や景品を設定できます" />
          </div>
          <p className="text-sm text-muted-foreground">抽選型キャンペーンの作成・管理</p>
        </div>
        <Button onClick={() => setView('create')} className="gap-1.5">
          <Plus className="h-4 w-4" />
          キャンペーン作成
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              illustration="generic"
              title="ガチャキャンペーンがありません"
              description="「キャンペーン作成」から抽選型キャンペーンを作成しましょう"
              action={{ label: 'キャンペーン作成', onClick: () => setView('create'), icon: Plus }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openDetail(c)}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {c.name}
                      <Badge variant={c.isActive ? 'default' : 'secondary'} className="text-[10px]">
                        {c.isActive ? '有効' : '無効'}
                      </Badge>
                    </h3>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{c.totalDraws ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">回抽選</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>上限: {c.maxDrawsPerUser === 0 ? '無制限' : `${c.maxDrawsPerUser}回/人`}</span>
                  <span>スタイル: {c.style}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
