'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { FileStack, Plus, Pencil, Trash2, X, Check, Copy, ClipboardCheck, ChevronDown, ChevronUp, Image as ImageIcon, Eye } from 'lucide-react';
import { LinePreview, templateToLineMessages } from '@/components/line-preview';
import type { MessageContent } from '@/lib/types';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';

const CATEGORIES = [
  { value: '', label: 'すべて' },
  { value: 'greeting', label: 'あいさつ' },
  { value: 'promotion', label: '販促' },
  { value: 'followup', label: 'フォローアップ' },
  { value: 'notification', label: 'お知らせ' },
] as const;

const CATEGORY_MAP: Record<string, string> = {
  greeting: 'あいさつ',
  promotion: '販促',
  followup: 'フォローアップ',
  notification: 'お知らせ',
};

const CATEGORY_COLORS: Record<string, string> = {
  greeting: '#22C55E',
  promotion: '#F97316',
  followup: '#3B82F6',
  notification: '#A855F7',
};

const TEMPLATE_TYPES = [
  { value: 'text', label: 'テキスト' },
  { value: 'buttons', label: 'ボタン' },
  { value: 'confirm', label: '確認' },
  { value: 'carousel', label: 'カルーセル' },
] as const;

type TemplateType = 'text' | 'buttons' | 'confirm' | 'carousel';
type ActionType = 'uri' | 'message' | 'postback';

interface TemplateAction {
  type: ActionType;
  label: string;
  uri?: string;
  text?: string;
  data?: string;
}

interface CarouselColumn {
  thumbnailImageUrl?: string;
  title?: string;
  text: string;
  actions: TemplateAction[];
}

