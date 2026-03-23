'use client';

import { toast } from 'sonner';

import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Plus, Play, Pause, Clock, ChevronLeft, Trash2, Send, Users, Diamond, X, Tag, BarChart3, Sparkles, Bot } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { StepScenario, StepMessage, StepCondition, StepEnrollment, Tag as TagType, MessageContent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import { HelpTip } from '@/components/ui/help-tip';
import { getApiUrl } from '@/lib/api-url';

const API = getApiUrl();

async function fetchApi(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const triggerLabels: Record<string, string> = {
  follow: '友だち追加時',
  tag_added: 'タグ付与時',
  form_submitted: 'フォーム回答時',
  manual: '手動',
};

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}分後`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}時間後`;
  return `${Math.round(minutes / 1440)}日後`;
}

// Condition Editor Modal
function ConditionEditor({
  condition,
  branchTrue,
  branchFalse,
  stepCount,
  tags,
  onSave,
  onClose,
}: {
  condition: StepCondition | null;
  branchTrue: number | null;
  branchFalse: number | null;
  stepCount: number;
  tags: TagType[];
  onSave: (condition: StepCondition | null, branchTrue: number | null, branchFalse: number | null) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<string>(condition?.type || 'none');
  const [tagId, setTagId] = useState<string>((condition?.tagId as string) || '');
  const [operator, setOperator] = useState<string>((condition?.operator as string) || '>=');
  const [value, setValue] = useState<number>(Number(condition?.value) || 0);
  const [bTrue, setBTrue] = useState<number | null>(branchTrue);
  const [bFalse, setBFalse] = useState<number | null>(branchFalse);

  function handleSave() {
    if (type === 'none') {
      onSave(null, null, null);
    } else if (type === 'tag_check') {
      onSave({ type: 'tag_check', tagId }, bTrue, bFalse);
    } else if (type === 'score_check') {
      onSave({ type: 'score_check', operator, value: String(value) }, bTrue, bFalse);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[420px] max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">条件設定</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} aria-label="閉じる">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">条件タイプ</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="none">なし</option>
              <option value="tag_check">タグチェック</option>
              <option value="score_check">スコアチェック</option>
            </select>
          </div>

          {type === 'tag_check' && (
            <div className="space-y-2">
              <Label className="text-sm">対象タグ</Label>
              <select
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">選択してください</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">友だちがこのタグを持っているかチェックします</p>
            </div>
          )}

          {type === 'score_check' && (
            <div className="space-y-2">
              <Label className="text-sm">スコア条件</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">スコア</span>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm w-20"
                >
                  <option value=">=">以上</option>
                  <option value="<=">以下</option>
                  <option value=">">より大</option>
                  <option value="<">より小</option>
                  <option value="==">等しい</option>
                </select>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-24"
                />
              </div>
            </div>
          )}

          {type !== 'none' && (
            <>
              <div className="border-t pt-3 space-y-2">
                <Label className="text-sm font-medium">分岐先</Label>
                <p className="text-xs text-muted-foreground">条件が真/偽の場合にジャンプするステップを指定（空欄=次のステップへ）</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-green-700">真 (条件一致)</Label>
                    <select
                      value={bTrue ?? ''}
                      onChange={(e) => setBTrue(e.target.value === '' ? null : Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">次のステップ</option>
                      {Array.from({ length: stepCount }, (_, i) => (
                        <option key={i} value={i}>ステップ {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-red-700">偽 (条件不一致)</Label>
                    <select
                      value={bFalse ?? ''}
                      onChange={(e) => setBFalse(e.target.value === '' ? null : Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">次のステップ</option>
                      {Array.from({ length: stepCount }, (_, i) => (
                        <option key={i} value={i}>ステップ {i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={type === 'tag_check' && !tagId}>
              保存
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              キャンセル
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StepsPage() {
  const [scenarios, setScenarios] = useState<StepScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedScenario, setSelectedScenario] = useState<StepScenario | null>(null);
  const [steps, setSteps] = useState<StepMessage[]>([]);
  const [enrollments, setEnrollments] = useState<StepEnrollment[]>([]);

  // Tags for condition editor
  const [allTags, setAllTags] = useState<TagType[]>([]);

  // Condition editor
  const [editingConditionStepId, setEditingConditionStepId] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState('follow');
  const [creating, setCreating] = useState(false);

  // Pending AI-generated steps to add after scenario creation
  const [pendingAiSteps, setPendingAiSteps] = useState<{ delay: number; unit: string; message: string }[]>([]);

  // Add step form
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepText, setStepText] = useState('');
  const [stepDelay, setStepDelay] = useState(0);
  const [stepDelayUnit, setStepDelayUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [addingStep, setAddingStep] = useState(false);

  // AI scenario generation
  const [showAiGen, setShowAiGen] = useState(false);
  const [aiIndustry, setAiIndustry] = useState('');
  const [aiGoal, setAiGoal] = useState('');
  const [aiTarget, setAiTarget] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<{ name?: string; description?: string; steps?: Array<{ delayMinutes?: number; messageContent: MessageContent | string }> } | null>(null);

  const loadScenarios = useCallback(() => {
    fetchApi('/api/v1/steps/scenarios')
      .then(setScenarios)
      .catch(() => { toast.error('シナリオ一覧の取得に失敗しました'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadScenarios();
    api.tags.list().then(setAllTags).catch(() => { toast.error('タグ一覧の取得に失敗しました'); });
  }, [loadScenarios]);

  // Listen for AI copilot data refresh
  useEffect(() => {
    const handler = () => loadScenarios();
    window.addEventListener('linq-data-refresh', handler);
    return () => window.removeEventListener('linq-data-refresh', handler);
  }, [loadScenarios]);

  // Listen for AI copilot fill event to populate scenario creation form
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type !== 'create_scenario') return;
      const data = detail.data;
      if (!data) return;
      setNewName(data.name || '');
      setNewDescription(data.description || '');
      setNewTrigger(data.triggerType || 'follow');
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        setPendingAiSteps(data.steps);
      } else {
        setPendingAiSteps([]);
      }
      setView('create');
    };
    window.addEventListener('linq-ai-fill', handler);
    return () => window.removeEventListener('linq-ai-fill', handler);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newTrigger) {
      toast.error('シナリオ名とトリガータイプは必須です');
      return;
    }
    setCreating(true);
    try {
      const data = await fetchApi('/api/v1/steps/scenarios', {
        method: 'POST',
        body: JSON.stringify({ name: newName, description: newDescription, triggerType: newTrigger }),
      });
      setScenarios((prev) => [...prev, data]);
      setShowAddStep(false);
      setNewName('');
      setNewDescription('');

      // If there are pending AI-generated steps, add them to the new scenario
      if (pendingAiSteps.length > 0) {
        const createdSteps: StepMessage[] = [];
        for (let i = 0; i < pendingAiSteps.length; i++) {
          const aiStep = pendingAiSteps[i];
          const unitMultiplier = aiStep.unit === 'hour' ? 60 : aiStep.unit === 'day' ? 1440 : 1;
          const delayMinutes = (aiStep.delay || 0) * unitMultiplier;
          try {
            const stepData = await fetchApi(`/api/v1/steps/scenarios/${data.id}/messages`, {
              method: 'POST',
              body: JSON.stringify({
                delayMinutes,
                messageContent: { text: aiStep.message },
                sortOrder: i,
              }),
            });
            createdSteps.push(stepData);
          } catch {}
        }
        setPendingAiSteps([]);
        // Open the newly created scenario detail view with steps already loaded
        setSelectedScenario(data);
        setSteps(createdSteps);
        setView('detail');
      } else {
        setView('list');
      }
    } catch {}
    setCreating(false);
  }

  async function openScenario(scenario: StepScenario) {
    setSelectedScenario(scenario);
    setView('detail');
    try {
      const data = await fetchApi(`/api/v1/steps/scenarios/${scenario.id}`);
      setSteps(data.steps || []);
    } catch {
      setSteps([]);
    }
    try {
      const data = await fetchApi(`/api/v1/steps/scenarios/${scenario.id}/enrollments`);
      setEnrollments(data);
    } catch {
      setEnrollments([]);
    }
  }

  async function toggleScenario(id: string, isActive: boolean) {
    const action = isActive ? 'deactivate' : 'activate';
    await fetchApi(`/api/v1/steps/scenarios/${id}/${action}`, { method: 'POST' });
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)));
    if (selectedScenario?.id === id) {
      setSelectedScenario((prev) => prev ? { ...prev, isActive: !isActive } : prev);
    }
  }

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    if (!stepText.trim()) return;
    setAddingStep(true);
    const delayMinutes =
      stepDelayUnit === 'hours' ? stepDelay * 60 :
      stepDelayUnit === 'days' ? stepDelay * 1440 :
      stepDelay;
    try {
      const data = await fetchApi(`/api/v1/steps/scenarios/${selectedScenario!.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          delayMinutes,
          messageContent: { text: stepText },
          sortOrder: steps.length,
        }),
      });
      setSteps((prev) => [...prev, data]);
      setStepText('');
      setStepDelay(0);
      setShowAddStep(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ステップの追加に失敗しました');
    }
    setAddingStep(false);
  }

  async function deleteStep(stepId: string) {
    if (!confirm('このステップを削除しますか？')) return;
    try {
      await fetchApi(`/api/v1/steps/messages/${stepId}`, { method: 'DELETE' });
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
    } catch {
      toast.error('ステップの削除に失敗しました');
    }
  }

  async function saveCondition(stepId: string, condition: StepCondition | null, branchTrue: number | null, branchFalse: number | null) {
    try {
      await fetchApi(`/api/v1/steps/messages/${stepId}`, {
        method: 'PATCH',
        body: JSON.stringify({ condition, branchTrue, branchFalse }),
      });
      setSteps((prev) =>
        prev.map((s) =>
          s.id === stepId ? { ...s, condition, branchTrue, branchFalse } : s,
        ),
      );
      setEditingConditionStepId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '条件の保存に失敗しました');
    }
  }

  if (loading) return <PageSkeleton />;

  // Detail view - visual editor
  if (view === 'detail' && selectedScenario) {
    const editingStep = steps.find((s) => s.id === editingConditionStepId);

    return (
      <div className="p-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setView('list'); setSelectedScenario(null); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{selectedScenario.name}</h1>
                <Badge variant={selectedScenario.isActive ? 'default' : 'secondary'}>
                  {selectedScenario.isActive ? '実行中' : '停止中'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {triggerLabels[selectedScenario.triggerType] || selectedScenario.triggerType}
              </p>
            </div>
          </div>
          <Button
            onClick={() => toggleScenario(selectedScenario.id, selectedScenario.isActive)}
            variant={selectedScenario.isActive ? 'destructive' : 'default'}
          >
            {selectedScenario.isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {selectedScenario.isActive ? '停止' : '開始'}
          </Button>
        </div>

        {/* Visual step flow */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">ステップフロー</CardTitle>
              <span className="text-xs text-muted-foreground">{steps.length} ステップ</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {/* Trigger node */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Play className="h-4 w-4 text-blue-600" />
                  </div>
                  {steps.length > 0 && <div className="w-0.5 h-8 bg-border" />}
                </div>
                <Card className="flex-1 bg-blue-50 border-blue-200">
                  <CardContent className="py-3 px-4">
                    <p className="text-sm font-medium text-blue-900">トリガー: {triggerLabels[selectedScenario.triggerType]}</p>
                    <p className="text-xs text-blue-700 mt-0.5">ここからシナリオ開始</p>
                  </CardContent>
                </Card>
              </div>

              {steps.map((step, i) => {
                const hasCondition = step.condition && step.condition.type;
                return (
                  <div key={step.id}>
                    {/* Delay label */}
                    <div className="flex items-center gap-2 py-1 pl-3 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDelay(step.delayMinutes)}
                    </div>

                    {/* Step node */}
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {hasCondition ? (
                          <div className="w-10 h-10 flex items-center justify-center">
                            <div className="w-8 h-8 bg-amber-100 border-2 border-amber-300 rotate-45 flex items-center justify-center">
                              <Diamond className="h-3 w-3 text-amber-600 -rotate-45" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Send className="h-4 w-4 text-green-600" />
                          </div>
                        )}
                        {i < steps.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                      </div>
                      <Card className={cn('flex-1', hasCondition && 'border-amber-200')}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-muted-foreground">ステップ {i + 1}</p>
                                {hasCondition && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700 bg-amber-50">
                                    {step.condition?.type === 'tag_check' && (
                                      <><Tag className="h-2.5 w-2.5 mr-0.5" />タグ条件</>
                                    )}
                                    {step.condition?.type === 'score_check' && (
                                      <><BarChart3 className="h-2.5 w-2.5 mr-0.5" />スコア {step.condition?.operator} {step.condition?.value}</>
                                    )}
                                  </Badge>
                                )}
                                {hasCondition && step.branchTrue != null && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-green-300 text-green-700 bg-green-50">
                                    真→S{step.branchTrue + 1}
                                  </Badge>
                                )}
                                {hasCondition && step.branchFalse != null && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-red-300 text-red-700 bg-red-50">
                                    偽→S{step.branchFalse + 1}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {step.messageContent?.text || JSON.stringify(step.messageContent)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingConditionStepId(step.id)}
                                className={cn(
                                  'text-muted-foreground',
                                  hasCondition && 'text-amber-600 hover:text-amber-700',
                                )}
                                title="条件を設定"
                              >
                                <GitBranch className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteStep(step.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}

              {/* Add step */}
              {showAddStep ? (
                <Card className="mt-3 border-blue-300 bg-blue-50/30">
                  <CardContent className="py-4">
                    <form onSubmit={addStep} className="space-y-3">
                      <Textarea
                        value={stepText}
                        onChange={(e) => setStepText(e.target.value)}
                        rows={3}
                        placeholder="送信するメッセージを入力..."
                        autoFocus
                      />
                      <div className="flex items-center gap-3">
                        <Label className="text-xs shrink-0">遅延:</Label>
                        <Input
                          type="number"
                          min="0"
                          value={stepDelay}
                          onChange={(e) => setStepDelay(Number(e.target.value))}
                          className="w-20"
                        />
                        <select
                          value={stepDelayUnit}
                          onChange={(e) => setStepDelayUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="minutes">分</option>
                          <option value="hours">時間</option>
                          <option value="days">日</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={addingStep || !stepText.trim()}>
                          {addingStep ? '追加中...' : 'ステップを追加'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowAddStep(false); setStepText(''); setStepDelay(0); }}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddStep(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    ステップを追加
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enrollments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">登録中のユーザー</CardTitle>
              <span className="text-xs text-muted-foreground">{enrollments.length}人</span>
            </div>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">まだ登録ユーザーがいません</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>進捗</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.slice(0, 20).map((enr) => (
                    <TableRow key={enr.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{enr.friendId?.slice(0, 8)}...</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">ステップ {enr.currentStepIndex + 1}/{steps.length}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          enr.status === 'active' ? 'default' :
                          enr.status === 'completed' ? 'secondary' :
                          'outline'
                        }>
                          {enr.status === 'active' ? '進行中' : enr.status === 'completed' ? '完了' : 'キャンセル'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Condition editor modal */}
        {editingConditionStepId && editingStep && (
          <ConditionEditor
            condition={editingStep.condition}
            branchTrue={editingStep.branchTrue ?? null}
            branchFalse={editingStep.branchFalse ?? null}
            stepCount={steps.length}
            tags={allTags}
            onSave={(condition, branchTrue, branchFalse) =>
              saveCondition(editingConditionStepId, condition, branchTrue, branchFalse)
            }
            onClose={() => setEditingConditionStepId(null)}
          />
        )}
      </div>
    );
  }

  // Create view
  if (view === 'create') {
    return (
      <div className="p-2 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">新規シナリオ</h1>
            <p className="text-sm text-muted-foreground">自動配信シナリオを作成</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>シナリオ名</Label>
                <Input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例: 新規歓迎シナリオ" />
              </div>
              <div className="space-y-2">
                <Label>説明</Label>
                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} placeholder="シナリオの目的..." />
              </div>
              <div className="space-y-2">
                <Label>トリガー</Label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="follow">友だち追加時</option>
                  <option value="tag_added">タグ付与時</option>
                  <option value="form_submitted">フォーム回答時</option>
                  <option value="manual">手動</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={creating || !newName.trim()}>{creating ? '作成中...' : '作成する'}</Button>
                <Button type="button" variant="ghost" onClick={() => setView('list')}>キャンセル</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="p-2 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">ステップ配信</h1>
            <HelpTip content="友だち追加後に自動で順番にメッセージを送るシナリオを設定します。教育コンテンツや商品紹介に最適です" />
          </div>
          <p className="text-sm text-muted-foreground">シナリオベースの自動メッセージ配信</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiGen(!showAiGen)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AIで自動生成
          </Button>
          <Button onClick={() => setView('create')}>
            <Plus className="h-4 w-4 mr-2" />
            新規シナリオ
          </Button>
        </div>
      </div>

      {/* AI Scenario Generator */}
      {showAiGen && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-amber-600" />
              AIシナリオ自動生成
            </CardTitle>
            <CardDescription>
              業種と目的を選ぶだけで、7〜10通のステップ配信シナリオをAIが30秒で自動作成。構築代行30万円相当のクオリティ。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!aiPreview ? (
              <>
                {/* Industry presets */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">業種を選択 *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {['美容サロン', '飲食店', '整体・治療院', '不動産', 'EC・通販', 'コンサル・講座', 'スクール・教室', 'クリニック', 'ジム・フィットネス'].map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setAiIndustry(ind)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          aiIndustry === ind
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={aiIndustry}
                    onChange={(e) => setAiIndustry(e.target.value)}
                    placeholder="上記以外の場合は直接入力"
                    className="mt-1"
                  />
                </div>
                {/* Goal presets */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">目的を選択 *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {['新規予約獲得', 'リピート促進', 'セミナー集客', '商品販売', '来店誘導', 'アップセル', '休眠復帰', 'ブランド認知'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setAiGoal(g)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          aiGoal === g
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder="上記以外の場合は直接入力"
                    className="mt-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ターゲット（任意）</Label>
                  <Input
                    value={aiTarget}
                    onChange={(e) => setAiTarget(e.target.value)}
                    placeholder="例: 30代女性、初来店客、既存会員"
                  />
                </div>
                <Button
                  disabled={aiGenerating || !aiIndustry.trim() || !aiGoal.trim()}
                  onClick={async () => {
                    setAiGenerating(true);
                    try {
                      const result = await api.ai.suggestScenario({
                        industry: aiIndustry,
                        goal: aiGoal,
                        target: aiTarget || undefined,
                      });
                      setAiPreview(result);
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : 'AI生成に失敗しました');
                    } finally {
                      setAiGenerating(false);
                    }
                  }}
                >
                  {aiGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      生成中...（約10秒）
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      シナリオを生成
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">{aiPreview.name}</h4>
                  {aiPreview.description && (
                    <p className="text-xs text-muted-foreground mt-1">{aiPreview.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {(aiPreview.steps || []).map((step: { delayMinutes?: number; messageContent: MessageContent | string }, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-sm border rounded p-3 bg-white">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {formatDelay(step.delayMinutes || 0)}
                        </span>
                      </div>
                      <p className="flex-1 whitespace-pre-wrap text-xs">
                        {typeof step.messageContent === 'string'
                          ? step.messageContent
                          : step.messageContent?.text || JSON.stringify(step.messageContent)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const result = await api.ai.executeAction({
                          type: 'create_scenario',
                          data: aiPreview,
                        });
                        if (result.success) {
                          loadScenarios();
                          setAiPreview(null);
                          setShowAiGen(false);
                          setAiIndustry('');
                          setAiGoal('');
                          setAiTarget('');
                        }
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : '保存に失敗しました');
                      }
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    このシナリオを登録
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAiPreview(null)}
                  >
                    やり直す
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAiGen(false);
                      setAiPreview(null);
                    }}
                  >
                    閉じる
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {scenarios.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              illustration="steps"
              title="シナリオがありません"
              description="「新規シナリオ」ボタンから作成してください"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>シナリオ名</TableHead>
                <TableHead>トリガー</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => (
                <TableRow
                  key={scenario.id}
                  className="cursor-pointer"
                  onClick={() => openScenario(scenario)}
                >
                  <TableCell>
                    <span className="text-sm font-medium">{scenario.name}</span>
                    {scenario.description && (
                      <span className="text-xs text-muted-foreground block mt-0.5">{scenario.description}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {triggerLabels[scenario.triggerType] || scenario.triggerType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={scenario.isActive ? 'default' : 'secondary'}>
                      {scenario.isActive ? '実行中' : '停止中'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => toggleScenario(scenario.id, scenario.isActive)}
                      variant={scenario.isActive ? 'destructive' : 'default'}
                      size="sm"
                    >
                      {scenario.isActive ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {scenario.isActive ? '停止' : '開始'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
