'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Eye, ChevronLeft, GripVertical, X, Copy, Check, ExternalLink, Tag, Download, Sparkles, Loader2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Form, FormResponse, Tag as TagType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import { HelpTip } from '@/components/ui/help-tip';

type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'email' | 'phone' | 'number';

interface FormField {
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'responses'>('list');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formThankYou, setFormThankYou] = useState('回答ありがとうございます！');
  const [fields, setFields] = useState<FormField[]>([
    { label: '', type: 'text', required: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [tagOnSubmitId, setTagOnSubmitId] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);

  // AI optimization
  const [aiOptimization, setAiOptimization] = useState<{
    formName: string;
    score: number;
    issues: Array<{ severity: 'high' | 'medium' | 'low'; issue: string; suggestion: string }>;
    improvedFields?: Array<{ label: string; type: string; placeholder?: string; required?: boolean }>;
  } | null>(null);
  const [aiOptLoading, setAiOptLoading] = useState(false);

  useEffect(() => {
    loadForms();
    api.tags.list().then(setAvailableTags).catch(() => { toast.error('タグ一覧の取得に失敗しました'); });
  }, []);

  // Listen for AI-generated form fill events
  useEffect(() => {
    function handleAiFill(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.type !== 'create_form' || !detail.data) return;
      const data = detail.data as {
        name: string;
        description?: string;
        fields?: { label: string; type: string; options?: string[] }[];
        thankYouMessage?: string;
      };
      setFormName(data.name || '');
      setFormDesc(data.description || '');
      if (data.thankYouMessage) setFormThankYou(data.thankYouMessage);
      if (data.fields && data.fields.length > 0) {
        setFields(
          data.fields.map((f) => ({
            label: f.label || '',
            type: (['text', 'textarea', 'select', 'radio', 'checkbox', 'email', 'phone', 'number'].includes(f.type) ? f.type : 'text') as FieldType,
            required: true,
            options: f.options && f.options.length > 0 ? f.options : undefined,
          }))
        );
      }
      setView('create');
    }
    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, []);

  async function loadForms() {
    setLoading(true);
    try {
      const data = await api.forms.list();
      setForms(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || fields.some((f) => !f.label.trim())) {
      toast.error('フォーム名とすべてのフィールドラベルは必須です');
      return;
    }
    setSaving(true);
    try {
      await api.forms.create({
        name: formName,
        description: formDesc || undefined,
        fields: fields.map((f) => ({
          ...f,
          options: f.options?.filter(Boolean),
        })),
        ...(tagOnSubmitId ? { tagOnSubmitId } : {}),
      });
      setFormName('');
      setFormDesc('');
      setFormThankYou('回答ありがとうございます！');
      setFields([{ label: '', type: 'text', required: true }]);
      setTagOnSubmitId('');
      setView('list');
      loadForms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このフォームを削除しますか？')) return;
    try {
      await api.forms.delete(id);
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    }
  }

  async function viewResponses(form: Form) {
    setSelectedForm(form);
    try {
      const data = await api.forms.getResponses(form.id);
      setResponses(data);
      setView('responses');
    } catch {
      setResponses([]);
      setView('responses');
    }
  }

  function addField() {
    setFields((prev) => [...prev, { label: '', type: 'text', required: false }]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(index: number, updates: Partial<FormField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const needsOptions = (type: FieldType) => ['select', 'radio', 'checkbox'].includes(type);

  function copyFormUrl(formId: string) {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${formId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(formId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return <PageSkeleton />;

  // Responses view
  if (view === 'responses' && selectedForm) {
    return (
      <div className="p-2 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); setSelectedForm(null); }} aria-label="戻る">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{selectedForm.name}</h1>
            <p className="text-sm text-muted-foreground">{responses.length}件の回答</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={aiOptLoading}
            onClick={async () => {
              setAiOptLoading(true);
              try {
                const result = await api.ai.optimizeForm(selectedForm.id);
                setAiOptimization(result);
              } catch {
                toast.error('AI最適化分析に失敗しました');
              } finally {
                setAiOptLoading(false);
              }
            }}
          >
            {aiOptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI最適化
          </Button>
          {responses.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                try {
                  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';
                  const res = await fetch(`${API_BASE}/api/v1/forms/${selectedForm.id}/responses/export/csv`, { credentials: 'include' });
                  if (!res.ok) throw new Error();
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `form_${selectedForm.name}_${new Date().toISOString().slice(0, 10)}.csv`;
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

        {/* AI Form Optimization Panel */}
        {aiOptimization && (
          <Card className="border-[#06C755]/30 bg-[#06C755]/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#06C755]" />
                  AI最適化レポート
                  <Badge variant={aiOptimization.score >= 80 ? 'default' : aiOptimization.score >= 50 ? 'secondary' : 'destructive'} className="text-[10px]">
                    スコア: {aiOptimization.score}/100
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setAiOptimization(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Issues */}
              <div className="space-y-2">
                {aiOptimization.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border bg-background p-3">
                    {issue.severity === 'high' ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : issue.severity === 'medium' ? (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{issue.issue}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{issue.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Improved fields suggestion */}
              {aiOptimization.improvedFields && aiOptimization.improvedFields.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">改善後のフィールド構成案</h4>
                  <div className="space-y-1.5">
                    {aiOptimization.improvedFields.map((field, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] shrink-0">{field.type}</Badge>
                        <span className="font-medium">{field.label}</span>
                        {field.required && <Badge variant="secondary" className="text-[9px]">必須</Badge>}
                        {field.placeholder && <span className="text-muted-foreground truncate">({field.placeholder})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {responses.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                illustration="forms"
                title="まだ回答がありません"
                description="フォームを公開して回答を集めましょう"
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>回答日</TableHead>
                  <TableHead>回答データ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((resp, i) => (
                  <TableRow key={resp.id}>
                    <TableCell className="text-sm">{i + 1}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(resp.submittedAt).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell className="text-sm">
                      <pre className="text-xs bg-muted p-2 rounded-md max-w-[500px] overflow-auto">
                        {JSON.stringify(resp.answers, null, 2)}
                      </pre>
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

  // Create form view
  if (view === 'create') {
    return (
      <div className="p-2 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')} aria-label="戻る">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">フォーム作成</h1>
            <p className="text-sm text-muted-foreground">アンケート・申し込みフォームを作成</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>フォーム名</Label>
                <Input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: お客様アンケート"
                />
              </div>
              <div className="space-y-2">
                <Label>説明 (任意)</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  placeholder="フォームの説明..."
                />
              </div>
              <div className="space-y-2">
                <Label>完了メッセージ</Label>
                <Input
                  type="text"
                  value={formThankYou}
                  onChange={(e) => setFormThankYou(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">フィールド</CardTitle>
                <Button type="button" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, i) => (
                <div key={i} className="pb-4 border-b last:border-b-0">
                  <div className="flex gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-3">
                        <Input
                          type="text"
                          required
                          value={field.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          className="flex-1"
                          placeholder="フィールド名"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const type = e.target.value as FieldType;
                            updateField(i, {
                              type,
                              options: needsOptions(type) ? [''] : undefined,
                            });
                          }}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="text">テキスト</option>
                          <option value="textarea">長文テキスト</option>
                          <option value="email">メール</option>
                          <option value="phone">電話番号</option>
                          <option value="number">数値</option>
                          <option value="select">ドロップダウン</option>
                          <option value="radio">ラジオボタン</option>
                          <option value="checkbox">チェックボックス</option>
                        </select>
                      </div>
                      {needsOptions(field.type) && (
                        <div className="pl-4 space-y-2">
                          <p className="text-xs text-muted-foreground">選択肢</p>
                          {(field.options || ['']).map((opt, oi) => (
                            <div key={oi} className="flex gap-2">
                              <Input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(field.options || [''])];
                                  newOpts[oi] = e.target.value;
                                  updateField(i, { options: newOpts });
                                }}
                                className="flex-1"
                                placeholder={`選択肢${oi + 1}`}
                              />
                              {(field.options || []).length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newOpts = (field.options || []).filter((_, k) => k !== oi);
                                    updateField(i, { options: newOpts });
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                            onClick={() => updateField(i, { options: [...(field.options || []), ''] })}
                          >
                            + 選択肢を追加
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(i, { required: checked })}
                        />
                        <Label className="text-sm text-muted-foreground">必須</Label>
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(i)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Auto-tag on submit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                回答時の自動タグ付け
              </CardTitle>
              <CardDescription>
                フォーム回答した友だちに自動でタグを付与します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={tagOnSubmitId}
                onChange={(e) => setTagOnSubmitId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">タグを選択しない（自動タグ付けなし）</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              {tagOnSubmitId && (
                <p className="text-xs text-muted-foreground mt-2">
                  このフォームに回答した友だちに「{availableTags.find(t => t.id === tagOnSubmitId)?.name}」タグが自動付与されます
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? '作成中...' : 'フォームを作成'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setView('list')}>
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">フォーム</h1>
            <HelpTip content="友だちから情報を収集するWebフォームを作成・管理します。回答データの確認やCSV出力も可能です" />
          </div>
          <p className="text-sm text-muted-foreground">アンケート・申し込みフォームの作成</p>
        </div>
        <Button onClick={() => setView('create')}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              illustration="forms"
              title="フォームがありません"
              description="「新規作成」からフォームを作成してください"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>フォーム名</TableHead>
                <TableHead>フィールド</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <span className="text-sm font-medium">{form.name}</span>
                    {form.description && (
                      <span className="text-xs text-muted-foreground block mt-0.5">{form.description}</span>
                    )}
                    {form.tagOnSubmitId && (
                      <Badge variant="outline" className="mt-1 text-[10px] gap-1">
                        <Tag className="h-3 w-3" />
                        自動タグ付け
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 flex-wrap">
                      {(Array.isArray(form.fields) ? form.fields : []).map((field, i) => (
                        <Badge key={i} variant="outline">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(form.createdAt).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyFormUrl(form.id)}
                        title="フォームURLをコピー"
                        aria-label="コピー"
                      >
                        {copiedId === form.id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <a href={`/f/${form.id}`} target="_blank" aria-label="外部リンク">
                        <Button variant="ghost" size="sm" aria-label="外部リンク">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button size="sm" onClick={() => viewResponses(form)}>
                        <Eye className="h-4 w-4 mr-1" />
                        回答
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(form.id)} aria-label="削除">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
