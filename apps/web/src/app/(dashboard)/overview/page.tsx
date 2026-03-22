'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import {
  Users, MessageSquare, Bot, ArrowRight, Sparkles, Wand2, Check, Loader2,
  Send, FileText, Menu, Settings, UserPlus, Bell, ChevronRight, GitBranch,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';

interface SetupItem {
  key: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export default function OverviewPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [recentFriends, setRecentFriends] = useState<any[]>([]);

  // Onboarding wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    industry: '',
    location: '',
    target: '',
    challenge: '',
    hours: '',
    menu: '',
  });
  const [wizardResult, setWizardResult] = useState<any>(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardApplied, setWizardApplied] = useState(false);

  useEffect(() => {
    api.friends.list({ limit: 5 }).then(setRecentFriends).catch(() => { console.warn('最近の友だち取得に失敗'); });
    api.friends.list({}).then((f: any) => { setFriends(f); }).catch(() => { console.warn('友だち一覧取得に失敗'); });
    api.accounts.list().then(setAccounts).catch(() => { console.warn('アカウント一覧取得に失敗'); });
    api.analytics.overview().then(setStats).catch(() => { console.warn('統計情報取得に失敗'); });
    api.billing.usage().then(setUsage).catch(() => { console.warn('利用状況取得に失敗'); });
    fetch(`${API_BASE}/api/v1/ai/config`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setAiConfig)
      .catch(() => { console.warn('AI設定取得に失敗'); });
  }, []);

  async function handleWizardGenerate() {
    setWizardLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/onboarding`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardData),
      });
      const data = await res.json();
      setWizardResult(data);
      setWizardStep(2);
    } catch {
      toast.error('AI生成に失敗しました');
    } finally {
      setWizardLoading(false);
    }
  }

  async function handleApplyResult() {
    if (!wizardResult) return;
    setWizardLoading(true);
    try {
      const configPayload: any = {};
      if (wizardResult.aiPrompt) configPayload.systemPrompt = wizardResult.aiPrompt;
      if (wizardResult.welcomeMessage) configPayload.welcomeMessage = wizardResult.welcomeMessage;
      if (wizardResult.knowledgeBase) configPayload.knowledgeBase = wizardResult.knowledgeBase;
      configPayload.autoReplyEnabled = true;

      await fetch(`${API_BASE}/api/v1/ai/config`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });

      if (wizardResult.suggestedTags?.length) {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        for (let i = 0; i < wizardResult.suggestedTags.length; i++) {
          try {
            await api.tags.create({ name: wizardResult.suggestedTags[i], color: colors[i % colors.length] });
          } catch {}
        }
      }

      // Auto-create step delivery scenario if AI generated one
      if (wizardResult.scenario?.steps?.length) {
        try {
          await fetch(`${API_BASE}/api/v1/ai/execute-action`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'create_scenario',
              data: {
                name: wizardResult.scenario.name || 'ウェルカムシナリオ',
                description: wizardResult.scenario.description || 'AIが生成した友だち追加後のステップ配信',
                triggerType: 'follow',
                steps: wizardResult.scenario.steps,
              },
            }),
          });
        } catch {}
      }

      setWizardApplied(true);
    } catch {
      toast.error('設定の適用に失敗しました');
    } finally {
      setWizardLoading(false);
    }
  }

  const friendCount = stats?.friends?.total ?? friends.length;
  const hasAccount = accounts.length > 0;
  const hasWelcome = !!aiConfig?.welcomeMessage;
  const hasAiEnabled = !!aiConfig?.autoReplyEnabled;
  const hasPrompt = !!aiConfig?.systemPrompt;

  // Setup checklist
  const setupItems: SetupItem[] = [
    {
      key: 'account',
      label: 'LINE公式アカウントを接続',
      description: 'Webhook URL・チャネルシークレットを設定',
      href: '/settings',
      done: hasAccount,
    },
    {
      key: 'welcome',
      label: 'あいさつメッセージを設定',
      description: '友だち追加時に自動送信されるメッセージ',
      href: '/ai',
      done: hasWelcome,
    },
    {
      key: 'ai',
      label: 'AI自動応答を有効化',
      description: 'AIプロンプトを設定して自動返信を開始',
      href: '/ai',
      done: hasAiEnabled && hasPrompt,
    },
  ];

  const completedSetup = setupItems.filter((s) => s.done).length;
  const allSetupDone = completedSetup === setupItems.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          {hasAccount ? (
            <>
              <span className="text-emerald-600">● 接続中</span>
              <span className="ml-2">友だち {friendCount.toLocaleString()}人</span>
            </>
          ) : (
            'LINE公式アカウントを接続して始めましょう'
          )}
        </p>
      </div>

      {/* Setup checklist - show until all done */}
      {!allSetupDone && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">初期設定</CardTitle>
                <CardDescription>{completedSetup}/{setupItems.length} 完了</CardDescription>
              </div>
              <div className="flex gap-1">
                {setupItems.map((item) => (
                  <div
                    key={item.key}
                    className={`h-2 w-8 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-muted'}`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {setupItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  item.done
                    ? 'opacity-60'
                    : 'hover:bg-muted/50 cursor-pointer'
                }`}
              >
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  item.done ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30'
                }`}>
                  {item.done && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {!item.done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Onboarding Wizard */}
      {!showWizard && !wizardApplied && !allSetupDone && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Wand2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">AIで初期設定を自動生成</p>
                {hasAccount ? (
                  <p className="text-xs text-purple-700">業種情報を入力するだけで、あいさつ・AIプロンプト・タグを一括作成</p>
                ) : (
                  <p className="text-xs text-purple-700">利用するには、まずLINE公式アカウントを接続してください</p>
                )}
              </div>
            </div>
            {hasAccount ? (
              <Button size="sm" onClick={() => { setShowWizard(true); setWizardStep(0); }} className="gap-1.5">
                <Wand2 className="h-3.5 w-3.5" />
                はじめる
              </Button>
            ) : (
              <a href="/settings">
                <Button size="sm" variant="outline" className="gap-1.5">
                  アカウント接続
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {showWizard && !wizardApplied && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-600" />
              AIセットアップウィザード
            </CardTitle>
            <CardDescription>
              {wizardStep === 0 && 'ビジネス情報を入力してください'}
              {wizardStep === 1 && 'AIが最適な設定を生成中...'}
              {wizardStep === 2 && '生成結果を確認して適用してください'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wizardStep === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>業種 <span className="text-destructive">*</span></Label>
                    <Input
                      value={wizardData.industry}
                      onChange={(e) => setWizardData((p) => ({ ...p, industry: e.target.value }))}
                      placeholder="例: 美容サロン、飲食店、整体院"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>所在地</Label>
                    <Input
                      value={wizardData.location}
                      onChange={(e) => setWizardData((p) => ({ ...p, location: e.target.value }))}
                      placeholder="例: 東京都渋谷区"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ターゲット層</Label>
                    <Input
                      value={wizardData.target}
                      onChange={(e) => setWizardData((p) => ({ ...p, target: e.target.value }))}
                      placeholder="例: 20-40代女性"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>営業時間</Label>
                    <Input
                      value={wizardData.hours}
                      onChange={(e) => setWizardData((p) => ({ ...p, hours: e.target.value }))}
                      placeholder="例: 10:00-20:00"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>メニュー・サービス内容</Label>
                  <Textarea
                    value={wizardData.menu}
                    onChange={(e) => setWizardData((p) => ({ ...p, menu: e.target.value }))}
                    placeholder="例: カット ¥5,000、カラー ¥8,000、パーマ ¥10,000"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>現在の課題</Label>
                  <Input
                    value={wizardData.challenge}
                    onChange={(e) => setWizardData((p) => ({ ...p, challenge: e.target.value }))}
                    placeholder="例: リピート率が低い、新規集客が弱い"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleWizardGenerate}
                    disabled={!wizardData.industry.trim() || wizardLoading}
                    className="gap-1.5"
                  >
                    {wizardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {wizardLoading ? 'AIが生成中...' : 'AIで生成'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowWizard(false)}>キャンセル</Button>
                </div>
              </>
            )}

            {wizardStep === 2 && wizardResult && (
              <div className="space-y-4">
                {wizardResult.aiPrompt && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">AI応答プロンプト</p>
                    <div className="bg-muted/50 rounded-md p-3 text-xs whitespace-pre-wrap">{wizardResult.aiPrompt}</div>
                  </div>
                )}
                {wizardResult.welcomeMessage && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">あいさつメッセージ</p>
                    <div className="bg-green-50 rounded-md p-3 text-xs whitespace-pre-wrap">{wizardResult.welcomeMessage}</div>
                  </div>
                )}
                {wizardResult.knowledgeBase?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">ナレッジベース（{wizardResult.knowledgeBase.length}件）</p>
                    <div className="space-y-1">
                      {wizardResult.knowledgeBase.map((kb: any, i: number) => (
                        <div key={i} className="bg-blue-50 rounded-md p-2 text-xs">
                          <span className="font-medium">{kb.title}:</span> {kb.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {wizardResult.suggestedTags?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">推奨タグ</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {wizardResult.suggestedTags.map((t: string, i: number) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {wizardResult.scenario && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">ステップ配信シナリオ: {wizardResult.scenario.name}</p>
                    <div className="space-y-1">
                      {(wizardResult.scenario.steps || []).map((s: any, i: number) => (
                        <div key={i} className="bg-amber-50 rounded-md p-2 text-xs">
                          <span className="font-medium">Day {s.day}:</span> {s.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex gap-2">
                  <Button onClick={handleApplyResult} disabled={wizardLoading} className="gap-1.5">
                    {wizardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {wizardLoading ? '適用中...' : 'AI設定・タグを適用'}
                  </Button>
                  <Button variant="ghost" onClick={() => setWizardStep(0)}>やり直す</Button>
                  <Button variant="ghost" onClick={() => setShowWizard(false)}>閉じる</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {wizardApplied && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">AIセットアップが完了しました</p>
              <p className="text-xs text-green-700">AI設定ページで内容を確認・調整できます</p>
            </div>
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <a href="/ai">AI設定を確認</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats Cards */}
      {hasAccount && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: '友だち数',
              value: friendCount,
              icon: Users,
              color: 'text-emerald-600',
              bg: 'from-emerald-50 to-green-50',
              border: 'border-emerald-200',
              suffix: '人',
            },
            {
              label: '配信数（今月）',
              value: stats?.messages?.sent ?? 0,
              icon: Send,
              color: 'text-blue-600',
              bg: 'from-blue-50 to-indigo-50',
              border: 'border-blue-200',
              suffix: '通',
            },
            {
              label: 'AI応答',
              value: stats?.messages?.aiReplies ?? 0,
              icon: Bot,
              color: 'text-purple-600',
              bg: 'from-purple-50 to-violet-50',
              border: 'border-purple-200',
              suffix: '回',
            },
            {
              label: 'ステップ稼働',
              value: stats?.steps?.active ?? 0,
              icon: GitBranch,
              color: 'text-orange-600',
              bg: 'from-orange-50 to-amber-50',
              border: 'border-orange-200',
              suffix: '本',
            },
          ].map((kpi) => (
            <Card key={kpi.label} className={`${kpi.border} linq-card-hover overflow-hidden`}>
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${kpi.bg} p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">{kpi.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{kpi.suffix}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick actions - contextual based on setup state */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/messages', label: 'チャット', icon: Send, color: 'text-blue-600' },
          { href: '/friends', label: '友だち管理', icon: Users, color: 'text-emerald-600' },
          { href: '/ai', label: 'AI設定', icon: Bot, color: 'text-purple-600' },
          { href: '/rich-menus', label: 'リッチメニュー', icon: Menu, color: 'text-orange-600' },
        ].map((action) => (
          <a key={action.href} href={action.href}>
            <Card className="linq-card-hover hover:border-primary/50 cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <p className="text-sm font-medium">{action.label}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Recent friends */}
      {recentFriends.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                最近の友だち
              </h2>
              <a href="/friends" className="text-xs text-primary hover:underline">すべて見る</a>
            </div>
            <Separator />
            {recentFriends.map((f: any, i: number) => (
              <div key={f.id}>
                <a href={`/friends?id=${f.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                  <Avatar className="h-8 w-8">
                    {f.pictureUrl && <AvatarImage src={f.pictureUrl} />}
                    <AvatarFallback className="text-xs"><Users className="h-3.5 w-3.5" /></AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1">{f.displayName || '名前未設定'}</span>
                  {!f.isFollowing && (
                    <Badge variant="destructive" className="text-xs">ブロック</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString('ja-JP') : '-'}
                  </span>
                </a>
                {i < recentFriends.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state when no friends */}
      {recentFriends.length === 0 && hasAccount && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold">まだ友だちがいません</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              LINE公式アカウントに友だちが追加されると、ここに表示されます
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