interface Template {
  id: string;
  name: string;
  content: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

function getActionValue(action: TemplateAction): string {
  if (action.type === 'uri') return action.uri || '';
  if (action.type === 'message') return action.text || '';
  if (action.type === 'postback') return action.data || '';
  return '';
}

function setActionValue(action: TemplateAction, value: string): TemplateAction {
  const updated = { ...action };
  if (action.type === 'uri') {
    updated.uri = value;
    delete updated.text;
    delete updated.data;
  } else if (action.type === 'message') {
    updated.text = value;
    delete updated.uri;
    delete updated.data;
  } else if (action.type === 'postback') {
    updated.data = value;
    delete updated.uri;
    delete updated.text;
  }
  return updated;
}

function newAction(): TemplateAction {
  return { type: 'message', label: '', text: '' };
}

function newCarouselColumn(): CarouselColumn {
  return { text: '', actions: [newAction()] };
}

interface ParsedTemplateData {
  type?: string;
  thumbnailImageUrl?: string;
  title?: string;
  text?: string;
  actions?: TemplateAction[];
  columns?: CarouselColumn[];
}

function parseContentToForm(content: string): { templateType: TemplateType; parsed: ParsedTemplateData | undefined } {
  try {
    const data = JSON.parse(content);
    if (data.type === 'buttons' || data.type === 'confirm' || data.type === 'carousel') {
      return { templateType: data.type, parsed: data as ParsedTemplateData };
    }
  } catch {
    // plain text
  }
  return { templateType: 'text', parsed: undefined };
}

// Action editor component
function ActionEditor({
  action,
  onChange,
  onRemove,
  canRemove,
}: {
  action: TemplateAction;
  onChange: (a: TemplateAction) => void;
  onRemove?: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex gap-2 items-start p-2 rounded-md bg-muted/50">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <select
            value={action.type}
            onChange={(e) => {
              const newType = e.target.value as ActionType;
              onChange(setActionValue({ ...action, type: newType, label: action.label }, getActionValue(action)));
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
          >
            <option value="message">メッセージ</option>
            <option value="uri">URL</option>
            <option value="postback">ポストバック</option>
          </select>
          <Input
            value={action.label}
            onChange={(e) => onChange({ ...action, label: e.target.value })}
            placeholder="ラベル"
            className="flex-1 h-8 text-xs"
            maxLength={20}
          />
        </div>
        <Input
          value={getActionValue(action)}
          onChange={(e) => onChange(setActionValue(action, e.target.value))}
          placeholder={action.type === 'uri' ? 'https://...' : action.type === 'postback' ? 'data=...' : '返信テキスト'}
          className="h-8 text-xs"
        />
      </div>
      {canRemove && onRemove && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-8 w-8 p-0 shrink-0" aria-label="削除">
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// Preview component
function TemplatePreview({
  templateType,
  textContent,
  buttonsData,
  confirmData,
  carouselData,
}: {
  templateType: TemplateType;
  textContent?: string;
  buttonsData?: ParsedTemplateData;
  confirmData?: ParsedTemplateData;
  carouselData?: ParsedTemplateData;
}) {
  if (templateType === 'text') {
    return (
      <div className="rounded-lg bg-muted p-3">
        <p className="text-sm whitespace-pre-wrap">{textContent || 'メッセージプレビュー'}</p>
      </div>
    );
  }

  if (templateType === 'buttons' && buttonsData) {
    return (
      <div className="rounded-lg border overflow-hidden max-w-[260px]">
        {buttonsData.thumbnailImageUrl && (
          <div className="h-32 bg-muted flex items-center justify-center">
            <img src={buttonsData.thumbnailImageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <div className="p-3 space-y-1">
          {buttonsData.title && <p className="text-sm font-bold">{buttonsData.title}</p>}
          <p className="text-xs text-muted-foreground">{buttonsData.text || '...'}</p>
        </div>
        <div className="border-t divide-y">
          {(buttonsData.actions ?? []).filter(a => a.label).map((a, i) => (
            <div key={i} className="text-center py-2 text-xs text-blue-500 font-medium">{a.label}</div>
          ))}
        </div>
      </div>
    );
  }

  if (templateType === 'confirm' && confirmData) {
    return (
      <div className="rounded-lg border overflow-hidden max-w-[260px]">
        <div className="p-3">
          <p className="text-xs">{confirmData.text || '...'}</p>
        </div>
        <div className="border-t grid grid-cols-2 divide-x">
          {(confirmData.actions ?? []).filter(a => a.label).map((a, i) => (
            <div key={i} className="text-center py-2 text-xs text-blue-500 font-medium">{a.label}</div>
          ))}
        </div>
      </div>
    );
  }

  if (templateType === 'carousel' && carouselData) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(carouselData.columns ?? []).map((col, i) => (
          <div key={i} className="rounded-lg border overflow-hidden min-w-[200px] max-w-[200px] shrink-0">
            {col.thumbnailImageUrl && (
              <div className="h-24 bg-muted">
                <img src={col.thumbnailImageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
            <div className="p-2 space-y-0.5">
              {col.title && <p className="text-xs font-bold truncate">{col.title}</p>}
              <p className="text-[11px] text-muted-foreground line-clamp-2">{col.text || '...'}</p>
            </div>
            <div className="border-t divide-y">
              {col.actions.filter(a => a.label).map((a, j) => (
                <div key={j} className="text-center py-1.5 text-[11px] text-blue-500 font-medium">{a.label}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <div className="text-xs text-muted-foreground">プレビュー</div>;
}

// Main template form for create/edit
function TemplateForm({
  initialType,
  initialTextContent,
  initialButtonsData,
  initialConfirmData,
  initialCarouselData,
  name,
  setName,
  category,
  setCategory,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
}: {
  initialType: TemplateType;
  initialTextContent: string;
  initialButtonsData?: ParsedTemplateData;
  initialConfirmData?: ParsedTemplateData;
  initialCarouselData?: ParsedTemplateData;
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  onSubmit: (content: string) => void;
  onCancel: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const [templateType, setTemplateType] = useState<TemplateType>(initialType);
  const [textContent, setTextContent] = useState(initialTextContent);

  // Buttons state
  const [btnImageUrl, setBtnImageUrl] = useState(initialButtonsData?.thumbnailImageUrl || '');
  const [btnTitle, setBtnTitle] = useState(initialButtonsData?.title || '');
  const [btnText, setBtnText] = useState(initialButtonsData?.text || '');
  const [btnActions, setBtnActions] = useState<TemplateAction[]>(
    initialButtonsData?.actions || [newAction()],
  );

  // Confirm state
  const [cfmText, setCfmText] = useState(initialConfirmData?.text || '');
  const [cfmActions, setCfmActions] = useState<[TemplateAction, TemplateAction]>(
    (initialConfirmData?.actions as [TemplateAction, TemplateAction] | undefined) || [
      { type: 'message', label: 'はい', text: 'はい' },
      { type: 'message', label: 'いいえ', text: 'いいえ' },
    ],
  );

  // Carousel state
  const [columns, setColumns] = useState<CarouselColumn[]>(
    initialCarouselData?.columns || [newCarouselColumn()],
  );

  function buildContent(): string {
    switch (templateType) {
      case 'text':
        return textContent;
      case 'buttons':
        return JSON.stringify({
          type: 'buttons',
          thumbnailImageUrl: btnImageUrl || undefined,
          title: btnTitle || undefined,
          text: btnText,
          actions: btnActions,
        });
      case 'confirm':
        return JSON.stringify({
          type: 'confirm',
          text: cfmText,
          actions: cfmActions,
        });
      case 'carousel':
        return JSON.stringify({
          type: 'carousel',
          columns: columns.map((c) => ({
            thumbnailImageUrl: c.thumbnailImageUrl || undefined,
            title: c.title || undefined,
            text: c.text,
            actions: c.actions,
          })),
        });
      default:
        return textContent;
    }
  }

  function isValid(): boolean {
    if (!name.trim()) return false;
    switch (templateType) {
      case 'text':
        return !!textContent.trim();
      case 'buttons':
        return !!btnText.trim() && btnActions.length > 0 && btnActions.every((a) => a.label.trim());
      case 'confirm':
        return !!cfmText.trim() && cfmActions.every((a) => a.label.trim());
      case 'carousel':
        return columns.length > 0 && columns.every((c) => c.text.trim() && c.actions.length > 0 && c.actions.every((a) => a.label.trim()));
      default:
        return false;
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(buildContent());
      }}
      className="space-y-4"
    >
      {/* Template type selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">テンプレートタイプ</label>
        <div className="flex gap-1">
          {TEMPLATE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTemplateType(t.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                templateType === t.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">テンプレート名</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 初回あいさつ、セールのお知らせ"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">カテゴリ</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">カテゴリなし</option>
          {CATEGORIES.filter((c) => c.value).map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type-specific fields */}
      {templateType === 'text' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">メッセージ内容</label>
          <Textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="テンプレートのメッセージ内容を入力..."
            rows={5}
          />
        </div>
      )}

      {templateType === 'buttons' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">サムネイル画像URL（任意）</label>
            <Input
              value={btnImageUrl}
              onChange={(e) => setBtnImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">タイトル（最大40文字、任意）</label>
            <Input
              value={btnTitle}
              onChange={(e) => setBtnTitle(e.target.value)}
              placeholder="タイトル"
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">本文（最大160文字）</label>
            <Textarea
              value={btnText}
              onChange={(e) => setBtnText(e.target.value)}
              placeholder="メッセージ本文"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">{btnText.length}/160</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">アクション（最大4つ）</label>
            {btnActions.map((action, i) => (
              <ActionEditor
                key={i}
                action={action}
                onChange={(a) => {
                  const updated = [...btnActions];
                  updated[i] = a;
                  setBtnActions(updated);
                }}
                onRemove={() => setBtnActions(btnActions.filter((_, j) => j !== i))}
                canRemove={btnActions.length > 1}
              />
            ))}
            {btnActions.length < 4 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setBtnActions([...btnActions, newAction()])}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                アクション追加
              </Button>
            )}
          </div>
        </div>
      )}

      {templateType === 'confirm' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">本文（最大240文字）</label>
            <Textarea
              value={cfmText}
              onChange={(e) => setCfmText(e.target.value)}
              placeholder="確認メッセージ"
              rows={3}
              maxLength={240}
            />
            <p className="text-xs text-muted-foreground text-right">{cfmText.length}/240</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">アクション（2つ）</label>
            {cfmActions.map((action, i) => (
              <ActionEditor
                key={i}
                action={action}
                onChange={(a) => {
                  const updated: [TemplateAction, TemplateAction] = [...cfmActions];
                  updated[i] = a;
                  setCfmActions(updated);
                }}
                canRemove={false}
              />
            ))}
          </div>
        </div>
      )}

      {templateType === 'carousel' && (
        <div className="space-y-3">
          <label className="text-sm font-medium">カラム（最大10個）</label>
          {columns.map((col, colIdx) => (
            <Card key={colIdx} className="relative">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">カラム {colIdx + 1}</p>
                  {columns.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setColumns(columns.filter((_, j) => j !== colIdx))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Input
                  value={col.thumbnailImageUrl || ''}
                  onChange={(e) => {
                    const updated = [...columns];
                    updated[colIdx] = { ...col, thumbnailImageUrl: e.target.value };
                    setColumns(updated);
                  }}
                  placeholder="画像URL（任意）"
                  className="text-xs"
                />
                <Input
                  value={col.title || ''}
                  onChange={(e) => {
                    const updated = [...columns];
                    updated[colIdx] = { ...col, title: e.target.value };
                    setColumns(updated);
                  }}
                  placeholder="タイトル（任意、最大40文字）"
                  className="text-xs"
                  maxLength={40}
                />
                <Textarea
                  value={col.text}
                  onChange={(e) => {
                    const updated = [...columns];
                    updated[colIdx] = { ...col, text: e.target.value };
                    setColumns(updated);
                  }}
                  placeholder="本文（最大120文字）"
                  className="text-xs"
                  rows={2}
                  maxLength={120}
                />
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">アクション（最大3つ）</p>
                  {col.actions.map((action, actIdx) => (
                    <ActionEditor
                      key={actIdx}
                      action={action}
                      onChange={(a) => {
                        const updatedCols = [...columns];
                        const updatedActions = [...col.actions];
                        updatedActions[actIdx] = a;
                        updatedCols[colIdx] = { ...col, actions: updatedActions };
                        setColumns(updatedCols);
                      }}
                      onRemove={() => {
                        const updatedCols = [...columns];
                        updatedCols[colIdx] = { ...col, actions: col.actions.filter((_, j) => j !== actIdx) };
                        setColumns(updatedCols);
                      }}
                      canRemove={col.actions.length > 1}
                    />
                  ))}
                  {col.actions.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedCols = [...columns];
                        updatedCols[colIdx] = { ...col, actions: [...col.actions, newAction()] };
                        setColumns(updatedCols);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      アクション
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {columns.length < 10 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setColumns([...columns, newCarouselColumn()])}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              カラム追加
            </Button>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">プレビュー</label>
        <div className="p-3 rounded-lg border bg-background">
          <TemplatePreview
            templateType={templateType}
            textContent={textContent}
            buttonsData={templateType === 'buttons' ? { thumbnailImageUrl: btnImageUrl, title: btnTitle, text: btnText, actions: btnActions } : undefined}
            confirmData={templateType === 'confirm' ? { text: cfmText, actions: cfmActions } : undefined}
            carouselData={templateType === 'carousel' ? { columns } : undefined}
          />
        </div>
      </div>

      {/* LINE Preview */}
      {isValid() && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            LINEプレビュー
          </div>
          <LinePreview
            messages={templateToLineMessages(
              templateType,
              templateType === 'text' ? textContent : name,
              templateType === 'buttons' ? { thumbnailImageUrl: btnImageUrl, title: btnTitle, text: btnText, actions: btnActions } :
              templateType === 'carousel' ? { columns } :
              templateType === 'confirm' ? { text: cfmText, actions: cfmActions } :
              null,
            )}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || !isValid()}>
          {submitting ? '保存中...' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function getTemplateTypeLabel(content: string): string | null {
  try {
    const data = JSON.parse(content);
    if (data.type === 'buttons') return 'ボタン';
    if (data.type === 'confirm') return '確認';
    if (data.type === 'carousel') return 'カルーセル';
  } catch {
    // plain text
  }
  return null;
}

function getDisplayText(content: string): string {
  try {
    const data = JSON.parse(content);
    if (data.type === 'buttons') return data.text || '';
    if (data.type === 'confirm') return data.text || '';
    if (data.type === 'carousel') return `${data.columns?.length || 0}カラム`;
    return content;
  } catch {
    return content;
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Copilot fill: open form and populate with AI-generated content
  const [aiTextContent, setAiTextContent] = useState('');
  const [aiFormKey, setAiFormKey] = useState(0);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    function handleAiFill(e: Event) {
      const { type, data } = (e as CustomEvent).detail;
      if (type === 'generate_message' && data?.text) {
        // AI generated a message → fill into template create form
        setNewName(data.name || '');
        setNewCategory(data.category || '');
        setAiTextContent(data.text);
        setAiFormKey((k) => k + 1);
        setShowCreate(true);
      }
    }
    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, []);

  async function loadTemplates() {
    try {
      const data = await api.templates.list();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(content: string) {
    if (!newName.trim() || !content.trim()) return;
    setCreating(true);
    try {
      // Detect message type from content
      let messageType = 'text';
      let messageData: MessageContent | null = null;
      try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'buttons' || parsed.type === 'carousel' || parsed.type === 'confirm') {
          messageType = parsed.type;
          messageData = parsed;
        }
      } catch { /* plain text */ }

      const template = await api.templates.create({
        name: newName.trim(),
        content: messageType === 'text' ? content.trim() : newName.trim(),
        category: newCategory || undefined,
        messageType,
        messageData: messageData ?? undefined,
      }) as Template;
      setTemplates((prev) => [template, ...prev]);
      setNewName('');
      setNewCategory('');
      setAiTextContent('');
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'テンプレートの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string, content: string) {
    if (!editName.trim() || !content.trim()) return;
    try {
      let messageType = 'text';
      let messageData: MessageContent | null = null;
      try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'buttons' || parsed.type === 'carousel' || parsed.type === 'confirm') {
          messageType = parsed.type;
          messageData = parsed;
        }
      } catch { /* plain text */ }

      const updated = await api.templates.update(id, {
        name: editName.trim(),
        content: messageType === 'text' ? content.trim() : editName.trim(),
        category: editCategory || undefined,
        messageType,
        messageData: messageData ?? undefined,
      }) as Partial<Template>;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      );
      setEditingId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'テンプレートの更新に失敗しました');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このテンプレートを削除しますか？')) return;
    try {
      await api.templates.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'テンプレートの削除に失敗しました');
    }
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setEditName(template.name);
    setEditCategory(template.category || '');
  }

  async function copyToClipboard(template: Template) {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast('クリップボードにコピーできませんでした');
    }
  }

  const filtered = activeTab
    ? templates.filter((t) => t.category === activeTab)
    : templates;

  const grouped = filtered.reduce<Record<string, Template[]>>((acc, t) => {
    const key = t.category || 'uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const categoryOrder = ['greeting', 'promotion', 'followup', 'notification', 'uncategorized'];
  const sortedGroups = categoryOrder.filter((k) => grouped[k]);

  return (
    <div className="p-3 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">テンプレート</h1>
          <p className="text-sm text-muted-foreground">再利用可能なメッセージテンプレートを管理</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          テンプレート作成
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardContent className="pt-6">
            <TemplateForm
              key={aiFormKey}
              initialType="text"
              initialTextContent={aiTextContent}
              name={newName}
              setName={setNewName}
              category={newCategory}
              setCategory={setNewCategory}
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              submitLabel="作成"
              submitting={creating}
            />
          </CardContent>
        </Card>
      )}

      {/* Category filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Template list */}
      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration="templates"
          title={activeTab ? 'このカテゴリにテンプレートがありません' : 'テンプレートがまだありません'}
          description="「テンプレート作成」から最初のテンプレートを作成しましょう"
        />
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((groupKey) => (
            <div key={groupKey} className="space-y-3">
              {!activeTab && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {CATEGORY_MAP[groupKey] || '未分類'}
                </h2>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[groupKey].map((template) => (
                  <Card key={template.id} className="relative group">
                    {editingId === template.id ? (
                      <CardContent className="pt-5">
                        <TemplateForm
                          initialType={parseContentToForm(template.content).templateType}
                          initialTextContent={parseContentToForm(template.content).templateType === 'text' ? template.content : ''}
                          initialButtonsData={
                            parseContentToForm(template.content).templateType === 'buttons'
                              ? parseContentToForm(template.content).parsed
                              : undefined
                          }
                          initialConfirmData={
                            parseContentToForm(template.content).templateType === 'confirm'
                              ? parseContentToForm(template.content).parsed
                              : undefined
                          }
                          initialCarouselData={
                            parseContentToForm(template.content).templateType === 'carousel'
                              ? parseContentToForm(template.content).parsed
                              : undefined
                          }
                          name={editName}
                          setName={setEditName}
                          category={editCategory}
                          setCategory={setEditCategory}
                          onSubmit={(content) => handleUpdate(template.id, content)}
                          onCancel={() => setEditingId(null)}
                          submitLabel="保存"
                          submitting={false}
                        />
                      </CardContent>
                    ) : (
                      <>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <div className="flex gap-1.5 flex-wrap">
                                {template.category && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                    style={{
                                      borderColor: CATEGORY_COLORS[template.category] || '#6B7280',
                                      color: CATEGORY_COLORS[template.category] || '#6B7280',
                                    }}
                                  >
                                    {CATEGORY_MAP[template.category] || template.category}
                                  </Badge>
                                )}
                                {getTemplateTypeLabel(template.content) && (
                                  <Badge variant="secondary" className="text-xs">
                                    {getTemplateTypeLabel(template.content)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(template)}
                                title="コピー"
                              >
                                {copiedId === template.id ? (
                                  <ClipboardCheck className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => startEdit(template)} title="編集">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(template.id)}
                                className="text-destructive hover:text-destructive"
                                title="削除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                            {getDisplayText(template.content)}
                          </p>
                          {/* Inline preview for rich templates */}
                          {getTemplateTypeLabel(template.content) && (
                            <div className="mt-2">
                              <TemplatePreview
                                templateType={parseContentToForm(template.content).templateType}
                                buttonsData={
                                  parseContentToForm(template.content).templateType === 'buttons'
                                    ? parseContentToForm(template.content).parsed
                                    : undefined
                                }
                                confirmData={
                                  parseContentToForm(template.content).templateType === 'confirm'
                                    ? parseContentToForm(template.content).parsed
                                    : undefined
                                }
                                carouselData={
                                  parseContentToForm(template.content).templateType === 'carousel'
                                    ? parseContentToForm(template.content).parsed
                                    : undefined
                                }
                              />
                            </div>
                          )}
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
