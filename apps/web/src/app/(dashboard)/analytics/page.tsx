'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import {
  BarChart3, Users, MessageSquare, ArrowUpRight, ArrowDownRight,
  Zap, TrendingUp, Radio, Calendar, RefreshCw, Eye, Route, Plus, Trash2, QrCode, Copy,
  Link2, ExternalLink, MousePointerClick, Target, ToggleLeft, ToggleRight,
  Clock, Tags, Activity, Download, Sparkles, Loader2, FileText,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '@/lib/api-client';
import type {
  ConversionGoalType, ConversionGoal, ConversionEvent,
  TrackedUrl, UrlClick, TrafficSource,
} from '@/lib/types';

// --- Analytics page local types ---
interface UsageData {
  messagesSent?: number;
  messagesLimit?: number;
  aiTokensUsed?: number;
  aiTokensLimit?: number;
  friendsLimit?: number;
}

interface DailyCount {
  date: string;
  count: number;
}

interface DeliveryEntry {
  accountId: string;
  botName?: string;
  status?: string;
  error?: string;
  broadcast?: number;
  apiBroadcast?: number;
  apiPush?: number;
  apiReply?: number;
  apiMulticast?: number;
  autoResponse?: number;
  welcomeResponse?: number;
  chat?: number;
}

interface TrafficSourceWithCount extends TrafficSource {
  actualFriendCount?: number;
}
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

