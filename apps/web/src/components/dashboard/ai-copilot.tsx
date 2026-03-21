'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, Send, X, Sparkles, Check, Undo2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';

interface ActionResult {
  type: string;
  id: string;
  details?: any;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  action?: { type: string; data: any } | null;
  actionResult?: ActionResult | null;
  confirmed?: boolean; // true = accepted, false = rolled back, undefined = pending
}

const pageHints: Record<string, { label: string; suggestions: string[] }> = {
  '/overview': {
    label: 'ダッシュボード',
    suggestions: ['運用状況を教えて', '改善ポイントは？', '今日やるべきことは？'],
  },
  '/messages': {
    label: 'メッセージ',
    suggestions: ['キャンペーン告知を作って', '再来店促進メッセージ', 'クーポン配信文を作成'],
  },
  '/steps': {
    label: 'ステップ配信',
    suggestions: ['新規歓迎シナリオを作って', '来店促進の7日間配信', 'リピーター育成シナリオ'],
  },
  '/segments': {
    label: 'セグメント配信',
    suggestions: ['効果的なセグメント分けは？', 'VIP顧客向けの配信設計', '休眠客の掘り起こし方法'],
  },
  '/templates': {
    label: 'テンプレート',
    suggestions: ['業種別おすすめテンプレート', 'セール告知のテンプレ', '来店お礼メッセージの型'],
  },
  '/friends': {
    label: '友だち一覧',
    suggestions: ['おすすめのタグ構成は？', 'VIP顧客の条件は？', 'スコアリング設計の方法'],
  },
  '/tags': {
    label: 'タグ管理',
    suggestions: ['業種別おすすめタグ一覧', 'タグ設計のベストプラクティス', '登録経路別のタグ分け'],
  },
  '/forms': {
    label: 'フォーム',
    suggestions: ['顧客アンケートを作って', '予約フォームの項目は？', '満足度調査を作成'],
  },
  '/coupons': {
    label: 'クーポン',
    suggestions: ['効果的なクーポン設計', '来店促進クーポンの条件', 'ショップカードの活用法'],
  },
  '/ai': {
    label: 'AI設定',
    suggestions: ['おすすめのAI応答設定', '自社FAQの書き方', 'ハンドオフの設定例'],
  },
  '/auto-reply': {
    label: '自動応答ルール',
    suggestions: ['キーワード応答の設計例', 'よくある質問の自動応答', '営業時間外の自動返信'],
  },
  '/reservations': {
    label: '予約管理',
    suggestions: ['LINE予約の設定方法', '予約リマインド配信のコツ', 'キャンセル防止の施策'],
  },
  '/analytics': {
    label: '分析',
    suggestions: ['数値の見方を教えて', 'KPI改善のアドバイス', '配信効果の分析'],
  },
  '/referral': {
    label: '紹介プログラム',
    suggestions: ['効果的な紹介施策は？', '報酬設計のコツ', 'キャンペーン案を提案'],
  },
  '/tutorial': {
    label: 'チュートリアル',
    suggestions: ['初期設定を始めたい', 'LINE連携の手順は？', 'まず何をすればいい？'],
  },
  '/settings': {
    label: '設定',
    suggestions: ['初期設定の手順は？', 'Webhook URLの設定方法', 'プランの選び方'],
  },
  '/rich-menus': {
    label: 'リッチメニュー',
    suggestions: ['おすすめのメニュー構成', 'エリア分割のコツ', 'テンプレートを提案'],
  },
};

const actionLabels: Record<string, string> = {
  create_scenario: 'ステップ配信シナリオ',
  generate_message: 'メッセージ下書き',
  create_form: 'フォーム',
  create_tags: 'タグ',
  suggest_tags: 'タグ',
  create_coupon: 'クーポン',
  create_segment: 'セグメント',
  update_ai_config: 'AI設定',
  create_rich_menu: 'リッチメニュー',
};

