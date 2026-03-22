'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { Settings, Plus, Check, Copy, CreditCard, Zap, Users, MessageSquare, RefreshCw, Shield, Mail, Trash2 } from 'lucide-react';
import type { LineAccount } from '@/lib/types';
import { api } from '@/lib/api-client';

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
  const [tab, setTab] = useState<'accounts' | 'billing' | 'operators'>('accounts');
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

  // Operators state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('operator');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api.accounts.list().then(setAccounts).catch(() => { toast.error('アカウント情報の取得に失敗しました'); });
    api.auth.me().then((data) => setCurrentUser(data.user)).catch(() => { toast.error('ユーザー情報の取得に失敗しました'); });
  }, []);

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
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground">アカウント・プランの管理</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'accounts' | 'billing' | 'operators')}>
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
            オペレーター
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">LINE公式アカウントが接続されていません</h3>
                  <p className="text-sm text-muted-foreground mt-1">「アカウント追加」から接続してください</p>
                </div>
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
          {/* Current user role */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">あなたのアカウント</CardTitle>
              <CardDescription>現在ログイン中のユーザー情報</CardDescription>
            </CardHeader>
            <CardContent>
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{currentUser.email}</span>
                  </div>
                  <Badge variant={currentUser.role === 'owner' ? 'default' : 'secondary'}>
                    {currentUser.role === 'owner' ? 'オーナー' :
                     currentUser.role === 'admin' ? '管理者' :
                     currentUser.role === 'operator' ? 'オペレーター' :
                     currentUser.role === 'viewer' ? '閲覧者' :
                     currentUser.role || 'owner'}
                  </Badge>
                  {currentUser.displayName && (
                    <span className="text-sm text-muted-foreground">({currentUser.displayName})</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              )}
            </CardContent>
          </Card>

          {/* Role descriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">権限ロール一覧</CardTitle>
              <CardDescription>各ロールの権限範囲</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Badge className="mt-0.5 shrink-0">オーナー</Badge>
                  <div>
                    <p className="text-sm font-medium">全権限</p>
                    <p className="text-xs text-muted-foreground">アカウント設定、プラン変更、メンバー管理、メッセージ配信、全ての操作が可能</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Badge variant="secondary" className="mt-0.5 shrink-0">管理者</Badge>
                  <div>
                    <p className="text-sm font-medium">設定変更、メッセージ配信</p>
                    <p className="text-xs text-muted-foreground">LINE設定の変更、ブロードキャスト配信、友だち管理、タグ管理などが可能。プラン変更・メンバー管理は不可</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Badge variant="secondary" className="mt-0.5 shrink-0">オペレーター</Badge>
                  <div>
                    <p className="text-sm font-medium">メッセージ対応のみ</p>
                    <p className="text-xs text-muted-foreground">個別チャットでの返信、友だち情報の閲覧が可能。ブロードキャスト配信や設定変更は不可</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Badge variant="outline" className="mt-0.5 shrink-0">閲覧者</Badge>
                  <div>
                    <p className="text-sm font-medium">閲覧のみ</p>
                    <p className="text-xs text-muted-foreground">ダッシュボード、分析データ、メッセージ履歴の閲覧のみ可能。メッセージ送信や設定変更は不可</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invite member (MVP - UI only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">メンバーを招待</CardTitle>
              <CardDescription>チームメンバーを招待して、アカウントを共同管理できます</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                setInviting(true);
                // MVP: show coming soon message
                setTimeout(() => {
                  toast('招待機能は近日公開予定です。現在開発中です。');
                  setInviting(false);
                }, 500);
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
                      <option value="viewer">閲覧者</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled className="gap-2">
                  <Plus className="h-4 w-4" />
                  招待を送信
                </Button>
              </form>
              <p className="text-[11px] text-muted-foreground mt-3">
                ※ 招待機能は近日公開予定です
              </p>
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
