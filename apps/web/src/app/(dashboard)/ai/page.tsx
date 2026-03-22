'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import {
  Bot, Save, Sparkles, Brain, Shield, TrendingUp,
  Plus, Trash2, ArrowRight, MessageCircleReply, HandMetal,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { AiConfig, AiSuggestedStep, GreetingMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';

interface KeywordRule {
  keyword: string;
  response: string;
  matchType: 'exact' | 'contains';
}

interface KnowledgeItem {
  title: string;
  content: string;
}

interface AiPageConfig {
  autoReplyEnabled: boolean;
  systemPrompt: string;
  knowledgeBase: KnowledgeItem[];
  handoffKeywords: string[];
  keywordRules: KeywordRule[];
  welcomeMessage?: string;
}

interface ScenarioSuggestion {
  name?: string;
  description?: string;
  steps?: AiSuggestedStep[];
}

export default function AiPage() {
  const [config, setConfig] = useState<AiPageConfig>({
    autoReplyEnabled: false,
    systemPrompt: '',
    knowledgeBase: [],
    handoffKeywords: [],
    keywordRules: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Message generation
  const [genPurpose, setGenPurpose] = useState('');
  const [genTone, setGenTone] = useState('フレンドリー');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Knowledge base
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbContent, setNewKbContent] = useState('');

  // Scenario generation
  const [scenarioDesc, setScenarioDesc] = useState('');
  const [scenarioResult, setScenarioResult] = useState<ScenarioSuggestion | string | null>(null);
  const [generatingScenario, setGeneratingScenario] = useState(false);

  // Keyword rules (merged from auto-reply)
  const [newKeyword, setNewKeyword] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [newMatchType, setNewMatchType] = useState<'exact' | 'contains'>('contains');

  // Handoff keywords
  const [newHandoff, setNewHandoff] = useState('');

  // Greeting messages
  const [greetings, setGreetings] = useState<GreetingMessage[]>([]);
  const [greetingForm, setGreetingForm] = useState<{ type: string; name: string; text: string } | null>(null);
  const [savingGreeting, setSavingGreeting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/ai/config`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => { toast.error('AI設定の取得に失敗しました'); })
      .finally(() => setLoading(false));
    api.greetings.list().then(setGreetings).catch(() => { console.warn('あいさつ一覧の取得に失敗'); });
  }, []);

  // Listen for AI Copilot fill events
  useEffect(() => {
    function handleAiFill(e: Event) {
      const { type, data } = (e as CustomEvent).detail;
      if (type === 'update_ai_config' && data) {
        if (data.systemPrompt) setConfig((prev: AiPageConfig) => ({ ...prev, systemPrompt: data.systemPrompt }));
        if (data.welcomeMessage) setConfig((prev: AiPageConfig) => ({ ...prev, welcomeMessage: data.welcomeMessage }));
        if (data.knowledgeBase && Array.isArray(data.knowledgeBase)) {
          setConfig((prev: AiPageConfig) => ({
            ...prev,
            knowledgeBase: [...(prev.knowledgeBase || []), ...data.knowledgeBase],
          }));
        }
        if (data.keywordRules && Array.isArray(data.keywordRules)) {
          setConfig((prev: AiPageConfig) => ({
            ...prev,
            keywordRules: [...(prev.keywordRules || []), ...data.keywordRules],
          }));
        }
        if (data.handoffKeywords && Array.isArray(data.handoffKeywords)) {
          setConfig((prev: AiPageConfig) => ({
            ...prev,
            handoffKeywords: [...new Set([...(prev.handoffKeywords || []), ...data.handoffKeywords])],
          }));
        }
      }
    }
    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/config`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeMessage: config.welcomeMessage || '',
          autoReplyEnabled: config.autoReplyEnabled,
          systemPrompt: config.systemPrompt || '',
          knowledgeBase: config.knowledgeBase || [],
          handoffKeywords: config.handoffKeywords || [],
          keywordRules: config.keywordRules || [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`保存に失敗しました: ${err.message || res.status}`);
      } else {
        const updated = await res.json();
        setConfig(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      toast.error('保存に失敗しました。ネットワークエラーです。');
    }
    setSaving(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setSuggestions([]);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/generate-message`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: genPurpose, tone: genTone }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {}
    setGenerating(false);
  }

  async function handleGenerateScenario() {
    if (!scenarioDesc.trim()) return;
    setGeneratingScenario(true);
    setScenarioResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/suggest-scenario`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: scenarioDesc }),
      });
      const data = await res.json();
      setScenarioResult(data);
    } catch {}
    setGeneratingScenario(false);
  }

  function addKnowledgeItem() {
    if (!newKbTitle.trim() || !newKbContent.trim()) return;
    setConfig((prev: AiPageConfig) => ({
      ...prev,
      knowledgeBase: [...(prev.knowledgeBase || []), { title: newKbTitle, content: newKbContent }],
    }));
    setNewKbTitle('');
    setNewKbContent('');
  }

  function addKeywordRule() {
    if (!newKeyword.trim() || !newResponse.trim()) return;
    setConfig((prev: AiPageConfig) => ({
      ...prev,
      keywordRules: [...(prev.keywordRules || []), {
        keyword: newKeyword.trim(),
        response: newResponse.trim(),
        matchType: newMatchType,
      }],
    }));
    setNewKeyword('');
    setNewResponse('');
  }

  function removeKeywordRule(index: number) {
    setConfig((prev: AiPageConfig) => ({
      ...prev,
      keywordRules: (prev.keywordRules || []).filter((_: KeywordRule, i: number) => i !== index),
    }));
  }

  function addHandoffKeyword() {
    const kw = newHandoff.trim();
    if (!kw || (config.handoffKeywords || []).includes(kw)) return;
    setConfig((prev: AiPageConfig) => ({
      ...prev,
      handoffKeywords: [...(prev.handoffKeywords || []), kw],
    }));
    setNewHandoff('');
  }

  function removeHandoffKeyword(kw: string) {
    setConfig((prev: AiPageConfig) => ({
      ...prev,
      handoffKeywords: (prev.handoffKeywords || []).filter((k: string) => k !== kw),
    }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI・自動化</h1>
          <p className="text-sm text-muted-foreground">自動応答・キーワード応答・コンテンツ生成</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saved ? '保存しました' : saving ? '保存中...' : '設定を保存'}
        </Button>
      </div>

      {/* Feature overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Bot className="h-8 w-8 text-purple-600" />
            <div>
              <p className="font-medium text-sm">AI自動応答</p>
              <p className="text-xs text-muted-foreground">LINEへの自動返信は追加費用なし</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <MessageCircleReply className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="font-medium text-sm">キーワード応答</p>
              <p className="text-xs text-muted-foreground">定型文で即時返答</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Sparkles className="h-8 w-8 text-amber-600" />
            <div>
              <p className="font-medium text-sm">コンテンツ生成</p>
              <p className="text-xs text-muted-foreground">3パターン提案</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="auto-reply" className="space-y-4">
        <TabsList>
          <TabsTrigger value="auto-reply">自動応答設定</TabsTrigger>
          <TabsTrigger value="keyword-rules">キーワード応答</TabsTrigger>
          <TabsTrigger value="knowledge">ナレッジベース</TabsTrigger>
          <TabsTrigger value="generate">AI生成ツール</TabsTrigger>
          <TabsTrigger value="greetings">あいさつメッセージ</TabsTrigger>
        </TabsList>

        {/* Tab 1: Auto-reply config */}
        <TabsContent value="auto-reply" className="space-y-4">
          {/* Welcome message */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageCircleReply className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle className="text-base">あいさつメッセージ</CardTitle>
                  <CardDescription>友だち追加時に自動送信されるメッセージ</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={config.welcomeMessage || ''}
                onChange={(e) => setConfig((p: AiPageConfig) => ({ ...p, welcomeMessage: e.target.value }))}
                rows={3}
                placeholder="例: 友だち追加ありがとうございます！&#10;ご予約やお問い合わせはこちらからどうぞ。"
              />
              <p className="text-xs text-muted-foreground">空欄の場合、あいさつメッセージは送信されません</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <div>
                    <CardTitle className="text-base">AI自動応答</CardTitle>
                    <CardDescription>受信メッセージにAIが自動返答します</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={config.autoReplyEnabled}
                  onCheckedChange={(checked) => setConfig((p: AiPageConfig) => ({ ...p, autoReplyEnabled: checked }))}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AIの性格・口調（システムプロンプト）</Label>
                <Textarea
                  value={config.systemPrompt || ''}
                  onChange={(e) => setConfig((p: AiPageConfig) => ({ ...p, systemPrompt: e.target.value }))}
                  rows={4}
                  placeholder="例: あなたは田中ビューティーサロンのAIアシスタントです。丁寧で親しみやすい口調で対応してください。"
                />
              </div>
            </CardContent>
          </Card>

          {/* Handoff keywords */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle className="text-base">スタッフ引き継ぎキーワード</CardTitle>
                  <CardDescription>これらを含むメッセージはAIが応答せず、スタッフ対応を促します</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(config.handoffKeywords || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(config.handoffKeywords || []).map((kw: string) => (
                    <Badge key={kw} variant="secondary" className="gap-1.5 pr-1.5">
                      {kw}
                      <button
                        onClick={() => removeHandoffKeyword(kw)}
                        className="hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newHandoff}
                  onChange={(e) => setNewHandoff(e.target.value)}
                  placeholder="例: クレーム、解約、返金"
                  className="max-w-[250px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addHandoffKeyword(); }
                  }}
                />
                <Button size="sm" variant="outline" onClick={addHandoffKeyword} disabled={!newHandoff.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Keyword rules */}
        <TabsContent value="keyword-rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageCircleReply className="h-5 w-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base">キーワード応答ルール</CardTitle>
                  <CardDescription>特定キーワードに定型文で応答（AI応答より優先）</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(config.keywordRules || []).length > 0 && (
                <div className="space-y-2">
                  {(config.keywordRules || []).map((rule: KeywordRule, i: number) => (
                    <div key={i} className="flex items-start gap-3 border border-border rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {rule.matchType === 'exact' ? '完全一致' : '部分一致'}
                          </Badge>
                          <span className="text-sm font-medium">&ldquo;{rule.keyword}&rdquo;</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                          <span className="line-clamp-2">{rule.response}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeKeywordRule(i)} className="text-destructive hover:text-destructive shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">ルール追加</p>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="キーワード（例: 営業時間）"
                    className="max-w-[200px]"
                  />
                  <select
                    value={newMatchType}
                    onChange={(e) => setNewMatchType(e.target.value as 'exact' | 'contains')}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="contains">部分一致</option>
                    <option value="exact">完全一致</option>
                  </select>
                </div>
                <Textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="応答メッセージ（例: 営業時間は10:00〜19:00です。）"
                  rows={2}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addKeywordRule}
                  disabled={!newKeyword.trim() || !newResponse.trim()}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  ルール追加
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Knowledge base */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base">ナレッジベース</CardTitle>
                  <CardDescription>AIが回答に使用するビジネス情報（{(config.knowledgeBase || []).length}件）</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(config.knowledgeBase || []).map((item: KnowledgeItem, index: number) => (
                <div key={index} className="pb-3 border-b last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setConfig((p: AiPageConfig) => ({ ...p, knowledgeBase: p.knowledgeBase.filter((_: KnowledgeItem, i: number) => i !== index) }))}
                    >
                      削除
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{item.content}</p>
                </div>
              ))}
              <Separator />
              <div className="space-y-3">
                <Input
                  type="text"
                  value={newKbTitle}
                  onChange={(e) => setNewKbTitle(e.target.value)}
                  placeholder="カテゴリ名（例: メニュー・料金）"
                />
                <Textarea
                  value={newKbContent}
                  onChange={(e) => setNewKbContent(e.target.value)}
                  rows={2}
                  placeholder="内容を入力..."
                />
                <Button variant="outline" size="sm" onClick={addKnowledgeItem} disabled={!newKbTitle.trim() || !newKbContent.trim()} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  追加
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: AI generation tools */}
        <TabsContent value="generate" className="space-y-4">
          {/* Message generation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base">メッセージ生成</CardTitle>
                  <CardDescription>目的とトーンを指定して配信メッセージを3パターン生成</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label>目的</Label>
                  <Input
                    type="text"
                    value={genPurpose}
                    onChange={(e) => setGenPurpose(e.target.value)}
                    placeholder="例: バレンタインキャンペーン告知"
                  />
                </div>
                <div className="w-44 space-y-2">
                  <Label>トーン</Label>
                  <select
                    value={genTone}
                    onChange={(e) => setGenTone(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option>フレンドリー</option>
                    <option>ビジネスライク</option>
                    <option>カジュアル</option>
                    <option>丁寧・フォーマル</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={!genPurpose || generating} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                {generating ? '生成中...' : 'メッセージを生成'}
              </Button>
              {suggestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">提案メッセージ:</p>
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <p className="text-sm flex-1 whitespace-pre-wrap">{s}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary shrink-0"
                        onClick={() => navigator.clipboard.writeText(s)}
                      >
                        コピー
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scenario suggestion */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle className="text-base">シナリオ提案</CardTitle>
                  <CardDescription>ビジネスの説明からステップ配信シナリオを自動生成</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={scenarioDesc}
                onChange={(e) => setScenarioDesc(e.target.value)}
                rows={3}
                placeholder="例: 美容サロンで、友だち追加した新規客に7日間かけて来店予約を促したい。初回クーポンあり。"
              />
              <Button
                onClick={handleGenerateScenario}
                disabled={!scenarioDesc.trim() || generatingScenario}
                className="gap-1.5"
              >
                <Brain className="h-4 w-4" />
                {generatingScenario ? 'シナリオ生成中...' : 'シナリオを生成'}
              </Button>
              {scenarioResult && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-green-800 mb-2">提案シナリオ</h3>
                  <pre className="text-xs text-green-700 whitespace-pre-wrap bg-green-50 p-3 rounded-md">
                    {typeof scenarioResult === 'string' ? scenarioResult : JSON.stringify(scenarioResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Greeting Messages */}
        <TabsContent value="greetings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">あいさつメッセージ設定</CardTitle>
              <CardDescription>
                友だち追加時に自動送信されるメッセージを設定します。新規・再フォロー・ブロック解除の3種類を個別に設定できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Greeting types */}
              {[
                { type: 'new_follow', label: '新規友だち追加', desc: '初めて友だち追加した人へ送信' },
                { type: 're_follow', label: '再フォロー（ブロック解除後）', desc: 'ブロック解除して再フォローした人へ送信' },
              ].map((gt) => {
                const existing = greetings.find((g) => g.type === gt.type);
                const isEditing = greetingForm?.type === gt.type;

                return (
                  <div key={gt.type} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold">{gt.label}</h4>
                        <p className="text-xs text-muted-foreground">{gt.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {existing && (
                          <Switch
                            checked={existing.isActive}
                            onCheckedChange={async (checked) => {
                              await api.greetings.update(existing.id, { isActive: checked });
                              setGreetings((prev) =>
                                prev.map((g) => (g.id === existing.id ? { ...g, isActive: checked } : g)),
                              );
                            }}
                          />
                        )}
                        {!isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setGreetingForm({
                                type: gt.type,
                                name: existing?.name || gt.label,
                                text: existing?.messages?.[0]?.text || '',
                              })
                            }
                          >
                            {existing ? '編集' : '作成'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {existing && !isEditing && (
                      <div className="bg-muted/50 rounded p-3 mt-2">
                        <p className="text-sm whitespace-pre-wrap">
                          {existing.messages?.[0]?.text || '(メッセージ未設定)'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={existing.isActive ? 'default' : 'secondary'}>
                            {existing.isActive ? '有効' : '無効'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-7 text-xs"
                            onClick={async () => {
                              if (!confirm('このあいさつメッセージを削除しますか？')) return;
                              await api.greetings.delete(existing.id);
                              setGreetings((prev) => prev.filter((g) => g.id !== existing.id));
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            削除
                          </Button>
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <div className="space-y-3 mt-3">
                        <div className="space-y-1">
                          <Label className="text-xs">管理名</Label>
                          <Input
                            value={greetingForm.name}
                            onChange={(e) => setGreetingForm({ ...greetingForm, name: e.target.value })}
                            placeholder="例: 新規友だちあいさつ"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">メッセージ本文</Label>
                          <Textarea
                            value={greetingForm.text}
                            onChange={(e) => setGreetingForm({ ...greetingForm, text: e.target.value })}
                            placeholder="友だち追加ありがとうございます！&#10;ご質問やご予約はこちらからお気軽にどうぞ。"
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={savingGreeting || !greetingForm.text.trim()}
                            onClick={async () => {
                              setSavingGreeting(true);
                              try {
                                const messages = [{ type: 'text', text: greetingForm.text }];
                                if (existing) {
                                  const updated = await api.greetings.update(existing.id, {
                                    name: greetingForm.name,
                                    messages,
                                  }) as GreetingMessage;
                                  setGreetings((prev) =>
                                    prev.map((g) => (g.id === existing.id ? updated : g)),
                                  );
                                } else {
                                  const created = await api.greetings.create({
                                    type: greetingForm.type,
                                    name: greetingForm.name,
                                    messages,
                                  }) as GreetingMessage;
                                  setGreetings((prev) => [...prev, created]);
                                }
                                setGreetingForm(null);
                              } catch {
                                toast.error('保存に失敗しました');
                              } finally {
                                setSavingGreeting(false);
                              }
                            }}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {savingGreeting ? '保存中...' : '保存'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setGreetingForm(null)}>
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>あいさつメッセージが設定されていない場合、AI設定のウェルカムメッセージが代わりに送信されます。</p>
                <p>あいさつメッセージはLINEのPush APIで送信されるため、配信数にカウントされます。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
