'use client';

import { toast } from 'sonner';

import { useEffect, useState, useRef } from 'react';
import {
  Menu, Plus, Trash2, Star, ChevronLeft, AlertCircle, Upload,
  Link, MessageSquare, Sparkles, Loader2, Edit2, Check, X,
  Smartphone, Layers, ArrowLeftRight,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { RichMenu, RichMenuGroup, RichMenuArea, RichMenuSize, LineAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import { HelpTip } from '@/components/ui/help-tip';
import { getApiUrl } from '@/lib/api-url';

const API_BASE = getApiUrl();

// Predefined layout templates
const LAYOUT_TEMPLATES = [
  {
    name: '2列',
    cols: 2,
    rows: 1,
    areas: (w: number, h: number) => [
      { bounds: { x: 0, y: 0, width: w / 2, height: h }, label: '左' },
      { bounds: { x: w / 2, y: 0, width: w / 2, height: h }, label: '右' },
    ],
  },
  {
    name: '3列',
    cols: 3,
    rows: 1,
    areas: (w: number, h: number) => [
      { bounds: { x: 0, y: 0, width: w / 3, height: h }, label: '左' },
      { bounds: { x: w / 3, y: 0, width: w / 3, height: h }, label: '中' },
      { bounds: { x: (w / 3) * 2, y: 0, width: w / 3, height: h }, label: '右' },
    ],
  },
  {
    name: '2x2',
    cols: 2,
    rows: 2,
    areas: (w: number, h: number) => [
      { bounds: { x: 0, y: 0, width: w / 2, height: h / 2 }, label: '左上' },
      { bounds: { x: w / 2, y: 0, width: w / 2, height: h / 2 }, label: '右上' },
      { bounds: { x: 0, y: h / 2, width: w / 2, height: h / 2 }, label: '左下' },
      { bounds: { x: w / 2, y: h / 2, width: w / 2, height: h / 2 }, label: '右下' },
    ],
  },
  {
    name: '2x3',
    cols: 3,
    rows: 2,
    areas: (w: number, h: number) => [
      { bounds: { x: 0, y: 0, width: w / 3, height: h / 2 }, label: '左上' },
      { bounds: { x: w / 3, y: 0, width: w / 3, height: h / 2 }, label: '中上' },
      { bounds: { x: (w / 3) * 2, y: 0, width: w / 3, height: h / 2 }, label: '右上' },
      { bounds: { x: 0, y: h / 2, width: w / 3, height: h / 2 }, label: '左下' },
      { bounds: { x: w / 3, y: h / 2, width: w / 3, height: h / 2 }, label: '中下' },
      { bounds: { x: (w / 3) * 2, y: h / 2, width: w / 3, height: h / 2 }, label: '右下' },
    ],
  },
  {
    name: '1大+2小',
    cols: 2,
    rows: 2,
    areas: (w: number, h: number) => [
      { bounds: { x: 0, y: 0, width: w / 2, height: h }, label: 'メイン' },
      { bounds: { x: w / 2, y: 0, width: w / 2, height: h / 2 }, label: '右上' },
      { bounds: { x: w / 2, y: h / 2, width: w / 2, height: h / 2 }, label: '右下' },
    ],
  },
];

interface AreaConfig {
  bounds: { x: number; y: number; width: number; height: number };
  action: { type: 'message' | 'uri' | 'postback' | 'richmenuswitch'; text?: string; uri?: string; data?: string; label?: string; richMenuAliasId?: string };
  label?: string;
}

interface TabConfig {
  name: string;
  chatBarText: string;
  areas: AreaConfig[];
  menuSize: 'full' | 'half';
}

interface RichMenuGroupWithMenus extends RichMenuGroup {
  menus?: RichMenu[];
}

type EditorView = 'list' | 'create' | 'edit' | 'create-group';

export default function RichMenusPage() {
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [groups, setGroups] = useState<RichMenuGroupWithMenus[]>([]);
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<EditorView>('list');
  const [editingMenu, setEditingMenu] = useState<RichMenu | null>(null);
  const [mainTab, setMainTab] = useState<'single' | 'groups'>('single');

  // Single menu editor state
  const [lineAccountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [chatBarText, setChatBarText] = useState('メニュー');
  const [menuSize, setMenuSize] = useState<'full' | 'half'>('full');
  const [areas, setAreas] = useState<AreaConfig[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Tab group editor state
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [tabs, setTabs] = useState<TabConfig[]>([
    { name: 'タブ1', chatBarText: 'メニュー', areas: [], menuSize: 'full' },
    { name: 'タブ2', chatBarText: 'メニュー', areas: [], menuSize: 'full' },
  ]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedTabArea, setSelectedTabArea] = useState<number | null>(null);

  // AI generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Listen for AI Copilot fill events
  useEffect(() => {
    function handleAiFill(e: Event) {
      const { type, data } = (e as CustomEvent).detail;
      if (type === 'create_rich_menu' && data?.areas && Array.isArray(data.areas)) {
        // Apply AI suggestions to current areas
        const suggestions = data.areas as { label: string; actionType?: string; text?: string; uri?: string }[];
        if (view === 'create' || view === 'edit') {
          setAreas((prev) =>
            prev.map((area, i) => {
              const s = suggestions[i];
              if (!s) return area;
              return {
                ...area,
                label: s.label || area.label,
                action: {
                  type: (s.actionType === 'uri' ? 'uri' : 'message') as 'message' | 'uri',
                  text: s.text || '',
                  uri: s.uri || '',
                },
              };
            }),
          );
        } else if (view === 'create-group') {
          setTabs((prev) =>
            prev.map((t, j) => {
              if (j !== activeTabIndex) return t;
              return {
                ...t,
                areas: t.areas.map((area, i) => {
                  const s = suggestions[i];
                  if (!s) return area;
                  return {
                    ...area,
                    label: s.label || area.label,
                    action: {
                      type: (s.actionType === 'uri' ? 'uri' : 'message') as 'message' | 'uri',
                      text: s.text || '',
                      uri: s.uri || '',
                    },
                  };
                }),
              };
            }),
          );
        }
        if (data.name) setName(data.name);
      }
    }
    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, [view, activeTabIndex]);

  async function loadData() {
    try {
      let rmFailed = false;
      const trackRm = <T,>(fallback: T) => () => { rmFailed = true; return fallback as T; };
      const [m, a, g] = await Promise.all([
        api.richMenus.list().catch(trackRm([])),
        api.accounts.list().catch(trackRm([])),
        api.richMenus.listGroups().catch(trackRm([])),
      ]);
      if (rmFailed) toast.error('リッチメニューデータの一部の読み込みに失敗しました');
      setMenus(m);
      setAccounts(a);
      setGroups(g);
      if (a.length > 0 && !lineAccountId) setAccountId(a[0].id);
    } finally {
      setLoading(false);
    }
  }

  function getSize(sz?: 'full' | 'half') {
    return (sz || menuSize) === 'full'
      ? { width: 2500, height: 1686 }
      : { width: 2500, height: 843 };
  }

  function applyTemplate(templateIndex: number, targetAreas?: AreaConfig[], setTargetAreas?: (a: AreaConfig[]) => void, sz?: 'full' | 'half') {
    const template = LAYOUT_TEMPLATES[templateIndex];
    const size = getSize(sz);
    const generated = template.areas(size.width, size.height);
    const newAreas = generated.map((a) => ({
      bounds: {
        x: Math.round(a.bounds.x),
        y: Math.round(a.bounds.y),
        width: Math.round(a.bounds.width),
        height: Math.round(a.bounds.height),
      },
      action: { type: 'message' as const, text: '' },
      label: a.label,
    }));

    if (setTargetAreas) {
      setTargetAreas(newAreas);
    } else {
      setAreas(newAreas);
    }
    setSelectedArea(null);
    setSelectedTabArea(null);
  }

  function resetEditor() {
    setName('');
    setChatBarText('メニュー');
    setMenuSize('full');
    setAreas([]);
    setSelectedArea(null);
    setImageFile(null);
    setImagePreview(null);
    setEditingMenu(null);
    setAiPrompt('');
    setGroupName('');
    setGroupDesc('');
    setTabs([
      { name: 'タブ1', chatBarText: 'メニュー', areas: [], menuSize: 'full' },
      { name: 'タブ2', chatBarText: 'メニュー', areas: [], menuSize: 'full' },
    ]);
    setActiveTabIndex(0);
    setSelectedTabArea(null);
  }

  function startCreate() {
    resetEditor();
    const size = { width: 2500, height: 1686 };
    const template = LAYOUT_TEMPLATES[3];
    const generated = template.areas(size.width, size.height);
    setAreas(
      generated.map((a) => ({
        bounds: { x: Math.round(a.bounds.x), y: Math.round(a.bounds.y), width: Math.round(a.bounds.width), height: Math.round(a.bounds.height) },
        action: { type: 'message' as const, text: '' },
        label: a.label,
      })),
    );
    setView('create');
  }

  function startCreateGroup() {
    resetEditor();
    // Apply default 2x3 to first two tabs
    const size = { width: 2500, height: 1686 };
    const template = LAYOUT_TEMPLATES[3];
    const generated = template.areas(size.width, size.height);
    const defaultAreas = generated.map((a) => ({
      bounds: { x: Math.round(a.bounds.x), y: Math.round(a.bounds.y), width: Math.round(a.bounds.width), height: Math.round(a.bounds.height) },
      action: { type: 'message' as const, text: '' },
      label: a.label,
    }));
    setTabs([
      { name: 'メイン', chatBarText: 'メニュー', areas: [...defaultAreas], menuSize: 'full' },
      { name: 'サブ', chatBarText: 'メニュー', areas: [...defaultAreas], menuSize: 'full' },
    ]);
    setView('create-group');
  }

  function startEdit(menu: RichMenu) {
    setEditingMenu(menu);
    setName(menu.name);
    setChatBarText(menu.chatBarText || 'メニュー');
    setAccountId(menu.lineAccountId);
    const size = menu.size;
    setMenuSize(size?.height && size.height > 1000 ? 'full' : 'half');
    const menuAreas = menu.areas || [];
    setAreas(
      menuAreas.map((a: RichMenuArea, i: number) => ({
        bounds: a.bounds,
        action: a.action ? { ...a.action, type: a.action.type as AreaConfig['action']['type'] } : { type: 'message' as const, text: '' },
        label: `エリア${i + 1}`,
      })),
    );
    setImagePreview(menu.imageUrl ? menu.imageUrl : null);
    setSelectedArea(null);
    setView('edit');
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('画像ファイルを選択してください'); return; }
    if (file.size > 1024 * 1024) { toast('ファイルサイズは1MB以下にしてください'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!name.trim() || !lineAccountId) return;
    setSaving(true);
    const size = getSize();
    const mappedAreas = areas.map((a) => ({ bounds: a.bounds, action: a.action }));

    try {
      let menu: RichMenu;
      if (view === 'edit' && editingMenu) {
        menu = await api.richMenus.update(editingMenu.id, { name, chatBarText, size, areas: mappedAreas }) as RichMenu;
      } else {
        menu = await api.richMenus.create({ lineAccountId, name, chatBarText, size, areas: mappedAreas }) as RichMenu;
      }

      if (imageFile && menu.id) {
        setUploading(true);
        try { await api.richMenus.uploadImage(menu.id, imageFile); }
        catch (err: unknown) { toast.error(`メニューは作成されましたが、画像アップロードに失敗しました: ${err instanceof Error ? err.message : 'エラー'}`); }
        setUploading(false);
      }

      await loadData();
      resetEditor();
      setView('list');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveGroup() {
    if (!groupName.trim() || !lineAccountId || tabs.length < 2) return;
    setSaving(true);
    try {
      await api.richMenus.createGroup({
        lineAccountId,
        name: groupName,
        description: groupDesc || null,
        tabs: tabs.map((tab) => ({
          name: tab.name,
          chatBarText: tab.chatBarText,
          size: getSize(tab.menuSize),
          areas: tab.areas.map((a) => ({ bounds: a.bounds, action: a.action })),
        })),
      });
      await loadData();
      resetEditor();
      setView('list');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'タブグループの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このリッチメニューを削除しますか？')) return;
    try {
      await api.richMenus.delete(id);
      setMenus((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '削除に失敗しました'); }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm('このタブグループを削除しますか？')) return;
    try {
      await api.richMenus.deleteGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '削除に失敗しました'); }
  }

  async function handleSetDefault(id: string) {
    try {
      await api.richMenus.setDefault(id);
      setMenus((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'デフォルト設定に失敗しました'); }
  }

  async function handleSetGroupDefault(groupId: string) {
    try {
      await api.richMenus.setGroupDefault(groupId);
      await loadData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'デフォルト設定に失敗しました'); }
  }

  async function handleAiGenerate(targetAreas: AreaConfig[], setTargetAreas: (a: AreaConfig[]) => void) {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/context-assistant`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `リッチメニューの内容を提案してください。以下の情報をもとに、各ボタンに設定すべきテキストやアクションを教えてください。\n\n${aiPrompt}\n\n現在のメニューは${targetAreas.length}エリアです。各エリアに設定するアクションをJSON配列で返してください: [{"label":"ボタン名","actionType":"message","text":"送信テキスト"}]`,
          page: '/rich-menus',
        }),
      });
      const data = await res.json();
      const reply = data.reply || '';
      const jsonMatch = reply.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          const suggestions = JSON.parse(jsonMatch[0]);
          setTargetAreas(
            targetAreas.map((area, i) => {
              const suggestion = suggestions[i];
              if (!suggestion) return area;
              return {
                ...area,
                label: suggestion.label || area.label,
                action: {
                  type: (suggestion.actionType === 'uri' ? 'uri' : 'message') as 'message' | 'uri',
                  text: suggestion.text || '',
                  uri: suggestion.uri || '',
                },
              };
            }),
          );
        } catch {}
      }
    } catch { toast.error('AI提案の取得に失敗しました'); }
    setAiGenerating(false);
  }

  // --- Shared UI Components ---

  function AreaEditor({
    currentAreas, setCurrentAreas, currentSelectedArea, setCurrentSelectedArea,
  }: {
    currentAreas: AreaConfig[]; setCurrentAreas: (a: AreaConfig[]) => void;
    currentSelectedArea: number | null; setCurrentSelectedArea: (n: number | null) => void;
  }) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">エリアアクション設定</CardTitle>
          <CardDescription className="text-xs">プレビューのエリアをクリックして選択・編集</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {currentAreas.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">上のレイアウトテンプレートを選択してください</p>
          ) : (
            currentAreas.map((area, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-all',
                  currentSelectedArea === i ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-muted-foreground/30',
                )}
                onClick={() => setCurrentSelectedArea(i)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center text-white', currentSelectedArea === i ? 'bg-primary' : 'bg-muted-foreground/50')}>
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium flex-1">{area.label || `エリア${i + 1}`}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {area.action.type === 'uri' ? 'URL' : area.action.type === 'richmenuswitch' ? 'タブ切替' : area.action.type === 'postback' ? 'ポストバック' : 'テキスト'}
                  </Badge>
                </div>

                {currentSelectedArea === i && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[10px]">アクション種類</Label>
                      <div className="flex gap-1 flex-wrap">
                        {([
                          { value: 'message', label: 'テキスト', icon: MessageSquare },
                          { value: 'uri', label: 'URL', icon: Link },
                          { value: 'richmenuswitch', label: 'タブ切替', icon: ArrowLeftRight },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newAreas = [...currentAreas];
                              newAreas[i] = { ...newAreas[i], action: { ...newAreas[i].action, type: opt.value } };
                              setCurrentAreas(newAreas);
                            }}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-all',
                              area.action.type === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted-foreground/30',
                            )}
                          >
                            <opt.icon className="h-3 w-3" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {area.action.type === 'message' && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">送信テキスト</Label>
                        <Input
                          className="h-8 text-xs"
                          value={area.action.text || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newAreas = [...currentAreas];
                            newAreas[i] = { ...newAreas[i], action: { ...newAreas[i].action, text: e.target.value } };
                            setCurrentAreas(newAreas);
                          }}
                          placeholder="タップ時にユーザーが送信するテキスト"
                        />
                      </div>
                    )}

                    {area.action.type === 'uri' && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">URL</Label>
                        <Input
                          className="h-8 text-xs"
                          value={area.action.uri || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newAreas = [...currentAreas];
                            newAreas[i] = { ...newAreas[i], action: { ...newAreas[i].action, uri: e.target.value } };
                            setCurrentAreas(newAreas);
                          }}
                          placeholder="https://example.com"
                        />
                      </div>
                    )}

                    {area.action.type === 'richmenuswitch' && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">切替先のエイリアスID</Label>
                        <Input
                          className="h-8 text-xs"
                          value={area.action.richMenuAliasId || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newAreas = [...currentAreas];
                            newAreas[i] = { ...newAreas[i], action: { ...newAreas[i].action, type: 'richmenuswitch', richMenuAliasId: e.target.value } };
                            setCurrentAreas(newAreas);
                          }}
                          placeholder="richmenu-alias-xxx-tab0"
                        />
                        <p className="text-[9px] text-muted-foreground">タブグループ作成後、自動でエイリアスが設定されます</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[10px]">ラベル（表示名）</Label>
                      <Input
                        className="h-8 text-xs"
                        value={area.label || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newAreas = [...currentAreas];
                          newAreas[i] = { ...newAreas[i], label: e.target.value };
                          setCurrentAreas(newAreas);
                        }}
                        placeholder="例: 予約する"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  function MenuPreview({ previewAreas, size, imgPreview, onSelectArea, selected }: {
    previewAreas: AreaConfig[]; size: { width: number; height: number };
    imgPreview?: string | null; onSelectArea: (i: number) => void; selected: number | null;
  }) {
    const previewScale = 360 / size.width;
    const previewHeight = size.height * previewScale;

    return (
      <div className="mx-auto w-[380px]">
        <div className="bg-[#7494C0] rounded-t-2xl pt-8 px-2.5 pb-0">
          <div className="bg-[#7494C0] h-32 flex items-end justify-center pb-4">
            <div className="bg-white/80 rounded-xl px-4 py-2 max-w-[80%]">
              <p className="text-[11px] text-gray-700">トーク画面のイメージ</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F7F8FA] border-t border-gray-200 px-3 py-2 flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-gray-400 border">メッセージを入力</div>
          <div className="text-[10px] text-primary font-medium cursor-default">{chatBarText || 'メニュー'}</div>
        </div>
        <div className="relative bg-muted border border-t-0 border-gray-200 overflow-hidden" style={{ height: previewHeight }}>
          {imgPreview && <img src={imgPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          {previewAreas.map((area, i) => {
            const left = (area.bounds.x / size.width) * 100;
            const top = (area.bounds.y / size.height) * 100;
            const w = (area.bounds.width / size.width) * 100;
            const h = (area.bounds.height / size.height) * 100;
            return (
              <div
                key={i}
                className={cn(
                  'absolute border-2 transition-all cursor-pointer flex items-center justify-center',
                  selected === i
                    ? 'border-primary bg-primary/20 z-10'
                    : imgPreview ? 'border-white/40 hover:border-white/80 hover:bg-white/10' : 'border-dashed border-muted-foreground/30 bg-background/50 hover:border-primary/50 hover:bg-primary/5',
                )}
                style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                onClick={() => onSelectArea(i)}
              >
                <div className={cn('text-center px-1', imgPreview ? 'text-white drop-shadow-md' : 'text-muted-foreground')}>
                  <p className="text-[10px] font-bold">{area.label || `${i + 1}`}</p>
                  {area.action.type === 'uri' && <Link className="h-3 w-3 mx-auto mt-0.5 opacity-70" />}
                  {area.action.type === 'richmenuswitch' && <ArrowLeftRight className="h-3 w-3 mx-auto mt-0.5 opacity-70" />}
                  {area.action.type === 'message' && area.action.text && <p className="text-[8px] opacity-70 line-clamp-1">{area.action.text}</p>}
                </div>
              </div>
            );
          })}
          {previewAreas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Menu className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">レイアウトを選択</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-b-2xl h-4 border-x border-b border-gray-200" />
      </div>
    );
  }

  function LayoutPicker({ onSelect }: { onSelect: (i: number) => void }) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">レイアウト</CardTitle>
          <CardDescription className="text-xs">テンプレートを選択してエリアを配置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {LAYOUT_TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                className="flex flex-col items-center gap-1 p-2 rounded-md border border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="w-12 h-8 grid gap-px bg-border rounded overflow-hidden" style={{ gridTemplateColumns: `repeat(${t.cols}, 1fr)`, gridTemplateRows: `repeat(${t.rows}, 1fr)` }}>
                  {Array.from({ length: t.cols * t.rows }).map((_, j) => <div key={j} className="bg-muted" />)}
                </div>
                <span className="text-[10px] text-muted-foreground">{t.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Loading ---
  if (loading) return <PageSkeleton />;

  // --- Tab Group Editor ---
  if (view === 'create-group') {
    const currentTab = tabs[activeTabIndex] || tabs[0];
    const tabSize = getSize(currentTab.menuSize);

    return (
      <div className="px-[5%] pt-2 space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { resetEditor(); setView('list'); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">タブグループ作成</h1>
            <p className="text-sm text-muted-foreground">タブ切替型のリッチメニューセットを作成</p>
          </div>
          <Button onClick={handleSaveGroup} disabled={saving || !groupName.trim() || tabs.length < 2} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? '保存中...' : '保存してLINEに反映'}
          </Button>
        </div>

        {accounts.length === 0 ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-sm">LINE公式アカウントが未接続</p>
                  <p className="text-xs text-muted-foreground">設定からLINE公式アカウントを接続してください</p>
                </div>
              </div>
              <a href="/settings"><Button size="sm">設定へ</Button></a>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-[1fr_380px] gap-6">
            {/* Left: Settings */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">グループ設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">LINE公式アカウント</Label>
                    <select value={lineAccountId} onChange={(e) => setAccountId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.botName || a.channelId}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">グループ名</Label>
                      <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="例: メインメニュータブ" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">説明（任意）</Label>
                      <Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="例: メインとサブの2タブ構成" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tab selector */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">タブ一覧</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setTabs((prev) => [...prev, { name: `タブ${prev.length + 1}`, chatBarText: 'メニュー', areas: [], menuSize: 'full' }])}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> タブ追加
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {tabs.map((tab, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setActiveTabIndex(i); setSelectedTabArea(null); }}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                            activeTabIndex === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          )}
                        >
                          {tab.name}
                        </button>
                        {tabs.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTabs((prev) => prev.filter((_, j) => j !== i));
                              if (activeTabIndex >= tabs.length - 1) setActiveTabIndex(Math.max(0, tabs.length - 2));
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active tab settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">「{currentTab.name}」の設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">タブ名</Label>
                      <Input
                        value={currentTab.name}
                        onChange={(e) => setTabs((prev) => prev.map((t, i) => i === activeTabIndex ? { ...t, name: e.target.value } : t))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">チャットバーテキスト</Label>
                      <Input
                        value={currentTab.chatBarText}
                        onChange={(e) => setTabs((prev) => prev.map((t, i) => i === activeTabIndex ? { ...t, chatBarText: e.target.value } : t))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">サイズ</Label>
                    <div className="flex gap-2">
                      {(['full', 'half'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTabs((prev) => prev.map((t, i) => i === activeTabIndex ? { ...t, menuSize: s } : t))}
                          className={cn(
                            'flex-1 p-2 rounded-md border-2 text-center text-xs font-medium cursor-pointer transition-all',
                            currentTab.menuSize === s ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-muted-foreground/30',
                          )}
                        >
                          <div className={cn('w-full bg-muted rounded mb-1', s === 'full' ? 'h-8' : 'h-4')} />
                          {s === 'full' ? 'フルサイズ' : 'ハーフサイズ'}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <LayoutPicker onSelect={(i) => {
                const size = getSize(currentTab.menuSize);
                const template = LAYOUT_TEMPLATES[i];
                const generated = template.areas(size.width, size.height);
                const newAreas: AreaConfig[] = generated.map((a) => ({
                  bounds: { x: Math.round(a.bounds.x), y: Math.round(a.bounds.y), width: Math.round(a.bounds.width), height: Math.round(a.bounds.height) },
                  action: { type: 'message' as const, text: '' },
                  label: a.label,
                }));
                setTabs((prev) => prev.map((t, j) => j === activeTabIndex ? { ...t, areas: newAreas } : t));
                setSelectedTabArea(null);
              }} />

              <AreaEditor
                currentAreas={currentTab.areas}
                setCurrentAreas={(a) => setTabs((prev) => prev.map((t, j) => j === activeTabIndex ? { ...t, areas: a } : t))}
                currentSelectedArea={selectedTabArea}
                setCurrentSelectedArea={setSelectedTabArea}
              />

              {/* AI Copilot handles rich menu suggestions via linq-ai-fill event */}
            </div>

            {/* Right: Preview */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground text-center">LINEプレビュー - {currentTab.name}</p>
              {/* Tab bar preview */}
              <div className="flex justify-center gap-1 mb-2">
                {tabs.map((tab, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveTabIndex(i); setSelectedTabArea(null); }}
                    className={cn(
                      'px-3 py-1 rounded-full text-[10px] font-medium transition-colors',
                      i === activeTabIndex ? 'bg-[#06C755] text-white' : 'bg-gray-200 text-gray-600',
                    )}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
              <MenuPreview
                previewAreas={currentTab.areas}
                size={tabSize}
                onSelectArea={setSelectedTabArea}
                selected={selectedTabArea}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Single Menu Editor ---
  if (view === 'create' || view === 'edit') {
    const size = getSize();

    return (
      <div className="px-[5%] pt-2 space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { resetEditor(); setView('list'); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{view === 'edit' ? 'リッチメニュー編集' : 'リッチメニュー作成'}</h1>
            <p className="text-sm text-muted-foreground">ビジュアルエディタでリッチメニューを設計</p>
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? (uploading ? '画像アップロード中...' : '保存中...') : '保存してLINEに反映'}
          </Button>
        </div>

        {accounts.length === 0 ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-sm">LINE公式アカウントが未接続</p>
                  <p className="text-xs text-muted-foreground">設定からLINE公式アカウントを接続してください</p>
                </div>
              </div>
              <a href="/settings"><Button size="sm">設定へ</Button></a>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-[1fr_380px] gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">基本設定</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {view === 'create' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">LINE公式アカウント</Label>
                      <select value={lineAccountId} onChange={(e) => setAccountId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.botName || a.channelId}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">メニュー名</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: メインメニュー" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">チャットバーテキスト</Label>
                      <Input value={chatBarText} onChange={(e) => setChatBarText(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">サイズ</Label>
                    <div className="flex gap-2">
                      {(['full', 'half'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setMenuSize(s)}
                          className={cn(
                            'flex-1 p-2 rounded-md border-2 text-center text-xs font-medium cursor-pointer transition-all',
                            menuSize === s ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-muted-foreground/30',
                          )}
                        >
                          <div className={cn('w-full bg-muted rounded mb-1', s === 'full' ? 'h-8' : 'h-4')} />
                          {s === 'full' ? 'フルサイズ' : 'ハーフサイズ'}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <LayoutPicker onSelect={(i) => applyTemplate(i)} />

              {/* Image upload */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">メニュー画像</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{menuSize === 'full' ? '2500×1686' : '2500×843'} / 1MB以下</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleImageSelect} className="hidden" />
                  <Button variant="outline" className="w-full gap-1.5" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    {imageFile ? imageFile.name : '画像をアップロード'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1.5">PNG / JPEG 形式。画像がないとLINE上でグレー表示になります</p>
                </CardContent>
              </Card>

              <AreaEditor currentAreas={areas} setCurrentAreas={setAreas} currentSelectedArea={selectedArea} setCurrentSelectedArea={setSelectedArea} />

              {/* AI Copilot handles rich menu suggestions via linq-ai-fill event */}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground text-center">LINEプレビュー</p>
              <MenuPreview previewAreas={areas} size={size} imgPreview={imagePreview} onSelectArea={setSelectedArea} selected={selectedArea} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- List View ---
  const singleMenus = menus.filter((m) => !m.groupId);

  return (
    <div className="px-[5%] pt-2 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">リッチメニュー</h1>
            <HelpTip content="LINEトーク画面の下部に表示されるメニューボタンを作成・管理します" />
          </div>
          <p className="text-sm text-muted-foreground">LINEトーク下部に表示されるメニューの作成・管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startCreateGroup} className="gap-1.5">
            <Layers className="h-4 w-4" />
            タブグループ
          </Button>
          <Button onClick={startCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'single' | 'groups')}>
        <TabsList>
          <TabsTrigger value="single" className="gap-1.5">
            <Menu className="h-4 w-4" />
            単体メニュー
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <Layers className="h-4 w-4" />
            タブグループ
            {groups.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{groups.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          {singleMenus.length === 0 ? (
            <EmptyState
              illustration="rich-menus"
              title="リッチメニューがありません"
              description="リッチメニューを作成して、LINEトーク画面にメニューを表示しましょう"
              action={{ label: '最初のメニューを作成', onClick: startCreate, icon: Plus }}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {singleMenus.map((menu) => {
                const menuAreas = menu.areas || [];
                const menuSz = menu.size;
                const isHalf = menuSz ? menuSz.height < 1000 : false;
                return (
                  <Card key={menu.id} className="overflow-hidden">
                    <div className="relative bg-muted border-b" style={{ height: isHalf ? 60 : 100 }}>
                      {menuAreas.map((area: RichMenuArea, i: number) => {
                        const sw = menuSz?.width || 2500;
                        const sh = menuSz?.height || 1686;
                        return (
                          <div key={i} className="absolute border border-dashed border-muted-foreground/20 bg-background/40 flex items-center justify-center"
                            style={{ left: `${(area.bounds.x / sw) * 100}%`, top: `${(area.bounds.y / sh) * 100}%`, width: `${(area.bounds.width / sw) * 100}%`, height: `${(area.bounds.height / sh) * 100}%` }}>
                            <span className="text-[8px] text-muted-foreground">{i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            {menu.name}
                            {menu.isDefault && <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">デフォルト</Badge>}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{menuAreas.length}エリア・{isHalf ? 'ハーフ' : 'フル'}サイズ</p>
                        </div>
                        <Badge variant={menu.isActive ? 'default' : 'secondary'} className="text-[10px]">{menu.isActive ? 'LINE同期済み' : '未同期'}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => startEdit(menu)}>
                          <Edit2 className="h-3.5 w-3.5" /> 編集
                        </Button>
                        {!menu.isDefault && menu.isActive && (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefault(menu.id)} className="gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-500" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDelete(menu.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          {groups.length === 0 ? (
            <EmptyState
              illustration="rich-menus"
              title="タブグループがありません"
              description="タブ切替型のリッチメニューで複数のメニューを切り替えられます"
              action={{ label: '最初のグループを作成', onClick: startCreateGroup, icon: Layers }}
            />
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const groupMenus = group.menus || [];
                return (
                  <Card key={group.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            {group.name}
                          </CardTitle>
                          {group.description && <CardDescription className="text-xs mt-0.5">{group.description}</CardDescription>}
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => handleSetGroupDefault(group.id)} className="gap-1 text-xs">
                            <Star className="h-3.5 w-3.5 text-amber-500" /> デフォルト
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteGroup(group.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {groupMenus.map((menu: RichMenu, i: number) => {
                          const menuAreas = menu.areas || [];
                          const menuSz = menu.size;
                          const isHalf = menuSz ? menuSz.height < 1000 : false;
                          return (
                            <div key={menu.id} className="min-w-[200px] rounded-lg border overflow-hidden">
                              <div className="bg-muted/50 px-2 py-1.5 border-b flex items-center justify-between">
                                <span className="text-xs font-medium">{menu.name}</span>
                                <Badge variant="outline" className="text-[10px]">タブ{i + 1}</Badge>
                              </div>
                              <div className="relative bg-muted" style={{ height: isHalf ? 40 : 60 }}>
                                {menuAreas.map((area: RichMenuArea, j: number) => {
                                  const sw = menuSz?.width || 2500;
                                  const sh = menuSz?.height || 1686;
                                  return (
                                    <div key={j} className="absolute border border-dashed border-muted-foreground/20 bg-background/40 flex items-center justify-center"
                                      style={{ left: `${(area.bounds.x / sw) * 100}%`, top: `${(area.bounds.y / sh) * 100}%`, width: `${(area.bounds.width / sw) * 100}%`, height: `${(area.bounds.height / sh) * 100}%` }}>
                                      <span className="text-[7px] text-muted-foreground">{j + 1}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
                                {menuAreas.length}エリア
                                {menu.lineAliasId && <span className="ml-1">• {menu.lineAliasId}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