export default function AnalyticsPage() {
  // The analytics overview API returns a different shape than AnalyticsOverview type
  const [stats, setStats] = useState<{
    friends?: { total?: number };
    messages?: { outbound?: number; inbound?: number };
    events?: { total?: number };
  } | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  // The daily API returns a different shape with dailyOutbound/dailyInbound/dailyFriends arrays
  const [daily, setDaily] = useState<{
    dailyOutbound?: DailyCount[];
    dailyInbound?: DailyCount[];
    dailyFriends?: DailyCount[];
  } | null>(null);
  // Broadcasts endpoint returns messages with status, scheduledAt, sentAt, createdAt
  const [broadcasts, setBroadcasts] = useState<Array<{
    id: string;
    content: { text?: string; [key: string]: unknown };
    status: string;
    sentAt: string | null;
    scheduledAt: string | null;
    createdAt: string;
  }>>([]);
  const [delivery, setDelivery] = useState<DeliveryEntry[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSourceWithCount[]>([]);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceUtmSource, setSourceUtmSource] = useState('');
  const [sourceUtmMedium, setSourceUtmMedium] = useState('');
  const [sourceUtmCampaign, setSourceUtmCampaign] = useState('');
  const [creatingSrc, setCreatingSrc] = useState(false);
  const [trackedUrls, setTrackedUrls] = useState<TrackedUrl[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<TrackedUrl | null>(null);
  const [urlClicks, setUrlClicks] = useState<UrlClick[]>([]);
  const [cvGoals, setCvGoals] = useState<ConversionGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<ConversionGoal | null>(null);
  const [goalEvents, setGoalEvents] = useState<ConversionEvent[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalType, setNewGoalType] = useState('custom');
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [creatingUrl, setCreatingUrl] = useState(false);
  const [showUrlForm, setShowUrlForm] = useState(false);
  // Cohort API returns an array of rows directly
  const [cohort, setCohort] = useState<Array<{
    cohortWeek: string;
    cohortSize: number;
    retention?: Array<{ week: number; rate: number }>;
  }> | null>(null);
  // KPI API returns a different shape
  const [kpi, setKpi] = useState<{
    totalFriends: number;
    newFriends?: { current: number; change?: number };
    messagesSent?: { current: number; change?: number };
    responses?: { current: number; change?: number };
  } | null>(null);
  // CTR API returns summary + daily data
  const [ctr, setCtr] = useState<{
    summary?: { totalClicks: number; totalSent: number; overallCtr: number; totalTrackedUrls: number };
    daily?: Array<{ date: string; clicks: number; urls: number }>;
  } | null>(null);
  // Segment API returns tag-based engagement data
  const [segmentData, setSegmentData] = useState<Array<{
    tagId: string;
    tagName: string;
    tagColor?: string;
    friendCount: number;
    outboundMessages: number;
    inboundMessages: number;
    responseRate: number;
  }>>([]);
  // Best send time API returns bestHours + hourly data
  const [bestSendTime, setBestSendTime] = useState<{
    bestHours?: Array<{ hour: number; responseRate: number; sentCount: number; responseCount: number }>;
    hourly?: Array<{ hour: number; responseRate: number; sentCount: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  // AI features
  const [aiTrafficInsights, setAiTrafficInsights] = useState<{ summary: string; insights: Array<{ title: string; description: string; actionable: string }> } | null>(null);
  const [aiTrafficLoading, setAiTrafficLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{ title: string; period: string; sections: Array<{ heading: string; content: string }>; recommendations: string[] } | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);

  useEffect(() => {
    let failCount = 0;
    const track = <T,>(fallback: T) => () => { failCount++; return fallback as T; };
    Promise.all([
      api.analytics.overview().catch(track(null)),
      api.billing.usage().catch(track(null)),
      api.analytics.daily(14).catch(track(null)),
      api.analytics.broadcasts().catch(track([])),
      api.analytics.trafficSources().catch(track([])),
      api.urlTracking.list().catch(track([])),
      api.conversions.listGoals().catch(track([])),
      api.analytics.cohort().catch(track(null)),
      api.analytics.kpi().catch(track(null)),
      api.analytics.ctr().catch(track(null)),
      api.analytics.segments().catch(track([])),
      api.analytics.bestSendTime().catch(track(null)),
    ])
      .then(([s, u, d, b, ts, urls, goals, ch, k, ct, seg, bst]) => {
        if (failCount > 0) toast.error('一部のアナリティクスデータの読み込みに失敗しました');
        setStats(s as typeof stats);
        setUsage(u as typeof usage);
        setDaily(d as typeof daily);
        setBroadcasts(Array.isArray(b) ? (b as typeof broadcasts) : []);
        setTrafficSources(Array.isArray(ts) ? (ts as TrafficSourceWithCount[]) : []);
        setTrackedUrls(Array.isArray(urls) ? urls : []);
        setCvGoals(Array.isArray(goals) ? goals : []);
        setCohort(ch as typeof cohort);
        setKpi(k as typeof kpi);
        setCtr(ct as typeof ctr);
        setSegmentData(Array.isArray(seg) ? (seg as typeof segmentData) : []);
        setBestSendTime(bst as typeof bestSendTime);
      })
      .finally(() => setLoading(false));
  }, []);

  async function fetchDelivery() {
    setLoadingDelivery(true);
    try {
      const dateStr = deliveryDate.replace(/-/g, '');
      const data = await api.analytics.delivery(dateStr);
      setDelivery(Array.isArray(data) ? (data as unknown as DeliveryEntry[]) : []);
    } catch {
      toast.error('配信実績の読み込みに失敗しました');
      setDelivery([]);
    } finally {
      setLoadingDelivery(false);
    }
  }

  if (loading) {
    return <PageSkeleton />;
  }

  const msgTotal = (stats?.messages?.outbound || 0) + (stats?.messages?.inbound || 0);
  const outboundPct = msgTotal > 0 ? ((stats?.messages?.outbound || 0) / msgTotal) * 100 : 0;
  const inboundPct = msgTotal > 0 ? ((stats?.messages?.inbound || 0) / msgTotal) * 100 : 0;

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">分析</h1>
          <p className="text-sm text-muted-foreground">過去30日間のパフォーマンス</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            try {
              const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';
              const res = await fetch(`${API_BASE}/api/v1/analytics/daily/export/csv`, { credentials: 'include' });
              if (!res.ok) throw new Error('エクスポートに失敗しました');
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('CSVをダウンロードしました');
            } catch {
              toast.error('CSVエクスポートに失敗しました');
            }
          }}
        >
          <Download className="h-4 w-4" />
          CSVエクスポート
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={aiReportLoading}
          onClick={async () => {
            setAiReportLoading(true);
            try {
              const result = await api.ai.generateReport('weekly');
              setAiReport(result);
            } catch {
              toast.error('AIレポート生成に失敗しました');
            } finally {
              setAiReportLoading(false);
            }
          }}
        >
          {aiReportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AIレポート
        </Button>
      </div>

      {/* AI Report */}
      {aiReport && (
        <Card className="border-[#06C755]/30 bg-[#06C755]/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#06C755]" />
                {aiReport.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{aiReport.period}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setAiReport(null)}>✕</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiReport.sections.map((section, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold mb-1">{section.heading}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
            {aiReport.recommendations.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#06C755]" />
                  改善アクション
                </h4>
                <ul className="space-y-1.5">
                  {aiReport.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-[#06C755] font-bold mt-0.5">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <TabsTrigger value="url-tracking" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            URL測定
          </TabsTrigger>
          <TabsTrigger value="conversions" className="gap-1.5">
            <Target className="h-4 w-4" />
            CV
          </TabsTrigger>
          <TabsTrigger value="cohort" className="gap-1.5">
            <Activity className="h-4 w-4" />
            コホート
          </TabsTrigger>
          <TabsTrigger value="engagement" className="gap-1.5">
            <Tags className="h-4 w-4" />
            エンゲージメント
          </TabsTrigger>
          <TabsTrigger value="send-time" className="gap-1.5">
            <Clock className="h-4 w-4" />
            配信最適化
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">配信履歴</CardTitle>
                  <CardDescription>一斉配信・予約配信の送信履歴</CardDescription>
                </div>
                {broadcasts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={async () => {
                      try {
                        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';
                        const res = await fetch(`${API_BASE}/api/v1/analytics/broadcasts/export/csv`, { credentials: 'include' });
                        if (!res.ok) throw new Error();
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `broadcasts_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('CSVをダウンロードしました');
                      } catch {
                        toast.error('CSVエクスポートに失敗しました');
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {broadcasts.length === 0 ? (
                <EmptyState
                  illustration="messages"
                  title="配信履歴がありません"
                  description="メッセージページから一斉配信を送信しましょう"
                />
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
                      const text = b.content?.text || JSON.stringify(b.content);
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={aiTrafficLoading}
                onClick={async () => {
                  setAiTrafficLoading(true);
                  try {
                    const result = await api.ai.analyzeTraffic();
                    setAiTrafficInsights(result);
                  } catch {
                    toast.error('AI流入分析に失敗しました');
                  } finally {
                    setAiTrafficLoading(false);
                  }
                }}
              >
                {aiTrafficLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI分析
              </Button>
              <Button onClick={() => setShowSourceForm(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                経路を追加
              </Button>
            </div>
          </div>

          {/* AI Traffic Insights */}
          {aiTrafficInsights && (
            <Card className="border-[#06C755]/30 bg-[#06C755]/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#06C755]" />
                    AI流入分析
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setAiTrafficInsights(null)}>✕</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{aiTrafficInsights.summary}</p>
                <div className="space-y-3">
                  {aiTrafficInsights.insights.map((insight, i) => (
                    <div key={i} className="rounded-lg border bg-background p-3">
                      <h4 className="text-sm font-semibold mb-1">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                      <p className="text-xs font-medium text-[#06C755] flex items-start gap-1.5">
                        <span className="mt-0.5">→</span>
                        {insight.actionable}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                      setTrafficSources((prev) => [...prev, { ...(src as TrafficSource), actualFriendCount: 0 }]);
                      setSourceName('');
                      setSourceUtmSource('');
                      setSourceUtmMedium('');
                      setSourceUtmCampaign('');
                      setShowSourceForm(false);
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : '作成に失敗しました');
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
                                aria-label="コピー"
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
                                } catch (err: unknown) {
                                  toast.error(err instanceof Error ? err.message : '削除に失敗しました');
                                }
                              }}
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

        {/* Conversions tab */}
        <TabsContent value="conversions" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">コンバージョン目標</CardTitle>
                <CardDescription className="text-xs">フォーム回答・予約完了・クーポン利用などの成果を計測</CardDescription>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setShowGoalForm(!showGoalForm)}>
                <Plus className="h-4 w-4" />
                目標追加
              </Button>
            </CardHeader>
            <CardContent>
              {showGoalForm && (
                <div className="flex gap-2 mb-4 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">目標名</label>
                    <Input placeholder="例: お問い合わせフォーム回答" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} />
                  </div>
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground mb-1 block">種別</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={newGoalType}
                      onChange={(e) => setNewGoalType(e.target.value)}
                    >
                      <option value="form_response">フォーム回答</option>
                      <option value="reservation_complete">予約完了</option>
                      <option value="coupon_used">クーポン利用</option>
                      <option value="url_click">URLクリック</option>
                      <option value="custom">カスタム</option>
                    </select>
                  </div>
                  <Button
                    size="sm"
                    disabled={!newGoalName.trim() || creatingGoal}
                    onClick={async () => {
                      setCreatingGoal(true);
                      try {
                        const goal = await api.conversions.createGoal({ name: newGoalName.trim(), type: newGoalType as ConversionGoalType });
                        setCvGoals((prev) => [goal, ...prev]);
                        setNewGoalName('');
                        setShowGoalForm(false);
                        toast.success('コンバージョン目標を作成しました');
                      } catch {
                        toast.error('目標作成に失敗しました');
                      } finally {
                        setCreatingGoal(false);
                      }
                    }}
                  >
                    作成
                  </Button>
                </div>
              )}

              {cvGoals.length === 0 ? (
                <EmptyState
                  illustration="analytics"
                  title="コンバージョン目標がありません"
                  description="「目標追加」からフォーム回答や予約完了などの成果指標を設定しましょう"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>目標名</TableHead>
                      <TableHead className="w-28">種別</TableHead>
                      <TableHead className="w-20 text-center">CV数</TableHead>
                      <TableHead className="w-20 text-center">状態</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cvGoals.map((goal) => {
                      const typeLabels: Record<string, string> = {
                        form_response: 'フォーム',
                        reservation_complete: '予約',
                        coupon_used: 'クーポン',
                        url_click: 'URL',
                        custom: 'カスタム',
                      };
                      return (
                        <TableRow
                          key={goal.id}
                          className={selectedGoal?.id === goal.id ? 'bg-muted/50' : 'cursor-pointer hover:bg-muted/30'}
                          onClick={async () => {
                            setSelectedGoal(goal);
                            try {
                              const events = await api.conversions.getGoalEvents(goal.id);
                              setGoalEvents(Array.isArray(events) ? events : []);
                            } catch {
                              setGoalEvents([]);
                            }
                          }}
                        >
                          <TableCell className="font-medium text-sm">{goal.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{typeLabels[goal.type] || goal.type}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="gap-1">
                              <Target className="h-3 w-3" />
                              {goal.conversionCount ?? 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const updated = await api.conversions.updateGoal(goal.id, { isActive: !goal.isActive });
                                  setCvGoals((prev) => prev.map((g) => g.id === goal.id ? updated : g));
                                  toast.success(updated.isActive ? '目標を有効化しました' : '目標を無効化しました');
                                } catch {
                                  toast.error('更新に失敗しました');
                                }
                              }}
                              title={goal.isActive ? '無効化' : '有効化'}
                              aria-label="有効/無効切替"
                            >
                              {goal.isActive ? (
                                <ToggleRight className="h-5 w-5 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm('この目標を削除しますか？')) return;
                                try {
                                  await api.conversions.deleteGoal(goal.id);
                                  setCvGoals((prev) => prev.filter((g) => g.id !== goal.id));
                                  if (selectedGoal?.id === goal.id) setSelectedGoal(null);
                                  toast.success('目標を削除しました');
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
              )}
            </CardContent>
          </Card>

          {/* CV Events detail panel */}
          {selectedGoal && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  CV詳細: {selectedGoal.name}
                </CardTitle>
                <CardDescription className="text-xs">合計 {selectedGoal.conversionCount ?? 0} 件のコンバージョン</CardDescription>
              </CardHeader>
              <CardContent>
                {goalEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">まだコンバージョンがありません</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日時</TableHead>
                        <TableHead>友だち</TableHead>
                        <TableHead>経路</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goalEvents.slice(0, 50).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-xs">
                            {new Date(event.convertedAt).toLocaleString('ja-JP')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {event.friendId ? (
                              <Badge variant="outline" className="text-[10px]">ID: {event.friendId.slice(0, 8)}</Badge>
                            ) : (
                              <span className="text-muted-foreground">不明</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {event.trackedUrlId ? (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Link2 className="h-2.5 w-2.5" />
                                URL経由
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">直接</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* URL Tracking tab */}
        <TabsContent value="url-tracking" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">URLクリック測定</CardTitle>
                <CardDescription className="text-xs">配信メッセージ内のURLクリック数を計測</CardDescription>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setShowUrlForm(!showUrlForm)}>
                <Plus className="h-4 w-4" />
                URL追加
              </Button>
            </CardHeader>
            <CardContent>
              {showUrlForm && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="https://example.com/page"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={!newUrl.trim() || creatingUrl}
                    onClick={async () => {
                      setCreatingUrl(true);
                      try {
                        const created = await api.urlTracking.create(newUrl.trim());
                        setTrackedUrls((prev) => [created, ...prev]);
                        setNewUrl('');
                        setShowUrlForm(false);
                        toast.success('トラッキングURLを作成しました');
                      } catch {
                        toast.error('URL作成に失敗しました');
                      } finally {
                        setCreatingUrl(false);
                      }
                    }}
                  >
                    作成
                  </Button>
                </div>
              )}

              {trackedUrls.length === 0 ? (
                <EmptyState
                  illustration="analytics"
                  title="トラッキングURLがありません"
                  description="「URL追加」からクリック計測用URLを作成しましょう"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead className="w-24 text-center">クリック数</TableHead>
                      <TableHead className="w-32">作成日</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackedUrls.map((url) => (
                      <TableRow
                        key={url.id}
                        className={selectedUrl?.id === url.id ? 'bg-muted/50' : 'cursor-pointer hover:bg-muted/30'}
                        onClick={async () => {
                          setSelectedUrl(url);
                          try {
                            const clicks = await api.urlTracking.getClicks(url.id);
                            setUrlClicks(Array.isArray(clicks) ? clicks : []);
                          } catch {
                            setUrlClicks([]);
                          }
                        }}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{url.originalUrl}</p>
                            <div className="flex items-center gap-1.5">
                              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">/t/{url.shortCode}</code>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const trackingUrl = `${window.location.origin}/t/${url.shortCode}`;
                                  navigator.clipboard.writeText(trackingUrl);
                                  toast.success('トラッキングURLをコピーしました');
                                }}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="コピー"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="gap-1">
                            <MousePointerClick className="h-3 w-3" />
                            {url.clickCount ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(url.createdAt).toLocaleDateString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <a
                            href={url.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="外部リンク"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Click detail panel */}
          {selectedUrl && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4" />
                  クリック詳細: {selectedUrl.shortCode}
                </CardTitle>
                <CardDescription className="text-xs truncate">{selectedUrl.originalUrl}</CardDescription>
              </CardHeader>
              <CardContent>
                {urlClicks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">まだクリックされていません</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日時</TableHead>
                        <TableHead>友だち</TableHead>
                        <TableHead>デバイス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {urlClicks.slice(0, 50).map((click) => (
                        <TableRow key={click.id}>
                          <TableCell className="text-xs">
                            {new Date(click.clickedAt).toLocaleString('ja-JP')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {click.friendId ? (
                              <Badge variant="outline" className="text-[10px]">ID: {click.friendId.slice(0, 8)}</Badge>
                            ) : (
                              <span className="text-muted-foreground">不明</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {click.userAgent ? parseUA(click.userAgent) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {/* Cohort tab */}
        <TabsContent value="cohort" className="mt-4 space-y-6">
          {/* KPI Cards */}
          {kpi && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="友だち数" value={kpi.totalFriends} />
              <KpiCard label="新規友だち (今月)" value={kpi.newFriends?.current} change={kpi.newFriends?.change} />
              <KpiCard label="配信数 (今月)" value={kpi.messagesSent?.current} change={kpi.messagesSent?.change} />
              <KpiCard label="応答数 (今月)" value={kpi.responses?.current} change={kpi.responses?.change} />
            </div>
          )}

          {/* Cohort Retention Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">週次コホートリテンション</CardTitle>
              <CardDescription>友だち追加週ごとの継続率（過去8週）</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(cohort) && cohort.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">追加週</th>
                        <th className="text-center py-2 px-2 text-muted-foreground font-medium">人数</th>
                        {[0, 1, 2, 3, 4].map(w => (
                          <th key={w} className="text-center py-2 px-2 text-muted-foreground font-medium">W{w}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohort.map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                            {new Date(row.cohortWeek).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}〜
                          </td>
                          <td className="text-center py-2 px-2 font-medium">{row.cohortSize}</td>
                          {[0, 1, 2, 3, 4].map(w => {
                            const r = row.retention?.find((x) => x.week === w);
                            const rate = r?.rate ?? null;
                            return (
                              <td key={w} className="text-center py-2 px-2">
                                {rate !== null ? (
                                  <span
                                    className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                                    style={{
                                      backgroundColor: `rgba(6, 199, 85, ${Math.min(rate / 100, 1) * 0.6 + 0.05})`,
                                      color: rate > 50 ? '#fff' : '#166534',
                                    }}
                                  >
                                    {rate.toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">コホートデータがまだありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement tab */}
        <TabsContent value="engagement" className="mt-4 space-y-6">
          {/* CTR Summary */}
          {ctr?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={<MousePointerClick className="h-8 w-8 text-blue-500" />} value={ctr.summary.totalClicks} label="総クリック数" />
              <MetricCard icon={<MessageSquare className="h-8 w-8 text-green-500" />} value={ctr.summary.totalSent} label="総配信数" />
              <Card className="linq-card-hover">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">疑似CTR</span>
                    <TrendingUp className="h-8 w-8 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{ctr.summary.overallCtr}%</p>
                </CardContent>
              </Card>
              <MetricCard icon={<Link2 className="h-8 w-8 text-purple-500" />} value={ctr.summary.totalTrackedUrls} label="追跡URL数" />
            </div>
          )}

          {/* CTR Daily Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">日別クリック推移</CardTitle>
              <CardDescription>追跡URLのクリック数（過去30日）</CardDescription>
            </CardHeader>
            <CardContent>
              {ctr?.daily && ctr.daily.length > 0 ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={ctr.daily.map((d: { date: string; clicks: number; urls: number }) => ({
                        date: new Date(d.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
                        クリック: d.clicks,
                        URL数: d.urls,
                      }))}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Area type="monotone" dataKey="クリック" stroke="#3B82F6" strokeWidth={2} fill="url(#gradClicks)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MousePointerClick className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">クリックデータがまだありません</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Segment Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">タグ別エンゲージメント</CardTitle>
              <CardDescription>タグごとの友だち数・応答率を比較</CardDescription>
            </CardHeader>
            <CardContent>
              {segmentData.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={segmentData.map((s) => ({
                          name: s.tagName.length > 8 ? s.tagName.slice(0, 8) + '…' : s.tagName,
                          友だち数: s.friendCount,
                          応答率: s.responseRate,
                        }))}
                        margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="left" dataKey="友だち数" fill="#06C755" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="応答率" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Segment table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>タグ</TableHead>
                        <TableHead className="text-right">友だち数</TableHead>
                        <TableHead className="text-right">送信数</TableHead>
                        <TableHead className="text-right">受信数</TableHead>
                        <TableHead className="text-right">応答率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segmentData.map((s) => (
                        <TableRow key={s.tagId}>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.tagColor || '#94a3b8' }} />
                              {s.tagName}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{s.friendCount}</TableCell>
                          <TableCell className="text-right">{s.outboundMessages}</TableCell>
                          <TableCell className="text-right">{s.inboundMessages}</TableCell>
                          <TableCell className="text-right font-medium">{s.responseRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Tags className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">タグデータがまだありません</p>
                  <p className="text-xs text-muted-foreground mt-1">友だちにタグを付けると、セグメント別の分析ができます</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Time Optimization tab */}
        <TabsContent value="send-time" className="mt-4 space-y-6">
          {/* Best hours highlight */}
          {bestSendTime?.bestHours && bestSendTime.bestHours.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bestSendTime.bestHours.map((h: { hour: number; responseRate: number; sentCount: number; responseCount: number }, i: number) => (
                <Card key={i} className={i === 0 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : ''}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {i === 0 ? 'ベストタイム' : `${i + 1}位`}
                      </span>
                      <Clock className={`h-6 w-6 ${i === 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </div>
                    <p className="text-3xl font-bold tracking-tight">{h.hour}:00</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      応答率 <span className="font-semibold text-foreground">{h.responseRate.toFixed(1)}%</span>
                      <span className="ml-2">({h.sentCount}配信 → {h.responseCount}応答)</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Hourly response rate chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">時間帯別応答率</CardTitle>
              <CardDescription>配信時間帯ごとの24時間以内の応答率（過去30日）</CardDescription>
            </CardHeader>
            <CardContent>
              {bestSendTime?.hourly && bestSendTime.hourly.length > 0 ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bestSendTime.hourly.map((h: { hour: number; responseRate: number; sentCount: number }) => ({
                        時間: `${h.hour}時`,
                        応答率: h.responseRate,
                        配信数: h.sentCount,
                      }))}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="時間" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={1} />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                        formatter={(value, name) => [
                          name === '応答率' ? `${value}%` : value,
                          name,
                        ]}
                      />
                      <Bar
                        dataKey="応答率"
                        radius={[4, 4, 0, 0]}
                        fill="#06C755"
                      >
                        {bestSendTime.hourly.map((h: { hour: number; responseRate: number; sentCount: number }, idx: number) => {
                          const isBest = bestSendTime.bestHours?.some((b) => b.hour === h.hour);
                          return <Cell key={idx} fill={isBest ? '#06C755' : '#94a3b8'} fillOpacity={isBest ? 1 : 0.4} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">配信データがまだありません</p>
                  <p className="text-xs text-muted-foreground mt-1">メッセージを配信すると、最適な時間帯を分析できます</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

/* KPI Card with month-over-month change */
function KpiCard({ label, value, change }: { label: string; value?: number; change?: number }) {
  return (
    <Card className="linq-card-hover">
      <CardContent className="pt-5 pb-4">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <p className="text-2xl font-bold tracking-tight mt-1">{(value ?? 0).toLocaleString()}</p>
        {change !== undefined && (
          <p className={`text-xs mt-1 flex items-center gap-0.5 ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change)}% 前月比
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Parse user agent string to a short device description */
function parseUA(ua: string): string {
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Linux')) return 'Linux';
  return ua.slice(0, 30);
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

function DailyChart({ outbound, inbound, days }: { outbound: DailyCount[]; inbound: DailyCount[]; days: number }) {
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

function FriendsChart({ data, days }: { data: DailyCount[]; days: number }) {
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
