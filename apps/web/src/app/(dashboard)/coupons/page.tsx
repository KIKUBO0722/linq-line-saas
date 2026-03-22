'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, Copy, Check, X } from 'lucide-react';
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

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');

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
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formDiscountValue) return;
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

  return (
    <div className="p-3 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">クーポン管理</h1>
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
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="例: 新規登録10%OFF"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>クーポンコード *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="例: WELCOME10"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormCode(generateCode())}
                    >
                      自動生成
                    </Button>
                  </div>
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
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    placeholder={formDiscountType === 'percentage' ? '例: 10' : '例: 500'}
                    min="1"
                  />
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

      {/* Coupons list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">クーポン一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageSkeleton />
          ) : coupons.length === 0 ? (
            <EmptyState
              illustration="coupons"
              title="クーポンがまだありません"
              description="「クーポン作成」から最初のクーポンを作成しましょう"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>クーポン名</TableHead>
                  <TableHead>コード</TableHead>
                  <TableHead>割引</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>使用状況</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                  const isMaxed = coupon.maxUses != null && coupon.usedCount >= coupon.maxUses;

                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{coupon.name}</div>
                          {coupon.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {coupon.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                            {coupon.code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleCopyCode(coupon.id, coupon.code)}
                            aria-label="コピー"
                          >
                            {copiedId === coupon.id ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatDiscount(coupon.discountType, coupon.discountValue)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isExpired ? 'text-destructive' : ''}>
                          {formatDate(coupon.expiresAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={isMaxed ? 'text-destructive font-medium' : ''}>
                          {coupon.usedCount}
                          {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ' / 無制限'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={coupon.isActive}
                            onCheckedChange={(checked) => handleToggle(coupon.id, checked)}
                          />
                          <span className="text-xs">
                            {coupon.isActive ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">有効</Badge>
                            ) : (
                              <Badge variant="secondary">無効</Badge>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(coupon.id)}
                          className="text-destructive hover:text-destructive"
                          aria-label="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
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
