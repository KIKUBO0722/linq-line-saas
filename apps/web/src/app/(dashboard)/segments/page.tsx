'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { Filter, Plus, Trash2, Send, Eye, Users, Ban, Sparkles, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Segment, Tag } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import { HelpTip } from '@/components/ui/help-tip';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [matchType, setMatchType] = useState<'any' | 'all'>('any');
  const [excludeTagIds, setExcludeTagIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Preview
  const [previewSegmentId, setPreviewSegmentId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ count: number; friends: Array<{ id: string; displayName?: string | null; lineUserId?: string }> } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Broadcast
  const [broadcastSegmentId, setBroadcastSegmentId] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ name: string; description: string; tagNames: string[]; matchType: 'any' | 'all'; reasoning: string; estimatedFriendCount: number }>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [creatingFromAi, setCreatingFromAi] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Listen for AI-generated segment fill events
  useEffect(() => {
    function handleAiFill(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.type !== 'create_segment') return;

      const data = detail.data as { name?: string; description?: string; tagNames?: string[] };
      if (data.name) setNewName(data.name);
      if (data.description) setNewDescription(data.description);

      // Look up tag IDs by name from existing tags
      if (data.tagNames && data.tagNames.length > 0 && tags.length > 0) {
        const matchedIds = data.tagNames
          .map((name) => tags.find((t) => t.name === name))
          .filter((t): t is Tag => t != null)
          .map((t) => t.id);
        if (matchedIds.length > 0) {
          setSelectedTagIds(matchedIds);
        }
      }

      setShowCreate(true);
    }

    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, [tags]);

  async function loadData() {
    try {
      const [segmentsData, tagsData] = await Promise.all([
        api.segments.list(),
        api.tags.list(),
      ]);
      setSegments(Array.isArray(segmentsData) ? segmentsData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
    } catch {
      setSegments([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
    // Remove from excludeTagIds if added to include
    setExcludeTagIds((prev) => prev.filter((id) => id !== tagId));
  }

  function toggleExcludeTag(tagId: string) {
    setExcludeTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
    // Remove from selectedTagIds if added to exclude
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || selectedTagIds.length === 0) {
      toast.error('セグメント名とタグを1つ以上選択してください');
      return;
    }
    setCreating(true);
    try {
      const segment = await api.segments.create({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        tagIds: selectedTagIds,
        matchType,
        excludeTagIds,
      });
      setSegments((prev) => [...prev, segment as Segment]);
      setNewName('');
      setNewDescription('');
      setSelectedTagIds([]);
      setMatchType('any');
      setExcludeTagIds([]);
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'セグメントの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このセグメントを削除しますか？')) return;
    try {
      await api.segments.delete(id);
      setSegments((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'セグメントの削除に失敗しました');
    }
  }

  async function handlePreview(id: string) {
    if (previewSegmentId === id) {
      setPreviewSegmentId(null);
      setPreviewData(null);
      return;
    }
    setPreviewing(true);
    setPreviewSegmentId(id);
    try {
      const data = await api.segments.preview(id);
      setPreviewData(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'プレビューの取得に失敗しました');
      setPreviewSegmentId(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleBroadcast(id: string) {
    if (!broadcastMessage.trim()) return;
    if (!confirm('このセグメントにメッセージを配信しますか？')) return;
    setBroadcasting(true);
    try {
      const result = await api.segments.broadcast(id, { message: broadcastMessage.trim() }) as { recipientCount: number };
      toast(`${result.recipientCount}人に配信しました`);
      setBroadcastSegmentId(null);
      setBroadcastMessage('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '配信に失敗しました');
    } finally {
      setBroadcasting(false);
    }
  }

  function getTagById(tagId: string) {
    return tags.find((t) => t.id === tagId);
  }

  return (
    <div className="px-1 pt-1 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">セグメント配信</h1>
            <HelpTip content="条件に合う友だちだけにメッセージを送る絞り込み配信の設定画面です" />
          </div>
          <p className="text-sm text-muted-foreground">タグでフィルタしたグループにターゲット配信</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setShowAiPanel(true);
              setAiLoading(true);
              try {
                const result = await api.ai.suggestSegments();
                setAiSuggestions(result.suggestions);
              } catch {
                toast.error('AIセグメント提案の取得に失敗しました');
              } finally {
                setAiLoading(false);
              }
            }}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            AI提案
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            セグメント作成
          </Button>
        </div>
      </div>

      {/* AI Segment Suggestions */}
      {showAiPanel && (
        <Card className="border-[#06C755]/30 bg-[#06C755]/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#06C755]" />
                AIセグメント提案
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAiPanel(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">データを分析中...</span>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">提案を生成できませんでした</p>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">
                          <Users className="h-3 w-3 mr-0.5" />
                          約{s.estimatedFriendCount}人
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={creatingFromAi === i}
                          onClick={async () => {
                            setCreatingFromAi(i);
                            try {
                              const tagIds = s.tagNames
                                .map((name) => tags.find((t) => t.name === name)?.id)
                                .filter((id): id is string => !!id);
                              if (tagIds.length === 0) {
                                toast.error('対応するタグが見つかりません');
                                return;
                              }
                              await api.segments.create({
                                name: s.name,
                                description: s.description,
                                tagIds,
                                matchType: s.matchType,
                              });
                              toast.success(`「${s.name}」を作成しました`);
                              await loadData();
                            } catch {
                              toast.error('セグメント作成に失敗しました');
                            } finally {
                              setCreatingFromAi(null);
                            }
                          }}
                          className="gap-1"
                        >
                          {creatingFromAi === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          作成
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.tagNames.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                      <Badge variant="secondary" className="text-[10px]">{s.matchType === 'all' ? 'AND' : 'OR'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.reasoning}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規セグメント</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">セグメント名</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: VIP顧客、来店済み"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">説明（任意）</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="セグメントの説明"
                />
              </div>

              {/* Match type toggle */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">マッチ条件</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchType('any')}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      matchType === 'any'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    いずれかのタグ (OR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('all')}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      matchType === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    すべてのタグ (AND)
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {matchType === 'any'
                    ? '選択したタグのいずれかを持つフレンドにマッチします'
                    : '選択したタグをすべて持つフレンドにマッチします'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">フィルタするタグ（1つ以上選択）</label>
                {tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">タグがありません。先にタグを作成してください。</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="transition-all"
                      >
                        <Badge
                          variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
                          className="cursor-pointer text-sm"
                          style={{
                            borderColor: tag.color || '#6B7280',
                            color: selectedTagIds.includes(tag.id) ? '#fff' : (tag.color || '#6B7280'),
                            backgroundColor: selectedTagIds.includes(tag.id) ? (tag.color || '#6B7280') : 'transparent',
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full mr-1.5 inline-block"
                            style={{ backgroundColor: selectedTagIds.includes(tag.id) ? '#fff' : (tag.color || '#6B7280') }}
                          />
                          {tag.name}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Exclude tags */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Ban className="h-3.5 w-3.5 text-destructive" />
                  除外タグ（任意）
                </label>
                <p className="text-xs text-muted-foreground">これらのタグを持つフレンドは配信対象から除外されます</p>
                {tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">タグがありません。</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.filter((t) => !selectedTagIds.includes(t.id)).map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleExcludeTag(tag.id)}
                        className="transition-all"
                      >
                        <Badge
                          variant={excludeTagIds.includes(tag.id) ? 'destructive' : 'outline'}
                          className="cursor-pointer text-sm"
                          style={{
                            borderColor: excludeTagIds.includes(tag.id) ? undefined : (tag.color || '#6B7280'),
                            color: excludeTagIds.includes(tag.id) ? '#fff' : (tag.color || '#6B7280'),
                          }}
                        >
                          <Ban className="w-2.5 h-2.5 mr-1 inline-block" />
                          {tag.name}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating || !newName.trim() || selectedTagIds.length === 0}>
                  {creating ? '作成中...' : '作成'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setSelectedTagIds([]); setExcludeTagIds([]); setMatchType('any'); }}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Segments list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">セグメント一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageSkeleton />
          ) : segments.length === 0 ? (
            <EmptyState
              illustration="segments"
              title="セグメントがまだありません"
              description="「セグメント作成」から最初のセグメントを作成しましょう"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>セグメント</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>タグ</TableHead>
                  <TableHead className="w-[180px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{segment.name}</p>
                        {segment.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{segment.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={segment.matchType === 'all' ? 'default' : 'secondary'} className="text-xs">
                        {segment.matchType === 'all' ? 'AND' : 'OR'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {segment.tagIds.map((tagId) => {
                          const tag = getTagById(tagId);
                          return tag ? (
                            <Badge
                              key={tagId}
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: tag.color || '#6B7280',
                                color: tag.color || '#6B7280',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full mr-1 inline-block"
                                style={{ backgroundColor: tag.color || '#6B7280' }}
                              />
                              {tag.name}
                            </Badge>
                          ) : (
                            <Badge key={tagId} variant="outline" className="text-xs text-muted-foreground">
                              不明
                            </Badge>
                          );
                        })}
                        {(segment.excludeTagIds || []).map((tagId) => {
                          const tag = getTagById(tagId);
                          return tag ? (
                            <Badge
                              key={`ex-${tagId}`}
                              variant="destructive"
                              className="text-xs"
                            >
                              <Ban className="w-2 h-2 mr-0.5" />
                              {tag.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handlePreview(segment.id)} title="プレビュー" aria-label="プレビュー">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setBroadcastSegmentId(broadcastSegmentId === segment.id ? null : segment.id)} title="配信" aria-label="配信">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(segment.id)} className="text-destructive hover:text-destructive" title="削除" aria-label="削除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview panel */}
      {previewSegmentId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              マッチするフレンド
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewing ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : previewData ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">{previewData.count}人がマッチ</p>
                {previewData.friends.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {previewData.friends.map((f) => (
                      <Badge key={f.id} variant="secondary" className="text-xs">
                        {f.displayName || f.lineUserId}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">マッチするフレンドがいません</p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Broadcast panel */}
      {broadcastSegmentId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              セグメント配信
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">メッセージ</label>
                <Textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="配信するメッセージを入力"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBroadcast(broadcastSegmentId)}
                  disabled={broadcasting || !broadcastMessage.trim()}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {broadcasting ? '配信中...' : '配信する'}
                </Button>
                <Button variant="ghost" onClick={() => { setBroadcastSegmentId(null); setBroadcastMessage(''); }}>
                  キャンセル
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
