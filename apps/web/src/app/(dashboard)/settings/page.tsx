'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Settings, Plus, Check, Copy, CreditCard, Zap, Users, MessageSquare, RefreshCw, Shield, Mail, Trash2, CheckCircle2, XCircle, Palette, Clock } from 'lucide-react';
import type { LineAccount, TenantBranding, TeamMember, TenantInvitation } from '@/lib/types';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/empty-state';
import { HelpTip } from '@/components/ui/help-tip';

interface BillingPlan {
  id: string;
  name: string;
  price?: number;
  limits?: { friends?: number; messages?: number; aiTokens?: number };
}

interface BillingSubscription {
  planId?: string;
  planName?: string;
  status: string;
}

interface BillingUsage {
  messagesSent?: number;
  messagesLimit?: number;
  aiTokensUsed?: number;
  aiTokensLimit?: number;
  friendsCount?: number;
  friendsLimit?: number;
}

interface CurrentUser {
  email: string;
  role?: string;
  displayName?: string;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function SettingsPage() {
  const [tab, setTab] = useState<'accounts' | 'billing' | 'operators' | 'branding'>('accounts');
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [botName, setBotName] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);

  // Billing state
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);

  // Operators/Team state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('operator');
  const [inviting, setInviting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);

  // Branding state
  const [branding, setBranding] = useState<TenantBranding>({});
  const [savingBranding, setSavingBranding] = useState(false);

  const searchParams = useSearchParams();

  // Handle Stripe billing redirect
  useEffect(() => {
    const billing = searchParams.get('billing');
    if (billing === 'success') {
      setTab('billing');
      toast.success('お支払いが完了しました。プランが更新されます。');
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    } else if (billing === 'cancel') {
      setTab('billing');
      toast('お支払いがキャンセルされました。');
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  useEffect(() => {
    api.accounts.list().then(setAccounts).catch(() => { toast.error('アカウント情報の取得に失敗しました'); });
    api.auth.me().then((data) => setCurrentUser(data.user)).catch(() => { toast.error('ユーザー情報の取得に失敗しました'); });
    api.accounts.getBranding().then(setBranding).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'operators') {
      api.team.list().then(setTeamMembers).catch(() => {});
      api.team.listInvitations().then(setInvitations).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'billing') {
      setLoadingBilling(true);
      let billingFailed = false;
      const trackBilling = <T,>(fallback: T) => () => { billingFailed = true; return fallback as T; };
      Promise.all([
        api.billing.plans().catch(trackBilling([])),
        api.billing.subscription().catch(trackBilling(null)),
        api.billing.usage().catch(trackBilling(null)),
      ]).then(([p, s, u]) => {
        if (billingFailed) toast.error('請求情報の一部の読み込みに失敗しました');
        setPlans(p);
        setSubscription(s);
        setUsage(u);
      }).finally(() => setLoadingBilling(false));
    }
  }, [tab]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const account = await api.accounts.create({
        channelId,
        channelSecret,
        channelAccessToken,
        botName: botName || undefined,
      }) as LineAccount;
      setAccounts((prev) => [...prev, account]);
      setShowForm(false);
      setChannelId('');
      setChannelSecret('');
      setChannelAccessToken('');
      setBotName('');
    } catch (err) {
      toast.error('LINE公式アカウントの接続に失敗しました。入力内容を確認してください。');
    } finally {
      setSaving(false);
    }
  }

  const RENDER_API_URL = 'https://linq-line-saas.onrender.com';

  function getWebhookUrl(account: LineAccount) {
    return `${RENDER_API_URL}/webhook/${account.id}`;
  }

  function copyWebhookUrl(account: LineAccount) {
    navigator.clipboard.writeText(getWebhookUrl(account));
    setCopiedId(account.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleSyncFriends() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.friends.sync();
      setSyncResult(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '友だち同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSubscribe(planId: string) {
    try {
      const result = await api.billing.checkout({ planId });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else if (result.fallback && result.subscription) {
        setSubscription(result.subscription);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'プラン変更に失敗しました');
    }
  }

  async function handleCancel() {
    if (!confirm('サブスクリプションをキャンセルしますか？')) return;
    try {
      await api.billing.cancel();
      setSubscription((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'キャンセルに失敗しました');
    }
  }

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">設定</h1>
          <HelpTip content="LINE公式アカウントの接続、ブランディング、チーム管理、プラン変更などの各種設定を行います" />
        </div>
        <p className="text-sm text-muted-foreground">アカウント・プランの管理</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'accounts' | 'billing' | 'operators' | 'branding')}>
        <TabsList>
          <TabsTrigger value="accounts" className="gap-1.5">
            <Settings className="h-4 w-4" />
            LINEアカウント
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            プラン・課金
          </TabsTrigger>
          <TabsTrigger value="operators" className="gap-1.5">
            <Shield className="h-4 w-4" />
            チーム管理
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="h-4 w-4" />
            ブランド設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">LINE公式アカウント</CardTitle>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  アカウント追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 && !showForm ? (
                <EmptyState
                  illustration="generic"
                  title="LINE公式アカウントが接続されていません"
                  description="「アカウント追加」から接続してください"
                  action={{ label: 'アカウント追加', onClick: () => setShowForm(true), icon: Plus }}
                />
              ) : (
                <>
                  {accounts.length > 0 && (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bot名</TableHead>
                            <TableHead>Channel ID</TableHead>
                            <TableHead>Webhook URL</TableHead>
                            <TableHead>ステータス / 操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accounts.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell className="text-sm font-medium">{account.botName || 'LINE Bot'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{account.channelId}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-mono truncate max-w-[280px]">
                                    {getWebhookUrl(account)}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyWebhookUrl(account)}
                                    title="Webhook URLをコピー"
                                  >
                                    {copiedId === account.id ? (
                                      <Check className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge>接続済み</Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={async () => {
                                      if (!confirm(`「${account.botName || 'LINE Bot'}」を削除しますか？\nWebhookも無効になります。`)) return;
                                      try {
                                        await api.accounts.delete(account.id);
                                        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
                                      } catch (err: unknown) {
                                        toast.error(err instanceof Error ? err.message : '削除に失敗しました');
                                      }
                                    }}
                                    title="アカウントを削除"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="mt-6 border border-border rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3">LINE公式アカウント側の応答設定</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          LINE公式アカウントの自動応答が有効だと、LinQのAIではなくLINE側が応答してしまいます。
                        </p>
                        <ol className="text-xs text-foreground space-y-2.5 list-decimal list-inside">
                          <li>
                            <a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer" className="text-[#06C755] underline font-bold">
                              LINE Official Account Manager
                            </a>
                            {' '}にログイン
                          </li>
                          <li>「設定」→「応答設定」を開く</li>
                          <li>「応答メッセージ」を <strong>オフ</strong> にする</li>
                          <li>「Webhook」を <strong>オン</strong> にする</li>
                        </ol>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          ※ これでLINEへのメッセージが全てLinQに転送され、AI自動応答が機能します
                        </p>

                        <div className="mt-4 pt-3 border-t border-border">
                          <h4 className="text-sm font-semibold text-foreground mb-2">Webhook設定（LINE側で必要な作業）</h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            LinQがLINEのメッセージを受信するには、以下のLINE側の設定が必要です。
                          </p>
                          <ol className="text-xs text-foreground space-y-2 list-decimal list-inside">
                            <li>
                              <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-[#06C755] underline font-bold">
                                LINE Developersコンソール
                              </a>
                              {' '}→ 対象チャネル →「Messaging API設定」タブを開く
                            </li>
                            <li>「Webhook URL」に上の表のURLを貼り付けて <strong>更新</strong> を押す</li>
                            <li>「Webhookの利用」を <strong>ON</strong> にする</li>
                            <li>「検証」ボタンで接続テスト → <strong>成功</strong> と表示されればOK</li>
                          </ol>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Friend Sync */}
          {accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">友だち一括同期</CardTitle>
                <CardDescription>
                  LINE公式アカウントのフォロワーをLinQに一括インポートします。
                  Webhook受信前に友だち追加していたユーザーも取り込めます。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSyncFriends} disabled={syncing} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? '同期中...' : 'LINEから友だちを同期'}
                  </Button>
                  {syncResult && (
                    <Badge variant="secondary" className="text-sm">
                      {syncResult.synced}人を同期しました
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  ※ LINE APIの制限により、フォロワー数が多い場合は数分かかることがあります
                </p>
              </CardContent>
            </Card>
          )}

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">新しいLINE公式アカウントを接続</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Step-by-step guide */}
                <div className="bg-white dark:bg-slate-800 border-2 border-[#06C755] rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">📋 接続に必要な情報の取得手順</h4>
                  <ol className="text-xs text-gray-700 dark:text-gray-200 space-y-2 list-decimal list-inside">
                    <li>
                      <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-[#06C755] underline font-bold hover:opacity-80">
                        LINE Developersコンソール
                      </a>
                      {' '}を開き、ログイン
                    </li>
                    <li>対象のプロバイダー → <strong>Messaging APIチャネル</strong> を選択</li>
                    <li>「チャネル基本設定」タブ → <strong>チャネルID</strong> と <strong>チャネルシークレット</strong> をコピー</li>
                    <li>「Messaging API設定」タブ → 「チャネルアクセストークン（長期）」の <strong>発行</strong> ボタンを押してコピー</li>
                  </ol>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                    ※ まだMessaging APIチャネルがない場合は、LINE Developersで「新規チャネル作成」→「Messaging API」を選んでください
                  </p>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bot名 <span className="text-muted-foreground text-xs">（任意・管理用の表示名）</span></Label>
                    <Input
                      type="text"
                      autoComplete="off"
                      name="line-bot-name"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="例: マイショップBot"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>チャネルID <span className="text-destructive">*</span></Label>
                    <Input
                      type="text"
                      required
                      autoComplete="off"
                      name="line-channel-id"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      placeholder="チャネル基本設定 → チャネルID（数字）"
                    />
                    <p className="text-[11px] text-muted-foreground">LINE Developers → チャネル基本設定に表示される数字</p>
                  </div>

                  <div className="space-y-2">
                    <Label>チャネルシークレット <span className="text-destructive">*</span></Label>
                    <Input
                      type="text"
                      required
                      autoComplete="off"
                      name="line-channel-secret"
                      value={channelSecret}
                      onChange={(e) => setChannelSecret(e.target.value)}
                      placeholder="チャネル基本設定 → チャネルシークレット"
                    />
                    <p className="text-[11px] text-muted-foreground">LINE Developers → チャネル基本設定の下部に表示される英数字の文字列</p>
                  </div>

                  <div className="space-y-2">
                    <Label>チャネルアクセストークン <span className="text-destructive">*</span></Label>
                    <Input
                      type="text"
                      required
                      autoComplete="off"
                      name="line-access-token"
                      value={channelAccessToken}
                      onChange={(e) => setChannelAccessToken(e.target.value)}
                      placeholder="Messaging API設定 → チャネルアクセストークン（長期）"
                    />
                    <p className="text-[11px] text-muted-foreground">LINE Developers → Messaging API設定 →「発行」ボタンで取得する長い文字列</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? '保存中...' : '接続する'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-6">
          {loadingBilling ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Current plan */}
              {subscription && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">現在のプラン</CardTitle>
                      {subscription.status !== 'cancelled' && subscription.planName !== 'free' && (
                        <Button variant="destructive" size="sm" onClick={handleCancel}>
                          キャンセル
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-medium capitalize">
                        {subscription.planName || 'Free'} プラン
                      </p>
                      <Badge variant={
                        subscription.status === 'active' ? 'default' :
                        subscription.status === 'trialing' ? 'secondary' :
                        'outline'
                      }>
                        {subscription.status === 'active' ? '有効' :
                         subscription.status === 'trialing' ? 'トライアル中' :
                         subscription.status === 'cancelled' ? 'キャンセル済み' :
                         subscription.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Usage */}
              {usage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">今月の利用状況</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <UsageItem
                      label="メッセージ送信"
                      used={usage.messagesSent || 0}
                      limit={usage.messagesLimit}
                      icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
                    />
                    <UsageItem
                      label="AI応答"
                      used={usage.aiTokensUsed || 0}
                      limit={usage.aiTokensLimit}
                      icon={<Zap className="h-4 w-4 text-yellow-500" />}
                    />
                    <UsageItem
                      label="友だち数"
                      used={usage.friendsCount || 0}
                      limit={usage.friendsLimit}
                      icon={<Users className="h-4 w-4 text-green-500" />}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Plans */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">プラン一覧</CardTitle>
                </CardHeader>
                {plans.length === 0 ? (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">プラン情報を読み込めません</p>
                  </CardContent>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>プラン</TableHead>
                        <TableHead>月額</TableHead>
                        <TableHead>友だち</TableHead>
                        <TableHead>メッセージ</TableHead>
                        <TableHead>AI応答</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => {
                        const isCurrent = subscription?.planId === plan.id;
                        return (
                          <TableRow key={plan.id}>
                            <TableCell className="text-sm font-medium capitalize">{plan.name}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {plan.price === 0 ? '無料' : `${plan.price?.toLocaleString()}円`}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{plan.limits?.friends?.toLocaleString() || '--'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{plan.limits?.messages?.toLocaleString() || '--'}/月</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{plan.limits?.aiTokens?.toLocaleString() || '無制限'}</TableCell>
                            <TableCell>
                              {isCurrent ? (
                                <Badge>現在</Badge>
                              ) : (
                                <Button size="sm" onClick={() => handleSubscribe(plan.id)}>
                                  変更
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="operators" className="mt-4 space-y-6">
          {/* Team members list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">チームメンバー</CardTitle>
              <CardDescription>現在のメンバー一覧</CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>メール</TableHead>
                      <TableHead>表示名</TableHead>
                      <TableHead>ロール</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="text-sm">{member.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{member.displayName || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                            {member.role === 'owner' ? 'オーナー' : member.role === 'admin' ? '管理者' : 'オペレーター'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.role !== 'owner' && currentUser?.role === 'owner' && (
                            <div className="flex items-center gap-1">
                              <select
                                defaultValue={member.role}
                                onChange={async (e) => {
                                  try {
                                    await api.team.updateRole(member.id, e.target.value);
                                    setTeamMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, role: e.target.value } : m));
                                    toast.success('ロールを更新しました');
                                  } catch { toast.error('ロール更新に失敗しました'); }
                                }}
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              >
                                <option value="admin">管理者</option>
                                <option value="operator">オペレーター</option>
                              </select>
                              <Button
                                variant="ghost" size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={async () => {
                                  if (!confirm(`${member.email} を削除しますか？`)) return;
                                  try {
                                    await api.team.removeMember(member.id);
                                    setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
                                    toast.success('メンバーを削除しました');
                                  } catch { toast.error('削除に失敗しました'); }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              )}
            </CardContent>
          </Card>

          {/* Pending invitations */}
          {invitations.filter((i) => i.status === 'pending').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">保留中の招待</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>メール</TableHead>
                      <TableHead>ロール</TableHead>
                      <TableHead>有効期限</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.filter((i) => i.status === 'pending').map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm">{inv.email}</TableCell>
                        <TableCell><Badge variant="outline">{inv.role === 'admin' ? '管理者' : 'オペレーター'}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(inv.expiresAt).toLocaleDateString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                await api.team.cancelInvitation(inv.id);
                                setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
                                toast.success('招待を取り消しました');
                              } catch { toast.error('取り消しに失敗しました'); }
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            取消
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Invite member */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">メンバーを招待</CardTitle>
              <CardDescription>チームメンバーを招待して、アカウントを共同管理できます</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setInviting(true);
                try {
                  const inv = await api.team.invite({ email: inviteEmail, role: inviteRole });
                  setInvitations((prev) => [inv, ...prev]);
                  setInviteEmail('');
                  toast.success(`${inviteEmail} に招待を送信しました`);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : '招待の送信に失敗しました');
                } finally {
                  setInviting(false);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>メールアドレス</Label>
                    <Input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="member@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ロール</Label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="admin">管理者</option>
                      <option value="operator">オペレーター</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={inviting} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {inviting ? '送信中...' : '招待を送信'}
                </Button>
              </form>
              <p className="text-[11px] text-muted-foreground mt-3">
                ※ 招待リンクの有効期限は7日間です。招待されたユーザーはリンクからアカウントを作成できます。
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ホワイトラベル設定</CardTitle>
              <CardDescription>ダッシュボードのロゴ・カラーをカスタマイズして、自社ブランドで提供できます</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSavingBranding(true);
                try {
                  const updated = await api.accounts.updateBranding(branding);
                  setBranding(updated);
                  toast.success('ブランド設定を保存しました。ページを再読み込みすると反映されます。');
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : '保存に失敗しました');
                } finally {
                  setSavingBranding(false);
                }
              }} className="space-y-6">
                <div className="space-y-2">
                  <Label>アプリ名</Label>
                  <Input
                    type="text"
                    value={branding.appName || ''}
                    onChange={(e) => setBranding({ ...branding, appName: e.target.value || null })}
                    placeholder="LinQ（デフォルト）"
                    maxLength={100}
                  />
                  <p className="text-[11px] text-muted-foreground">サイドバーに表示されるアプリ名。空欄でLinQが表示されます。</p>
                </div>

                <div className="space-y-2">
                  <Label>ロゴURL</Label>
                  <Input
                    type="url"
                    value={branding.logoUrl || ''}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value || null })}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-[11px] text-muted-foreground">サイドバーに表示するロゴ画像のURL。推奨サイズ: 120x28px、透過PNG。</p>
                  {branding.logoUrl && (
                    <div className="mt-2 p-3 bg-slate-900 rounded-md inline-block">
                      <img src={branding.logoUrl} alt="ロゴプレビュー" className="h-7 max-w-[120px] object-contain" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>プライマリカラー</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor || '#06C755'}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="h-10 w-10 rounded border border-input cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={branding.primaryColor || '#06C755'}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        placeholder="#06C755"
                        maxLength={7}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">ロゴテキストのアクセントカラー</p>
                  </div>
                  <div className="space-y-2">
                    <Label>サイドバー背景色</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.sidebarColor || '#0f172a'}
                        onChange={(e) => setBranding({ ...branding, sidebarColor: e.target.value })}
                        className="h-10 w-10 rounded border border-input cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={branding.sidebarColor || '#0f172a'}
                        onChange={(e) => setBranding({ ...branding, sidebarColor: e.target.value })}
                        placeholder="#0f172a"
                        maxLength={7}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">サイドバーの背景色</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ファビコンURL</Label>
                  <Input
                    type="url"
                    value={branding.faviconUrl || ''}
                    onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value || null })}
                    placeholder="https://example.com/favicon.ico"
                  />
                  <p className="text-[11px] text-muted-foreground">ブラウザタブに表示されるアイコン</p>
                </div>

                {/* Preview */}
                <div className="border rounded-lg p-4 space-y-2">
                  <Label className="text-muted-foreground">プレビュー</Label>
                  <div className="rounded-lg p-4 inline-flex items-center gap-3" style={{ backgroundColor: branding.sidebarColor || '#0f172a' }}>
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} alt="ロゴ" className="h-7 max-w-[120px] object-contain" />
                    ) : (
                      <span className="text-xl font-extrabold" style={{ color: branding.primaryColor || '#06C755' }}>
                        {branding.appName || 'LinQ'}
                      </span>
                    )}
                  </div>
                </div>

                <Button type="submit" disabled={savingBranding}>
                  {savingBranding ? '保存中...' : 'ブランド設定を保存'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsageItem({ label, used, limit, icon }: { label: string; used: number; limit?: number; icon: React.ReactNode }) {
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