const actionPageMap: Record<string, string> = {
  scenario: '/steps',
  form: '/forms',
  tags: '/friends',
  coupon: '/coupons',
  segment: '/segments',
  ai_config: '/ai',
  rich_menu: '/rich-menus',
};

function isYesNoQuestion(text: string): boolean {
  return /作成しますか？|入力しますか？|よろしいですか？|いかがですか？|フォームに.*しますか？/.test(text);
}

interface ChoiceGroup {
  label: string;
  choices: string[];
}

function extractGroupedChoices(text: string): ChoiceGroup[] {
  const groups: ChoiceGroup[] = [];
  const lines = text.split('\n');
  let currentLabel = '';
  for (const line of lines) {
    const headerMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (headerMatch) {
      currentLabel = headerMatch[1];
      continue;
    }
    const choiceMatch = line.match(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*(.+)/);
    if (choiceMatch) {
      if (!currentLabel) currentLabel = '選択肢';
      let group = groups.find(g => g.label === currentLabel);
      if (!group) { group = { label: currentLabel, choices: [] }; groups.push(group); }
      group.choices.push(choiceMatch[1].trim());
    }
  }
  return groups;
}

function ChoiceChips({ content, show, onSelect }: { content: string; show: boolean; onSelect: (text: string) => void }) {
  const [selected, setSelected] = React.useState<Record<string, string>>({});

  if (!show) return null;
  const yesNo = isYesNoQuestion(content);
  const groups = extractGroupedChoices(content);
  const hasGroups = groups.length > 0;
  const isMultiGroup = groups.length > 1;

  if (!hasGroups && !yesNo) return null;

  if (yesNo) {
    return (
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        <button
          onClick={() => onSelect('はい、お願いします')}
          className="text-xs px-4 py-1.5 rounded-full border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors font-medium"
        >
          はい
        </button>
        <button
          onClick={() => onSelect('いいえ、やり直してください')}
          className="text-xs px-4 py-1.5 rounded-full border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors font-medium"
        >
          いいえ
        </button>
      </div>
    );
  }

  if (!isMultiGroup) {
    return (
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {groups[0].choices.map((choice, i) => (
          <button key={i} onClick={() => onSelect(choice)}
            className="text-xs px-3 py-1.5 rounded-full border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors text-left">
            {choice}
          </button>
        ))}
      </div>
    );
  }

  // Multi-group: select one per group, then submit all
  const allSelected = groups.every(g => selected[g.label]);

  return (
    <div className="px-3 pb-2 space-y-2">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="text-[10px] font-semibold text-gray-500 mb-1">{group.label}</div>
          <div className="flex flex-wrap gap-1">
            {group.choices.map((choice, i) => (
              <button key={i}
                onClick={() => setSelected(prev => ({ ...prev, [group.label]: choice }))}
                className={`text-xs px-3 py-1 rounded-full border transition-colors text-left ${
                  selected[group.label] === choice
                    ? 'border-purple-500 bg-purple-500 text-white'
                    : 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100'
                }`}>
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}
      {allSelected && (
        <button
          onClick={() => {
            const summary = groups.map(g => `${g.label}: ${selected[g.label]}`).join('、');
            onSelect(summary);
            setSelected({});
          }}
          className="w-full text-xs py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors font-medium"
        >
          この条件で作成
        </button>
      )}
    </div>
  );
}

export function AiCopilot() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  const currentPage = pageHints[pathname || '/overview'] || pageHints['/overview'];

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setMessages([]);
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent page to refresh data
  const refreshPage = useCallback(() => {
    window.dispatchEvent(new CustomEvent('linq-data-refresh'));
    router.refresh();
  }, [router]);

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((p) => [...p, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/assistant`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          page: pathname,
          history: messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (data.action) {
        // AI proposed an action → show with "fill into form" button (Notion AI style)
        setMessages((p) => [...p, {
          role: 'assistant',
          content: data.reply || '',
          action: data.action,
          confirmed: undefined, // pending user confirmation to fill form
        }]);
      } else {
        setMessages((p) => [...p, {
          role: 'assistant',
          content: data.reply || 'すみません、応答を生成できませんでした。',
        }]);
      }
    } catch {
      setMessages((p) => [...p, {
        role: 'assistant',
        content: 'APIに接続できません。サーバーが起動しているか確認してください。',
      }]);
    } finally {
      setLoading(false);
    }
  }

  // Notion AI style: dispatch data to the page form when user confirms
  function fillForm(msgIndex: number) {
    const msg = messages[msgIndex];
    if (!msg.action) return;
    const label = actionLabels[msg.action.type] || 'データ';
    window.dispatchEvent(new CustomEvent('linq-ai-fill', { detail: { type: msg.action.type, data: msg.action.data } }));
    setMessages((p) =>
      p.map((m, i) => i === msgIndex ? { ...m, confirmed: true } : m),
    );
    setMessages((p) => [...p, {
      role: 'assistant',
      content: `📝 ${label}の内容をフォームに入力しました。内容を確認・編集してから保存してください。`,
    }]);
  }

  function handleDecline(msgIndex: number) {
    setMessages((p) =>
      p.map((m, i) => i === msgIndex ? { ...m, confirmed: false } : m),
    );
    setMessages((p) => [...p, {
      role: 'assistant',
      content: '了解しました。別の内容で作り直しますか？',
    }]);
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 z-50 gap-2 px-5 h-10"
      >
        <Sparkles className="h-4 w-4" />
        AI に相談
      </Button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 w-[400px] h-[560px] bg-background rounded-xl shadow-2xl border flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-purple-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <span className="text-sm font-semibold">LinQ AI</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-white/20 text-white border-0">
            {currentPage.label}
          </Badge>
        </div>
        <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded p-1 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <Bot className="h-10 w-10 mx-auto text-purple-300 mb-3" />
              <p className="text-sm font-medium text-foreground">
                {currentPage.label}のAIアシスタント
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                質問するだけで、作成・設定まで自動で実行します
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {/* User message */}
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm bg-primary text-primary-foreground rounded-br-sm">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* Assistant message */}
              {msg.role === 'assistant' && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl text-sm bg-muted text-foreground rounded-bl-sm overflow-hidden">
                    <div className="px-3 py-2 whitespace-pre-wrap">{msg.content}</div>

                    {/* Clickable choice chips — show only on the latest unanswered assistant message */}
                    <ChoiceChips
                      content={msg.content}
                      show={!loading && !msg.action && messages.slice(i + 1).every(m => m.role !== 'user')}
                      onSelect={handleSend}
                    />

                    {/* Action confirmation: fill into form button */}
                    {msg.action && msg.confirmed === undefined && (
                      <div className="px-3 pb-2 flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 flex-1"
                          onClick={() => fillForm(i)}
                        >
                          <Check className="h-3 w-3" />
                          フォームに入力
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 flex-1"
                          onClick={() => handleDecline(i)}
                        >
                          <X className="h-3 w-3" />
                          やり直す
                        </Button>
                      </div>
                    )}

                    {msg.action && msg.confirmed === true && (
                      <div className="px-3 pb-2 text-xs text-green-600 font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" /> フォームに入力済み
                      </div>
                    )}

                    {msg.action && msg.confirmed === false && (
                      <div className="px-3 pb-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Undo2 className="h-3 w-3" /> キャンセル済み
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                考え中...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 shrink-0">
          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase font-medium tracking-wider">おすすめ</p>
          <div className="flex flex-col gap-1">
            {currentPage.suggestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-left text-xs px-3 py-2 rounded-md bg-muted/50 hover:bg-muted text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Input */}
      <div className="flex gap-2 p-3 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`${currentPage.label}について質問... (Shift+Enterで改行)`}
          className="flex-1 min-h-[36px] max-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={loading}
          rows={1}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />
        <Button
          size="sm"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="bg-purple-600 hover:bg-purple-700 h-9 self-end"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
