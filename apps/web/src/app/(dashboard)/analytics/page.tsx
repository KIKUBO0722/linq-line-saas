'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import {
  BarChart3, Users, MessageSquare, ArrowUpRight, ArrowDownRight,
  Zap, TrendingUp, Radio, Calendar, RefreshCw, Eye, Route, Plus, Trash2, QrCode, Copy,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceUtmSource, setSourceUtmSource] = useState('');
  const [sourceUtmMedium, setSourceUtmMedium] = useState('');
  const [sourceUtmCampaign, setSourceUtmCampaign] = useState('');
  const [creatingSrc, setCreatingSrc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  useEffect(() => {
    Promise.all([
      api.analytics.overview().catch(() => null),
      api.billing.usage().catch(() => null),
      api.analytics.daily(14).catch(() => null),
      api.analytics.broadcasts().catch(() => []),
      api.analytics.trafficSources().catch(() => []),
    ])
      .then(([s, u, d, b, ts]) => {
        setStats(s);
        setUsage(u);
        setDaily(d);
        setBroadcasts(Array.isArray(b) ? b : []);
        setTrafficSources(Array.isArray(ts) ? ts : []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function fetchDelivery() {
    setLoadingDelivery(true);
    try {
      const dateStr = deliveryDate.replace(/-/g, '');
      const data = await api.analytics.delivery(dateStr);
      setDelivery(Array.isArray(data) ? data : []);
    } catch {
      setDelivery([]);
    } finally {
      setLoadingDelivery(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const msgTotal = (stats?.messages?.outbound || 0) + (stats?.messages?.inbound || 0);
  const outboundPct = msgTotal > 0 ? ((stats?.messages?.outbound || 0) / msgTotal) * 100 : 0;
  const inboundPct = msgTotal > 0 ? ((stats?.messages?.inbound || 0) / msgTotal) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">分析</h1>
        <p className="text-sm text-muted-foreground">過去30日間のパフォーマンス</p>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={<Users className="h-8 w-8 text-blue-500" />} value={stats?.friends?.total || 0} label="友だち数" />
        <MetricCard icon={<ArrowUpRight className="h-8 w-8 text-green-500" />} value={stats?.messages?.outbound || 0} label="配信数 (送信)" />
        <MetricCard icon={<ArrowDownRight className="h-8 w-8 text-purple-500" />} value={stats?.messages?.inbound || 0} label="受信数" />
        <MetricCard icon={<BarChart3 className="h-8 w-8 text-amber-500" />} value={stats?.events?.total || 0} label="Webhookイベント" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            概要
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            日別推移
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="gap-1.5">
            <Radio className="h-4 w-4" />
            配信履歴
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-1.5">
            <Eye className="h-4 w-4" />
            配信到達
          </TabsTrigger>
          <TabsTrigger value="traffic" className="gap-1.5">
            <Route className="h-4 w-4" />
            流入経路
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">メッセージ内訳</CardTitle>
                <span className="text-sm font-medium">合計 {msgTotal.toLocaleString()}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="h-[140px] w-[140px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '送信', value: stats?.messages?.outbound || 0 },
                          { name: '受信', value: stats?.messages?.inbound || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        <Cell fill="#06C755" />
                        <Cell fill="#8B5CF6" />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4">
                  <ProgressBar label="送信メッセージ" value={stats?.messages?.outbound || 0} percentage={outboundPct} color="#06C755" />
                  <ProgressBar label="受信メッセージ" value={stats?.messages?.inbound || 0} percentage={inboundPct} color="#8B5CF6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">今月の利用状況</CardTitle>
            </CardHeader>
            <CardContent>
              {usage ? (
                <div className="space-y-4">
                  <UsageBar label="メッセージ送信" used={usage.messagesSent || 0} limit={usage.messagesLimit} icon={<MessageSquare className="h-4 w-4 text-blue-500" />} />
                  <UsageBar label="AI応答" used={usage.aiTokensUsed || 0} limit={usage.aiTokensLimit} icon={<Zap className="h-4 w-4 text-yellow-500" />} />
                  <UsageBar label="友だち数" used={stats?.friends?.total || 0} limit={usage.friendsLimit} icon={<Users className="h-4 w-4 text-green-500" />} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">利用データがまだありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily tab */}
        <TabsContent value="daily" className="mt-4 space-y-6">
          {daily ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">日別メッセージ推移 (過去14日)</CardTitle>
                </CardHeader>
                <CardContent>
                  <DailyChart
                    outbound={daily.dailyOutbound || []}
                    inbound={daily.dailyInbound || []}
                    days={14}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">友だち追加推移 (過去14日)</CardTitle>
                </CardHeader>
                <CardContent>
                  <FriendsChart data={daily.dailyFriends || []} days={14} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">日別データがまだありません</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Broadcasts tab */}
        <TabsContent value="broadcasts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">配信履歴</CardTitle>
              <CardDescription>一斉配信・予約配信の送信履歴</CardDescription>
            </CardHeader>
            <CardContent>
              {broadcasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Radio className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">配信履歴がありません</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>配信内容</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>配信日時</TableHead>
                      <TableHead>作成日時</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.map((b) => {
                      const text = (b.content as any)?.text || JSON.stringify(b.content);
                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            <p className="text-sm max-w-[300px] truncate">{text}</p>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={b.status} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {b.sentAt
                              ? formatDateTime(b.sentAt)
                              : b.scheduledAt
                                ? `予約: ${formatDateTime(b.scheduledAt)}`
                                : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(b.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Insight tab */}
        <TabsContent value="delivery" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LINE配信到達統計</CardTitle>
              <CardDescription>
                LINE Insight APIから取得した配信到達データ（前日以前のデータが取得可能）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-auto"
                  max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
                />
                <Button onClick={fetchDelivery} disabled={loadingDelivery} size="sm" className="gap-1.5">
                  {loadingDelivery ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  取得
                </Button>
              </div>

              {delivery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    日付を選択して「取得」をクリックしてください
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    LINE Insight APIの仕様上、前日以前のデータのみ取得可能です
                  </p>
                </div>
              ) : (
                delivery.map((d) => (
                  <Card key={d.accountId} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{d.botName || 'LINE Bot'}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {deliveryDate}
                        </span>
                        {d.status === 'error' && (
                          <Badge variant="destructive">エラー</Badge>
                        )}
                      </div>
                      {d.status === 'error' ? (
                        <p className="text-sm text-destructive">{d.error}</p>
                      ) : d.status === 'out_of_service' ? (
                        <p className="text-sm text-muted-foreground">この日の配信データはありません</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <DeliveryStat label="一斉配信" value={d.broadcast} />
                          <DeliveryStat label="API配信" value={d.apiBroadcast} />
                          <DeliveryStat label="API Push" value={d.apiPush} />
                          <DeliveryStat label="API Reply" value={d.apiReply} />
                          <DeliveryStat label="API Multicast" value={d.apiMulticast} />
                          <DeliveryStat label="自動応答" value={d.autoResponse} />
                          <DeliveryStat label="あいさつ" value={d.welcomeResponse} />
                          <DeliveryStat label="チャット" value={d.chat} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traffic Sources tab */}
        <TabsContent value="traffic" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">友だち追加の流入経路を追跡・分析します</p>
            <Button onClick={() => setShowSourceForm(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              経路を追加
            </Button>
          </div>

          {showSourceForm && (
            <Card>
              <CardContent className="pt-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!sourceName.trim()) return;
                    setCreatingSrc(true);
                    try {
                      const src = await api.analytics.createTrafficSource({
                        name: sourceName.trim(),
                        utmSource: sourceUtmSource.trim() || undefined,
                        utmMedium: sourceUtmMedium.trim() || undefined,
                        utmCampaign: sourceUtmCampaign.trim() || undefined,
                      });
                      setTrafficSources((prev) => [...prev, { ...(src as any), actualFriendCount: 0 }]);
                      setSourceName('');
                      setSourceUtmSource('');
                      setSourceUtmMedium('');
                      setSourceUtmCampaign('');
                      setShowSourceForm(false);
                    } catch (err: any) {
                      toast.error(err.message || '作成に失敗しました');
                    } finally {
                      setCreatingSrc(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">経路名</label>
                      <Input
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                        placeholder="例: 店頭QR, Instagram広告"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">UTM Source</label>
                      <Input
                        value={sourceUtmSource}
                        onChange={(e) => setSourceUtmSource(e.target.value)}
                        placeholder="例: instagram, flyer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">UTM Medium</label>
                      <Input
                        value={sourceUtmMedium}
                        onChange={(e) => setSourceUtmMedium(e.target.value)}
                        placeholder="例: social, print"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">UTM Campaign</label>
                      <Input
                        value={sourceUtmCampaign}
                        onChange={(e) => setSourceUtmCampaign(e.target.value)}
                        placeholder="例: spring_2026"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creatingSrc || !sourceName.trim()}>
                      {creatingSrc ? '作成中...' : '追加'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowSourceForm(false)}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">流入経路一覧</CardTitle>
              <CardDescription>各経路からの友だち追加数を確認できます</CardDescription>
            </CardHeader>
            <CardContent>
              {trafficSources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Route className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">流入経路がまだ登録されていません</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">「経路を追加」から最初の経路を作成しましょう</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>経路名</TableHead>
                      <TableHead>トラッキングコード</TableHead>
                      <TableHead>UTMパラメータ</TableHead>
                      <TableHead className="text-right">友だち数</TableHead>
                      <TableHead className="w-[80px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trafficSources.map((src) => {
                      const utmP = src.utmParams || {};
                      return (
                        <TableRow key={src.id}>
                          <TableCell className="font-medium">{src.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{src.code}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(src.code);
                                }}
                                className="text-muted-foreground hover:text-foreground"
                                title="コピー"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {[utmP.utm_source, utmP.utm_medium, utmP.utm_campaign].filter(Boolean).join(' / ') || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="font-mono">
                              {src.actualFriendCount ?? src.friendCount ?? 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!confirm('この経路を削除しますか？')) return;
                                try {
                                  await api.analytics.deleteTrafficSource(src.id);
                                  setTrafficSources((prev) => prev.filter((s) => s.id !== src.id));
                                } catch (err: any) {
                                  toast.error(err.message || '削除に失敗しました');
                                }
                              }}
                              className="text-destructive hover:text-destructive"
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

          {trafficSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">経路別友だち数</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const maxCount = Math.max(1, ...trafficSources.map((s) => s.actualFriendCount ?? s.friendCount ?? 0));
                  return (
                    <div className="space-y-2">
                      {trafficSources.map((src) => {
                        const cnt = src.actualFriendCount ?? src.friendCount ?? 0;
                        return (
                          <div key={src.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{src.name}</span>
                              <span className="font-medium">{cnt}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-blue-500 transition-all"
                                style={{ width: `${Math.max(cnt > 0 ? 2 : 0, (cnt / maxCount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ icon, value, label, trend, color }: { icon: React.ReactNode; value: number; label: string; trend?: number; color?: string }) {
  return (
    <Card className="linq-card-hover">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
        {trend !== undefined && (
          <p className={`text-xs mt-1 flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}% 前週比
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, value, percentage, color }: { label: string; value: number; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toLocaleString()}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-300" style={{ background: color, width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit, icon }: { label: string; used: number; limit?: number; icon: React.ReactNode }) {
  const percentage = limit ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = limit && percentage > 80;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
        <span className="font-medium">
          {used.toLocaleString()} {limit ? `/ ${limit.toLocaleString()}` : ''}
        </span>
      </div>
      {limit && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              background: isWarning ? 'hsl(var(--destructive))' : '#3B82F6',
            }}
          />
        </div>
      )}
    </div>
  );
}

function DailyChart({ outbound, inbound, days }: { outbound: any[]; inbound: any[]; days: number }) {
  const dateMap = new Map<string, { out: number; in: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dateMap.set(d.toISOString().slice(0, 10), { out: 0, in: 0 });
  }
  outbound.forEach((d) => { const e = dateMap.get(d.date); if (e) e.out = d.count; });
  inbound.forEach((d) => { const e = dateMap.get(d.date); if (e) e.in = d.count; });

  const chartData = Array.from(dateMap.entries()).map(([date, vals]) => ({
    date: new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
    送信: vals.out,
    受信: vals.in,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06C755" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06C755" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area type="monotone" dataKey="送信" stroke="#06C755" strokeWidth={2} fill="url(#gradOut)" />
          <Area type="monotone" dataKey="受信" stroke="#8B5CF6" strokeWidth={2} fill="url(#gradIn)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FriendsChart({ data, days }: { data: any[]; days: number }) {
  const dateMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dateMap.set(d.toISOString().slice(0, 10), 0);
  }
  data.forEach((d) => dateMap.set(d.date, d.count));

  const chartData = Array.from(dateMap.entries()).map(([date, count]) => ({
    date: new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
    追加: count,
  }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="追加" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">配信済み</Badge>;
    case 'scheduled':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">予約中</Badge>;
    case 'failed':
      return <Badge variant="destructive">失敗</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function DeliveryStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="bg-background rounded-lg p-3 text-center">
      <p className="text-lg font-bold">{(value ?? 0).toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('ja-JP')} ${d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
}
