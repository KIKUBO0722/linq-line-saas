'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import {
  Building2, Users, MessageSquare, ArrowUpRight, ArrowDownRight,
  Clock, DollarSign, Percent, Save, Loader2, TrendingUp, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpTip } from '@/components/ui/help-tip';

interface ClientInfo {
  tenantId: string;
  tenantName: string;
  industry: string | null;
  status: string;
  friendCount: number;
  messagesSent: number;
  messagesReceived: number;
  planName: string | null;
  createdAt: string;
}

interface AgencyData {
  totalClients: number;
  totalFriends: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  clients: ClientInfo[];
}

interface MarginInfo {
  clientTenantId: string;
  clientName: string;
  marginType: string;
  marginValue: string;
  notes: string | null;
  updatedAt: string;
}

interface CommissionInfo {
  id: string;
  clientTenantId: string;
  clientName: string;
  period: string;
  clientRevenue: number;
  commissionAmount: number;
  marginType: string;
  marginValue: string;
  status: string;
  createdAt: string;
}

interface CommissionSummary {
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  totalClients: number;
}

export default function AgencyPage() {
  const [loading, setLoading] = useState(true);
  const [isAgency, setIsAgency] = useState(false);
  const [data, setData] = useState<AgencyData | null>(null);
  const [margins, setMargins] = useState<MarginInfo[]>([]);
  const [commissions, setCommissions] = useState<CommissionInfo[]>([]);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null);
  const [editingMargin, setEditingMargin] = useState<string | null>(null);
  const [editType, setEditType] = useState('percentage');
  const [editValue, setEditValue] = useState('20');
  const [editNotes, setEditNotes] = useState('');
  const [savingMargin, setSavingMargin] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const status = await api.agency.status();
        setIsAgency(status.isAgency);
        if (status.isAgency) {
          const [overview, marginList, commList, commSummary] = await Promise.all([
            api.agency.overview(),
            api.agency.listMargins().catch(() => []),
            api.agency.getCommissions().catch(() => []),
            api.agency.getCommissionSummary().catch(() => null),
          ]);
          setData(overview);
          setMargins(Array.isArray(marginList) ? marginList : []);
          setCommissions(Array.isArray(commList) ? commList : []);
          setCommissionSummary(commSummary);
        }
      } catch {
        toast.error('代理店情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveMargin(clientTenantId: string) {
    setSavingMargin(true);
    try {
      await api.agency.setMargin(clientTenantId, {
        marginType: editType,
        marginValue: Number(editValue),
        notes: editNotes || undefined,
      });
      toast.success('マージン設定を保存しました');
      setEditingMargin(null);
      // Refresh margins
      const updated = await api.agency.listMargins();
      setMargins(Array.isArray(updated) ? updated : []);
    } catch {
      toast.error('マージン設定の保存に失敗しました');
    } finally {
      setSavingMargin(false);
    }
  }

  function startEditing(client: ClientInfo) {
    const existing = margins.find((m) => m.clientTenantId === client.tenantId);
    setEditingMargin(client.tenantId);
    setEditType(existing?.marginType || 'percentage');
    setEditValue(existing?.marginValue || '20');
    setEditNotes(existing?.notes || '');
  }

  if (loading) return <PageSkeleton />;

  if (!isAgency) {
    return (
      <div className="px-[5%] pt-2 space-y-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">代理店ダッシュボード</h1>
          <HelpTip content="代理店として複数のクライアントアカウントをまとめて管理する画面です" />
        </div>
        <Card>
          <CardContent>
            <EmptyState
              illustration="generic"
              title="代理店モードが有効ではありません"
              description="クライアントをLinQに招待すると、ここで全体を管理できるようになります。代理店プランの詳細はお問い合わせください。"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-[5%] pt-2 space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">代理店ダッシュボード</h1>
        <HelpTip content="代理店として複数のクライアントアカウントをまとめて管理する画面です。マージン設定で各クライアントの手数料を管理できます" />
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{data?.totalClients || 0}</p>
                <p className="text-xs text-muted-foreground">クライアント数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{(data?.totalFriends || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">総友だち数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{(data?.totalMessagesSent || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">総配信数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">¥{(commissionSummary?.totalEarned || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">累計コミッション</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            クライアント
          </TabsTrigger>
          <TabsTrigger value="margins" className="gap-1.5">
            <Percent className="h-4 w-4" />
            マージン設定
          </TabsTrigger>
          <TabsTrigger value="commissions" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            コミッション履歴
          </TabsTrigger>
        </TabsList>

        {/* Clients tab */}
        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">クライアント一覧</CardTitle>
              <CardDescription>{data?.totalClients || 0}件のクライアントを管理中</CardDescription>
            </CardHeader>
            {data?.clients && data.clients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>クライアント名</TableHead>
                    <TableHead>業種</TableHead>
                    <TableHead>プラン</TableHead>
                    <TableHead>友だち数</TableHead>
                    <TableHead>配信/受信</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>登録日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clients.map((client) => (
                    <TableRow key={client.tenantId}>
                      <TableCell className="font-medium">{client.tenantName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{client.industry || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">{client.planName || 'free'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{client.friendCount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">
                        <span className="text-green-600">{client.messagesSent.toLocaleString()}</span>
                        {' / '}
                        <span className="text-blue-600">{client.messagesReceived.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : client.status === 'trial' ? 'secondary' : 'outline'} className="text-[10px]">
                          {client.status === 'active' ? '有効' : client.status === 'trial' ? 'トライアル' : client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(client.createdAt).toLocaleDateString('ja-JP')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CardContent>
                <EmptyState
                  illustration="generic"
                  title="クライアントがいません"
                  description="クライアントを招待してLinQアカウントを作成してもらいましょう"
                />
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Margins tab */}
        <TabsContent value="margins" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">マージン設定</CardTitle>
                <HelpTip content="各クライアントの月額利用料に対する手数料率を設定します。割合（%）または固定額（円）で指定できます" />
              </div>
              <CardDescription>クライアントごとの手数料率・固定額を管理</CardDescription>
            </CardHeader>
            {data?.clients && data.clients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>クライアント名</TableHead>
                    <TableHead>マージン種別</TableHead>
                    <TableHead>マージン値</TableHead>
                    <TableHead>メモ</TableHead>
                    <TableHead>最終更新</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clients.map((client) => {
                    const margin = margins.find((m) => m.clientTenantId === client.tenantId);
                    const isEditing = editingMargin === client.tenantId;

                    if (isEditing) {
                      return (
                        <TableRow key={client.tenantId} className="bg-slate-50">
                          <TableCell className="font-medium">{client.tenantName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <button
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${editType === 'percentage' ? 'bg-[#06C755] text-white' : 'bg-slate-100 text-slate-600'}`}
                                onClick={() => setEditType('percentage')}
                              >
                                割合(%)
                              </button>
                              <button
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${editType === 'fixed' ? 'bg-[#06C755] text-white' : 'bg-slate-100 text-slate-600'}`}
                                onClick={() => setEditType('fixed')}
                              >
                                固定額(¥)
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 h-8 text-sm"
                              min={0}
                              max={editType === 'percentage' ? 100 : undefined}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="メモ（任意）"
                              className="w-32 h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                disabled={savingMargin}
                                onClick={() => handleSaveMargin(client.tenantId)}
                              >
                                {savingMargin ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setEditingMargin(null)}
                              >
                                取消
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={client.tenantId}>
                        <TableCell className="font-medium">{client.tenantName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {margin?.marginType === 'fixed' ? '固定額' : '割合'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {margin?.marginType === 'fixed'
                            ? `¥${Number(margin.marginValue).toLocaleString()}`
                            : `${margin?.marginValue || '20'}%`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{margin?.notes || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {margin?.updatedAt ? new Date(margin.updatedAt).toLocaleDateString('ja-JP') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => startEditing(client)}
                          >
                            編集
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <CardContent>
                <EmptyState
                  illustration="generic"
                  title="クライアントがいません"
                  description="マージンを設定するにはまずクライアントを追加してください"
                />
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Commissions tab */}
        <TabsContent value="commissions" className="mt-4 space-y-4">
          {/* Commission summary */}
          {commissionSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="text-lg font-bold">¥{commissionSummary.totalEarned.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">累計コミッション</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-amber-500" />
                    <div>
                      <p className="text-lg font-bold">¥{commissionSummary.totalPending.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">未払い</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">¥{commissionSummary.totalPaid.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">支払い済み</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-purple-500" />
                    <div>
                      <p className="text-lg font-bold">{commissionSummary.totalClients}</p>
                      <p className="text-xs text-muted-foreground">対象クライアント</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">コミッション履歴</CardTitle>
                <HelpTip content="月ごとの各クライアントからのコミッション（手数料収入）の履歴です。ステータスが「確定」になると支払い対象になります" />
              </div>
              <CardDescription>月別のコミッション実績</CardDescription>
            </CardHeader>
            {commissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>期間</TableHead>
                    <TableHead>クライアント</TableHead>
                    <TableHead>クライアント売上</TableHead>
                    <TableHead>コミッション</TableHead>
                    <TableHead>マージン</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.period}</TableCell>
                      <TableCell className="text-sm">{c.clientName}</TableCell>
                      <TableCell className="text-sm">¥{c.clientRevenue.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-semibold text-green-600">¥{c.commissionAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.marginType === 'fixed' ? `¥${Number(c.marginValue).toLocaleString()}` : `${c.marginValue}%`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.status === 'paid' ? 'default' : c.status === 'confirmed' ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {c.status === 'paid' ? '支払済' : c.status === 'confirmed' ? '確定' : '未確定'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CardContent>
                <EmptyState
                  illustration="generic"
                  title="コミッション履歴がありません"
                  description="クライアントの月額利用が発生すると、ここにコミッション履歴が表示されます"
                />
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
