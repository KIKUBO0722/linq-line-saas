'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, Settings, Bot, GitBranch, Menu,
  CheckCircle2, Circle, ChevronRight, ArrowRight,
  Sparkles, Loader2, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

const fetchApi = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`http://localhost:3601${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
};

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  checkFn: () => Promise<boolean>;
}

const steps: Step[] = [
  {
    id: 'line_account',
    title: 'LINE公式アカウントを接続',
    description: 'LINE Developersでチャネル情報を取得し、LinQに登録。Webhook URLの設定とLINE側の応答設定も必要です',
    icon: Settings,
    href: '/settings',
    checkFn: async () => {
      try {
        const accounts = await fetchApi('/api/v1/accounts');
        return Array.isArray(accounts) && accounts.length > 0;
      } catch { return false; }
    },
  },
  {
    id: 'ai_setup',
    title: 'AI自動応答を設定',
    description: '自社の情報をAIに教えて、顧客対応を自動化します',
    icon: Bot,
    href: '/ai',
    checkFn: async () => {
      try {
        const config = await fetchApi('/api/v1/ai/config');
        return !!config?.systemPrompt || !!config?.autoReplyEnabled;
      } catch { return false; }
    },
  },
  {
    id: 'scenario',
    title: 'ステップ配信シナリオを作成',
    description: '友だち追加時に自動で送るメッセージシナリオを設定します',
    icon: GitBranch,
    href: '/steps',
    checkFn: async () => {
      try {
        const scenarios = await fetchApi('/api/v1/steps/scenarios');
        return Array.isArray(scenarios) && scenarios.length > 0;
      } catch { return false; }
    },
  },
  {
    id: 'rich_menu',
    title: 'リッチメニューを作成',
    description: 'LINEトーク画面下部に表示するメニューを設定します',
    icon: Menu,
    href: '/rich-menus',
    checkFn: async () => {
      try {
        const menus = await fetchApi('/api/v1/rich-menus');
        return Array.isArray(menus) && menus.length > 0;
      } catch { return false; }
    },
  },
];

export default function TutorialPage() {
  const router = useRouter();
  const [stepStatus, setStepStatus] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [aiTip, setAiTip] = useState('');
  const [loadingTip, setLoadingTip] = useState(false);

  // Check completion status of all steps
  useEffect(() => {
    async function checkAll() {
      setChecking(true);
      const results: Record<string, boolean> = {};
      for (const step of steps) {
        results[step.id] = await step.checkFn();
      }
      setStepStatus(results);
      setChecking(false);
    }
    checkAll();
  }, []);

  const completedCount = Object.values(stepStatus).filter(Boolean).length;
  const totalCount = steps.length;
  const allDone = completedCount === totalCount;

  // Find first incomplete step
  const currentStepIndex = steps.findIndex((s) => !stepStatus[s.id]);
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  // Get AI tip for current step
  async function getAiTip(step: Step) {
    setLoadingTip(true);
    setAiTip('');
    try {
      const res = await fetchApi('/api/v1/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: `チュートリアルで「${step.title}」のステップにいます。初心者向けに、このステップで何をすればいいか簡潔にアドバイスしてください。重要：これは一方通行のアドバイスです。ユーザーに質問を投げかけたり、追加情報を求めたりしないでください。具体的で完結したアドバイスだけを提供してください。`,
          page: '/tutorial',
        }),
      });
      setAiTip(res.reply || '');
    } catch {
      setAiTip('AIアドバイスを取得できませんでした。');
    } finally {
      setLoadingTip(false);
    }
  }

  return (
    <div className="p-3 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">チュートリアル</h1>
        <p className="text-muted-foreground">AIがステップごとに初期設定をガイドします</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#06C755]" />
              <span className="text-sm font-semibold">セットアップ進捗</span>
            </div>
            <Badge variant={allDone ? 'default' : 'secondary'}>
              {completedCount} / {totalCount} 完了
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
                background: allDone ? '#06C755' : '#3B82F6',
              }}
            />
          </div>
          {allDone && (
            <p className="text-sm text-[#06C755] font-medium mt-3 text-center">
              🎉 すべての初期設定が完了しました！LinQを活用しましょう！
            </p>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const done = stepStatus[step.id];
          const isCurrent = currentStepIndex === i;

          return (
            <Card
              key={step.id}
              className={
                isCurrent
                  ? 'border-2 border-[#06C755] shadow-md'
                  : done
                  ? 'opacity-70'
                  : ''
              }
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="mt-0.5">
                    {checking ? (
                      <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                    ) : done ? (
                      <CheckCircle2 className="h-5 w-5 text-[#06C755]" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <step.icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className={`text-sm font-semibold ${done ? 'line-through text-muted-foreground' : ''}`}>
                        Step {i + 1}: {step.title}
                      </h3>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] border-[#06C755] text-[#06C755]">
                          次のステップ
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>

                    {/* Actions for current step */}
                    {isCurrent && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          className="bg-[#06C755] hover:bg-[#05b34c] gap-1"
                          onClick={() => router.push(step.href)}
                        >
                          設定ページへ
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => getAiTip(step)}
                          disabled={loadingTip}
                        >
                          <Sparkles className="h-3 w-3" />
                          {loadingTip ? '考え中...' : 'AIにコツを聞く'}
                        </Button>
                      </div>
                    )}

                    {/* Done action */}
                    {done && !isCurrent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 text-xs gap-1 text-muted-foreground"
                        onClick={() => router.push(step.href)}
                      >
                        設定を確認 <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* AI Tip */}
                {isCurrent && aiTip && (
                  <div className="mt-3 ml-9 border border-border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3 w-3 text-[#06C755]" />
                      <span className="text-[11px] font-semibold text-foreground">AIアドバイス</span>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{aiTip}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
