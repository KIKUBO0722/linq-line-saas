'use client';

import { toast } from 'sonner';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, Tag, Plus, X, MessageSquare, ChevronDown, Sparkles, Download, Upload, Save, Trash2, Clock, ArrowDownLeft, ArrowUpRight, UserPlus, UserMinus } from 'lucide-react';
import type { Friend, Tag as TagType, TimelineEvent as TimelineEventType } from '@/lib/types';
import { api } from '@/lib/api-client';

interface FriendWithTags extends Friend {
  tags?: TagType[];
}

interface TimelineEventData {
  id?: string;
  type: string;
  timestamp?: string;
  data?: {
    content?: string | { text?: string; type?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendWithTags[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FriendWithTags | null>(null);

  const [tags, setTags] = useState<TagType[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [creatingTag, setCreatingTag] = useState(false);
  const [friendTags, setFriendTags] = useState<TagType[]>([]);
  const [loadingFriendTags, setLoadingFriendTags] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // AI analysis
  interface AiAnalysisResult {
    analysis: string;
    tags?: string[];
    score?: number;
    nextAction?: string;
  }
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // CSV import
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  interface ImportResult {
    imported?: number;
    updated?: number;
    tagsCreated?: number;
    errors?: string[];
  }
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Timeline
  const [timeline, setTimeline] = useState<TimelineEventData[]>([]);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Custom fields
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [showAddField, setShowAddField] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');

  const loadTimeline = useCallback(async (friendId: string) => {
    setLoadingTimeline(true);
    try {
      const res = await api.friends.timeline(friendId, 30);
      setTimeline(res.events || []);
      setTimelineTotal(res.total || 0);
    } catch {
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  const loadFriendTags = useCallback(async (friendId: string) => {
    setLoadingFriendTags(true);
    try {
      const ft = await api.friends.listTags(friendId);
      setFriendTags(ft);
    } catch {
      setFriendTags([]);
    } finally {
      setLoadingFriendTags(false);
    }
  }, []);

  useEffect(() => {
    if (selected?.id) {
      loadFriendTags(selected.id);
      setShowTagPicker(false);
      setAiAnalysis(null);
      setCustomFields((selected.customFields as Record<string, string>) || {});
      setShowAddField(false);
      setEditingFieldKey(null);
      setShowTimeline(false);
      setTimeline([]);
    } else {
      setFriendTags([]);
      setAiAnalysis(null);
      setCustomFields({});
      setTimeline([]);
    }
  }, [selected?.id, loadFriendTags]);

  async function handleAiAnalysis() {
    if (!selected) return;
    setAnalyzingAi(true);
    setAiAnalysis(null);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';
      const res = await fetch(`${API_BASE}/api/v1/ai/analyze-friend/${selected.id}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setAiAnalysis(data);
    } catch {
      setAiAnalysis({ analysis: '分析に失敗しました', tags: [], score: 0 });
    } finally {
      setAnalyzingAi(false);
    }
  }

  async function handleAssignTag(tagId: string) {
    if (!selected) return;
    try {
      await api.friends.assignTag(selected.id, tagId);
      await loadFriendTags(selected.id);
      setShowTagPicker(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'タグの割り当てに失敗しました');
    }
  }

  async function handleRemoveTag(tagId: string) {
    if (!selected) return;
    try {
      await api.friends.removeTag(selected.id, tagId);
      await loadFriendTags(selected.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'タグの削除に失敗しました');
    }
  }

  async function handleAddCustomField() {
    if (!selected || !newFieldKey.trim()) return;
    setSavingFields(true);
    try {
      await api.friends.updateCustomFields(selected.id, { [newFieldKey.trim()]: newFieldValue });
      setCustomFields({ ...customFields, [newFieldKey.trim()]: newFieldValue });
      setNewFieldKey('');
      setNewFieldValue('');
      setShowAddField(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'カスタムフィールドの追加に失敗しました');
    } finally {
      setSavingFields(false);
    }
  }

  async function handleUpdateCustomField(key: string, value: string) {
    if (!selected) return;
    setSavingFields(true);
    try {
      await api.friends.updateCustomFields(selected.id, { [key]: value });
      setCustomFields({ ...customFields, [key]: value });
      setEditingFieldKey(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'カスタムフィールドの更新に失敗しました');
    } finally {
      setSavingFields(false);
    }
  }

  async function handleDeleteCustomField(key: string) {
    if (!selected) return;
    setSavingFields(true);
    try {
      await api.friends.updateCustomFields(selected.id, { [key]: null });
      const updated = { ...customFields };
      delete updated[key];
      setCustomFields(updated);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'カスタムフィールドの削除に失敗しました');
    } finally {
      setSavingFields(false);
    }
  }

  useEffect(() => {
    api.friends
      .list({ search: search || undefined, limit: 50 })
      .then(setFriends)
      .catch(() => { toast.error('友だち一覧の取得に失敗しました'); })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    api.tags.list().then(setTags).catch(() => { toast.error('タグ一覧の取得に失敗しました'); });
  }, []);

  // Listen for AI Copilot fill events
  useEffect(() => {
    function handleAiFill(e: Event) {
      const { type, data } = (e as CustomEvent).detail;
      if (type === 'create_tags' && data?.tags && Array.isArray(data.tags)) {
        // Auto-create tags from AI suggestions
        Promise.all(
          data.tags.map((t: { name: string; color?: string }) =>
            api.tags.create({ name: t.name, color: t.color || '#3B82F6' }).catch(() => { toast.error('タグの作成に失敗しました'); return null; })
          )
        ).then(() => {
          api.tags.list().then(setTags).catch(() => { toast.error('タグ一覧の再取得に失敗しました'); });
        });
      }
    }
    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, []);

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const tag = await api.tags.create({ name: newTagName, color: newTagColor }) as TagType;
      setTags((prev) => [...prev, tag]);
      setNewTagName('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'タグの作成に失敗しました');
    } finally { setCreatingTag(false); }
  }

  async function handleDeleteTag(id: string) {
    if (!confirm('このタグを削除しますか？')) return;
    try {
      await api.tags.delete(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error('タグの削除に失敗しました');
    }
  }

  async function handleExportCsv() {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';
    const res = await fetch(`${API_BASE}/api/v1/friends/export/csv`, { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `friends_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await api.friends.importCsv(text);
      setImportResult(result);
      // Refresh friends list
      const updated = await api.friends.list({ search: search || undefined, limit: 100 });
      setFriends(updated);
      const updatedTags = await api.tags.list();
      setTags(updatedTags);
    } catch (err: unknown) {
      setImportResult({ errors: [err instanceof Error ? err.message : 'インポートに失敗しました'] });
    } finally {
      setImporting(false);
    }
  }

  const tagColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">友だち</h1>
          <p className="text-sm text-muted-foreground">{friends.length}人</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImport(!showImport)}
            variant={showImport ? 'default' : 'outline'}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-1" />
            CSVインポート
          </Button>
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-1" />
            CSVエクスポート
          </Button>
          <Button
            onClick={() => setShowTags(!showTags)}
            variant={showTags ? 'default' : 'outline'}
            size="sm"
          >
            <Tag className="h-4 w-4 mr-1" />
            タグ管理
          </Button>
        </div>
      </div>

      {/* CSV Import panel */}
      {showImport && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">CSVインポート</h3>
            <p className="text-xs text-muted-foreground">
              CSVファイルから友だちを一括登録します。タグも自動で作成・割り当てされます。
            </p>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 space-y-1">
              <p className="font-medium">対応フォーマット:</p>
              <p>• <strong>LinQ形式:</strong> 表示名,LINE ID,タグ,スコア,...</p>
              <p>• <strong>エルメ形式:</strong> 表示名,LINE UID,タグ,...</p>
              <p>• タグは <code>|</code> 区切り（例: VIP|来店済み|新規）</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportCsv(file);
                }}
                className="text-sm"
              />
              {importing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  インポート中...
                </div>
              )}
            </div>
            {importResult && (
              <div className="text-xs space-y-1 border rounded p-3">
                <p className="font-medium">結果:</p>
                {(importResult.imported ?? 0) > 0 && <p className="text-green-600">新規登録: {importResult.imported}件</p>}
                {(importResult.updated ?? 0) > 0 && <p className="text-blue-600">更新: {importResult.updated}件</p>}
                {(importResult.tagsCreated ?? 0) > 0 && <p className="text-purple-600">タグ作成: {importResult.tagsCreated}件</p>}
                {(importResult.errors?.length ?? 0) > 0 && (
                  <div className="text-red-500 mt-1">
                    <p>エラー:</p>
                    {importResult.errors?.map((e: string, i: number) => <p key={i}>• {e}</p>)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tag management */}
      {showTags && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">タグ管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateTag} className="flex items-center gap-3">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="タグ名..."
                className="w-40"
              />
              <div className="flex gap-1.5">
                {tagColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTagColor(c)}
                    className="w-5 h-5 rounded-full cursor-pointer"
                    style={{
                      background: c,
                      border: newTagColor === c ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
              <Button type="submit" size="sm" disabled={creatingTag || !newTagName.trim()}>
                <Plus className="h-3 w-3 mr-1" /> 追加
              </Button>
            </form>
            {tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ background: tag.color || '#3B82F6' }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="ml-1 hover:opacity-100 opacity-70"
                      aria-label="削除"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="検索..."
          className="pl-9"
        />
      </div>

      {/* Content */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {loading ? (
            <PageSkeleton />
          ) : friends.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  illustration="friends"
                  title="友だちがいません"
                  description="LINE公式アカウントに友だちが追加されると表示されます"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>タグ</TableHead>
                    <TableHead>スコア</TableHead>
                    <TableHead>追加日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {friends.map((f) => (
                    <TableRow
                      key={f.id}
                      onClick={() => setSelected(f)}
                      className={cn('cursor-pointer', selected?.id === f.id && 'bg-muted/50')}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {f.pictureUrl ? (
                              <AvatarImage src={f.pictureUrl} alt="" />
                            ) : null}
                            <AvatarFallback>
                              <Users className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{f.displayName || '名前未設定'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.isFollowing ? 'default' : 'destructive'}>
                          {f.isFollowing ? 'フォロー中' : 'ブロック'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(f.tags || []).map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                              style={{ background: t.color || '#3B82F6' }}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-sm font-medium',
                          (f.score ?? 0) >= 30 ? 'text-green-600' :
                          (f.score ?? 0) >= 10 ? 'text-blue-600' :
                          'text-muted-foreground'
                        )}>
                          {f.score ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {f.createdAt ? new Date(f.createdAt).toLocaleDateString('ja-JP') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <Card className="w-80 shrink-0 self-start">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{selected.displayName || '名前未設定'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="h-8 w-8 p-0" aria-label="閉じる">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Avatar className="h-16 w-16">
                  {selected.pictureUrl ? (
                    <AvatarImage src={selected.pictureUrl} alt="" />
                  ) : null}
                  <AvatarFallback>
                    <Users className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">プロフィール</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ステータス</span>
                    <Badge variant={selected.isFollowing ? 'default' : 'destructive'}>
                      {selected.isFollowing ? 'フォロー中' : 'ブロック'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">エンゲージメント</span>
                    <span className={cn(
                      'text-sm font-medium',
                      (selected.score ?? 0) >= 30 ? 'text-green-600' :
                      (selected.score ?? 0) >= 10 ? 'text-blue-600' :
                      'text-muted-foreground'
                    )}>
                      {selected.score ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">追加日</span>
                    <span className="text-xs">
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('ja-JP') : '-'}
                    </span>
                  </div>
                  {selected.lineUserId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">LINE ID</span>
                      <span className="text-xs font-mono">
                        {selected.lineUserId.slice(0, 12)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">タグ</h4>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowTagPicker(!showTagPicker)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      追加
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                    {showTagPicker && (
                      <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border bg-popover p-1 shadow-md">
                        {tags.filter((t) => !friendTags.some((ft) => ft.id === t.id)).length === 0 ? (
                          <p className="text-xs text-muted-foreground p-2 text-center">
                            割り当て可能なタグがありません
                          </p>
                        ) : (
                          tags
                            .filter((t) => !friendTags.some((ft) => ft.id === t.id))
                            .map((t) => (
                              <button
                                key={t.id}
                                className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                onClick={() => handleAssignTag(t.id)}
                              >
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ background: t.color || '#3B82F6' }}
                                />
                                {t.name}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {loadingFriendTags ? (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : friendTags.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {friendTags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ background: t.color || '#3B82F6' }}
                      >
                        {t.name}
                        <button
                          onClick={() => handleRemoveTag(t.id)}
                          className="ml-1 hover:opacity-100 opacity-70"
                          aria-label="削除"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">タグなし</p>
                )}
              </div>

              <Separator />

              {/* Custom Fields */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">カスタムフィールド</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowAddField(!showAddField)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    追加
                  </Button>
                </div>

                {Object.keys(customFields).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(customFields).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5 group">
                        {editingFieldKey === key ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-xs font-medium text-muted-foreground shrink-0">{key}:</span>
                            <Input
                              value={editingFieldValue}
                              onChange={(e) => setEditingFieldValue(e.target.value)}
                              className="h-6 text-xs flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCustomField(key, editingFieldValue);
                                if (e.key === 'Escape') setEditingFieldKey(null);
                              }}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => handleUpdateCustomField(key, editingFieldValue)}
                              disabled={savingFields}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => {
                                setEditingFieldKey(key);
                                setEditingFieldValue(String(value));
                              }}
                            >
                              <span className="text-xs font-medium text-muted-foreground">{key}</span>
                              <p className="text-xs truncate">{String(value)}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteCustomField(key)}
                              className="opacity-0 group-hover:opacity-70 hover:opacity-100 ml-1"
                              aria-label="削除"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">カスタムフィールドなし</p>
                )}

                {showAddField && (
                  <div className="space-y-2 border rounded-md p-2 bg-muted/30">
                    <Input
                      value={newFieldKey}
                      onChange={(e) => setNewFieldKey(e.target.value)}
                      placeholder="フィールド名 (例: 会員番号)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      placeholder="値"
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCustomField();
                      }}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={handleAddCustomField}
                        disabled={savingFields || !newFieldKey.trim()}
                      >
                        {savingFields ? '保存中...' : '保存'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => { setShowAddField(false); setNewFieldKey(''); setNewFieldValue(''); }}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* AI Analysis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">AI分析</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1"
                    onClick={handleAiAnalysis}
                    disabled={analyzingAi}
                  >
                    <Sparkles className="h-3 w-3" />
                    {analyzingAi ? '分析中...' : '分析する'}
                  </Button>
                </div>
                {analyzingAi && (
                  <div className="flex justify-center py-3">
                    <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                  </div>
                )}
                {aiAnalysis && !analyzingAi && (
                  <div className="space-y-2 bg-purple-50 rounded-lg p-3">
                    <p className="text-xs whitespace-pre-wrap">{aiAnalysis.analysis}</p>
                    {aiAnalysis.nextAction && (
                      <div className="pt-1 border-t border-purple-100">
                        <p className="text-[11px] text-muted-foreground">推奨アクション</p>
                        <p className="text-xs font-medium text-purple-700">{aiAnalysis.nextAction}</p>
                      </div>
                    )}
                    {(aiAnalysis.tags?.length ?? 0) > 0 && (
                      <div className="flex gap-1 flex-wrap pt-1">
                        {aiAnalysis.tags?.map((t: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {typeof aiAnalysis.score === 'number' && aiAnalysis.score > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        AI推定スコア: <span className="font-medium text-purple-600">{aiAnalysis.score}</span>/100
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    if (!showTimeline && timeline.length === 0) {
                      loadTimeline(selected.id);
                    }
                    setShowTimeline(!showTimeline);
                  }}
                >
                  <Clock className="h-4 w-4" />
                  タイムライン
                  <ChevronDown className={cn('h-3 w-3 ml-auto transition-transform', showTimeline && 'rotate-180')} />
                </Button>

                {showTimeline && (
                  <div className="mt-3 space-y-1 max-h-[400px] overflow-y-auto">
                    {loadingTimeline ? (
                      <p className="text-xs text-center text-muted-foreground py-4">読み込み中...</p>
                    ) : timeline.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-4">アクティビティがありません</p>
                    ) : (
                      <>
                        {timeline.map((event) => (
                          <TimelineEventItem key={event.id} event={event} />
                        ))}
                        {timelineTotal > timeline.length && (
                          <p className="text-[11px] text-center text-muted-foreground pt-2">
                            他 {timelineTotal - timeline.length} 件のアクティビティ
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <a href="/messages">
                <Button className="w-full gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  メッセージ
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TimelineEventItem({ event }: { event: TimelineEventData }) {
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const contentText = (() => {
    if (!event.data?.content) return null;
    const c = event.data.content;
    if (typeof c === 'string') return c;
    if (c.text) return c.text;
    if (c.type) return `[${c.type}]`;
    return JSON.stringify(c).slice(0, 60);
  })();

  switch (event.type) {
    case 'message_received':
      return (
        <div className="flex gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
          <ArrowDownLeft className="h-3.5 w-3.5 mt-0.5 text-purple-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{time} · 受信</p>
            {contentText && <p className="text-xs truncate">{contentText}</p>}
          </div>
        </div>
      );
    case 'message_sent':
      return (
        <div className="flex gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
          <ArrowUpRight className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{time} · 送信</p>
            {contentText && <p className="text-xs truncate">{contentText}</p>}
          </div>
        </div>
      );
    case 'followed':
      return (
        <div className="flex gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
          <UserPlus className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
          <p className="text-xs text-muted-foreground">{time} · 友だち追加</p>
        </div>
      );
    case 'unfollowed':
      return (
        <div className="flex gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
          <UserMinus className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
          <p className="text-xs text-muted-foreground">{time} · ブロック</p>
        </div>
      );
    default:
      return (
        <div className="flex gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
          <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{time} · {event.type}</p>
        </div>
      );
  }
}
