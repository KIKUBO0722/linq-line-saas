'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, Copy, Check, X, Pencil, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Coupon } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectOption } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import { HelpTip } from '@/components/ui/help-tip';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function formatDiscount(type: string, value: number): string {
  if (type === 'percentage') return `${value}%`;
  return `${value.toLocaleString()}円`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'discountValue' | 'usedCount' | 'expiresAt' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCoupons();
  }, []);

  // Listen for AI-fill events from the copilot
  useEffect(() => {
    function handleAiFill(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.type !== 'create_coupon') return;
      const data = detail.data;
      if (!data) return;

      // Map discountType values: 'percent' -> 'percentage', 'fixed' -> 'fixed'
      const discountType = data.discountType === 'percent' ? 'percentage' : data.discountType === 'fixed' ? 'fixed' : 'percentage';

      if (data.name) setFormName(data.name);
      if (data.code) setFormCode(data.code);
      setFormDiscountType(discountType);
      if (data.discountValue != null) setFormDiscountValue(String(data.discountValue));
      if (data.description) setFormDescription(data.description);
      if (data.maxUses != null) setFormMaxUses(String(data.maxUses));

      setShowCreate(true);
    }

    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, []);

  async function loadCoupons() {
    try {
      const data = await api.coupons.list();
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormCode('');
    setFormDiscountType('percentage');
    setFormDiscountValue('');
    setFormDescription('');
    setFormExpiresAt('');
    setFormMaxUses('');
    setErrors({});
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formName.trim()) newErrors.name = 'クーポン名を入力してください';
    if (!formCode.trim()) newErrors.code = 'クーポンコードを入力してください';
    if (!formDiscountValue) newErrors.discountValue = '割引値を入力してください';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setCreating(true);
    try {
      const coupon = (await api.coupons.create({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue),
        description: formDescription.trim() || null,
        expiresAt: formExpiresAt || null,
        maxUses: formMaxUses ? Number(formMaxUses) : null,
        isActive: true,
      })) as Coupon;
      setCoupons((prev) => [coupon, ...prev]);
      resetForm();
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'クーポンの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      const updated = await api.coupons.toggle(id, isActive) as Partial<Coupon>;
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ステータスの変更に失敗しました');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このクーポンを削除しますか？')) return;
    try {
      await api.coupons.delete(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'クーポンの削除に失敗しました');
    }
  }

  async function handleCopyCode(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  }

  function startEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setFormName(coupon.name);
    setFormCode(coupon.code);
    setFormDiscountType(coupon.discountType);
    setFormDiscountValue(String(coupon.discountValue));
    setFormDescription(coupon.description || '');
    setFormExpiresAt(coupon.expiresAt ? coupon.expiresAt.split('T')[0] : '');
    setFormMaxUses(coupon.maxUses != null ? String(coupon.maxUses) : '');
    setErrors({});
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const newErrors: Record<string, string> = {};
    if (!formName.trim()) newErrors.name = 'クーポン名を入力してください';
    if (!formCode.trim()) newErrors.code = 'クーポンコードを入力してください';
    if (!formDiscountValue) newErrors.discountValue = '割引値を入力してください';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    try {
      const updated = await api.coupons.update(editingId, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue),
        description: formDescription.trim() || undefined,
        expiresAt: formExpiresAt || undefined,
        maxUses: formMaxUses ? Number(formMaxUses) : undefined,
      }) as Partial<Coupon>;
      setCoupons((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c)));
      setEditingId(null);
      resetForm();
      toast.success('クーポンを更新しました');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'クーポンの更新に失敗しました');
    }
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ column }: { column: typeof sortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const filteredCoupons = coupons
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name, 'ja'); break;
        case 'discountValue': cmp = a.discountValue - b.discountValue; break;
        case 'usedCount': cmp = a.usedCount - b.usedCount; break;
        case 'expiresAt': cmp = (a.expiresAt || '').localeCompare(b.expiresAt || ''); break;
        case 'createdAt': cmp = (a.createdAt || '').localeCompare(b.createdAt || ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="px-[5%] pt-2 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">クーポン管理</h1>
            <HelpTip content="友だちに配布するデジタルクーポンを作成・管理します。使用回数や有効期限を設定できます" />
          </div>
          <p className="text-sm text-muted-foreground">割引クーポンの作成・管理</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          クーポン作成
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規クーポン作成</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>クーポン名 *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => { setFormName(e.target.value); setErrors(prev => ({...prev, name: ''})); }}
                    placeholder="例: 新規登録10%OFF"
                    autoFocus
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>クーポンコード *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formCode}
                      onChange={(e) => { setFormCode(e.target.value.toUpperCase()); setErrors(prev => ({...prev, code: ''})); }}
                      placeholder="例: WELCOME10"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setFormCode(generateCode()); setErrors(prev => ({...prev, code: ''})); }}
                    >
                      自動生成
                    </Button>
                  </div>
                  {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>割引タイプ *</Label>
                  <Select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value)}
                  >
                    <SelectOption value="percentage">割合（%）</SelectOption>
                    <SelectOption value="fixed">固定額（円）</SelectOption>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>割引値 *</Label>
                  <Input
                    type="number"
                    value={formDiscountValue}
                    onChange={(e) => { setFormDiscountValue(e.target.value); setErrors(prev => ({...prev, discountValue: ''})); }}
                    placeholder={formDiscountType === 'percentage' ? '例: 10' : '例: 500'}
                    min="1"
                  />
                  {errors.discountValue && <p className="text-sm text-red-500 mt-1">{errors.discountValue}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>説明</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="クーポンの説明（任意）"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>有効期限</Label>
                  <Input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>最大使用回数</Label>
                  <Input
                    type="number"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="無制限の場合は空欄"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating || !formName.trim() || !formCode.trim() || !formDiscountValue}>
                  {creating ? '作成中...' : '作成'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="クーポン名・コードで検索..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{filteredCoupons.length}件</span>
      </div>

      {/* Coupons list */}
      {loading ? (
        <PageSkeleton />
      ) : filteredCoupons.length === 0 ? (
        <EmptyState
          illustration="coupons"
          title={searchQuery ? '検索結果がありません' : 'クーポンがまだありません'}
          description={searchQuery ? '別のキーワードで検索してみてください' : '「クーポン作成」から最初のクーポンを作成しましょう'}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><button onClick={() => toggleSort('name')} className="flex items-center hover:text-foreground transition-colors">クーポン名<SortIcon column="name" /></button></TableHead>
                <TableHead>コード</TableHead>
                <TableHead><button onClick={() => toggleSort('discountValue')} className="flex items-center hover:text-foreground transition-colors">割引<SortIcon column="discountValue" /></button></TableHead>
                <TableHead><button onClick={() => toggleSort('expiresAt')} className="flex items-center hover:text-foreground transition-colors">有効期限<SortIcon column="expiresAt" /></button></TableHead>
                <TableHead><button onClick={() => toggleSort('usedCount')} className="flex items-center hover:text-foreground transition-colors">使用状況<SortIcon column="usedCount" /></button></TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="w-[100px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => {
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                const isMaxed = coupon.maxUses != null && coupon.usedCount >= coupon.maxUses;

                if (editingId === coupon.id) {
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell colSpan={7} className="p-4 bg-muted/30">
                        <form onSubmit={handleUpdate} className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">クーポン名</Label>
                              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="h-8 text-sm" />
                              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">コード</Label>
                              <Input value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} className="h-8 text-sm font-mono" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">割引タイプ</Label>
                              <Select value={formDiscountType} onChange={(e) => setFormDiscountType(e.target.value)} className="h-8 text-sm">
                                <SelectOption value="percentage">割合（%）</SelectOption>
                                <SelectOption value="fixed">固定額（円）</SelectOption>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">割引値</Label>
                              <Input type="number" value={formDiscountValue} onChange={(e) => setFormDiscountValue(e.target.value)} className="h-8 text-sm" min="1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">有効期限</Label>
                              <Input type="date" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">最大使用回数</Label>
                              <Input type="number" value={formMaxUses} onChange={(e) => setFormMaxUses(e.target.value)} className="h-8 text-sm" placeholder="無制限" min="1" />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">説明</Label>
                              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="h-8 text-sm" placeholder="説明（任意）" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm">保存</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); resetForm(); }}>キャンセル</Button>
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{coupon.name}</div>
                        {coupon.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {coupon.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {coupon.code}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopyCode(coupon.id, coupon.code)}
                          aria-label="コピー"
                        >
                          {copiedId === coupon.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {formatDiscount(coupon.discountType, coupon.discountValue)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${isExpired ? 'text-destructive' : ''}`}>
                        {formatDate(coupon.expiresAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${isMaxed ? 'text-destructive font-medium' : ''}`}>
                        {coupon.usedCount}
                        {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ' / 無制限'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={coupon.isActive}
                          onCheckedChange={(checked) => handleToggle(coupon.id, checked)}
                        />
                        {coupon.isActive ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] whitespace-nowrap">有効</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] whitespace-nowrap">無効</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-0.5 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(coupon)} title="編集">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(coupon.id)}
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
