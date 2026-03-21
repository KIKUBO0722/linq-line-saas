'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, MessageSquare, Users, Search, Radio, FileStack, Clock, CalendarClock, Image as ImageIcon, Video, Code2, Plus, X, Zap } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Template picker dropdown component
function TemplatePicker({
  onSelect,
}: {
  onSelect: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !loaded) {
      api.templates
        .list()
        .then((t) => {
          setTemplates(t);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  }, [open, loaded]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Group templates by category
  const grouped = templates.reduce<Record<string, any[]>>((acc, t) => {
    const cat = t.category || '未分類';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        title="テンプレートを挿入"
      >
        <FileStack className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute bottom-full mb-1 right-0 z-50 w-64 max-h-72 overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {!loaded ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              テンプレートがありません
            </p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </p>
                {items.map((t: any) => (
                  <button
                    key={t.id}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors truncate"
                    onClick={() => {
                      onSelect(t.content);
                      setOpen(false);
                    }}
                    title={t.content}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const [tab, setTab] = useState<'chat' | 'broadcast'>('chat');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Multi-type message state for chat
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'flex'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [flexJson, setFlexJson] = useState('');

  // Multi-type message state for broadcast
  const [broadcastType, setBroadcastType] = useState<'text' | 'image' | 'video' | 'flex'>('text');
  const [broadcastMediaUrl, setBroadcastMediaUrl] = useState('');
  const [broadcastPreviewUrl, setBroadcastPreviewUrl] = useState('');
  const [broadcastFlexJson, setBroadcastFlexJson] = useState('');

  // Quick reply state for chat
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [quickReplyItems, setQuickReplyItems] = useState<Array<{ label: string; text: string }>>([]);

  // Quick reply state for broadcast
  const [showBroadcastQuickReply, setShowBroadcastQuickReply] = useState(false);
  const [broadcastQuickReplyItems, setBroadcastQuickReplyItems] = useState<Array<{ label: string; text: string }>>([]);

  useEffect(() => {
    api.friends
      .list({ search: search || undefined, limit: 100 })
      .then(setFriends)
      .catch(() => {})
      .finally(() => setLoadingFriends(false));
  }, [search]);

  useEffect(() => {
    if (!selectedFriend) return;
    setLoadingMessages(true);
    api.messages
      .conversation(selectedFriend.id)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [selectedFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for AI copilot fill events
  useEffect(() => {
    function handleAiFill(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'generate_message' && detail?.data?.text) {
        setTab('broadcast');
        setBroadcastType('text');
        setBroadcastContent(detail.data.text);
      }
    }
    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, []);

  async function handleSend() {
    if (!selectedFriend) return;
    setSending(true);
    try {
      let message: any;
      switch (messageType) {
        case 'text':
          if (!content.trim()) return;
          message = { type: 'text', text: content };
          break;
        case 'image':
          if (!mediaUrl.trim()) return;
          message = { type: 'image', originalContentUrl: mediaUrl, previewImageUrl: previewUrl || mediaUrl };
          break;
        case 'video':
          if (!mediaUrl.trim() || !previewUrl.trim()) return;
          message = { type: 'video', originalContentUrl: mediaUrl, previewImageUrl: previewUrl };
          break;
        case 'flex':
          if (!flexJson.trim()) return;
          try {
            message = { type: 'flex', altText: 'Flex\u30E1\u30C3\u30BB\u30FC\u30B8', contents: JSON.parse(flexJson) };
          } catch {
            alert('JSON\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093');
            return;
          }
          break;
      }

      // Attach quick reply if items exist
      if (quickReplyItems.length > 0 && quickReplyItems.some(item => item.label.trim() && item.text.trim())) {
        message.quickReply = {
          items: quickReplyItems
            .filter(item => item.label.trim() && item.text.trim())
            .map(item => ({
              type: 'action' as const,
              action: { type: 'message', label: item.label, text: item.text },
            })),
        };
      }

      await api.messages.sendMessage({ friendId: selectedFriend.id, message });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          direction: 'outbound',
          messageType: message.type,
          content: message,
          createdAt: new Date().toISOString(),
        },
      ]);
      setContent('');
      setMediaUrl('');
      setPreviewUrl('');
      setFlexJson('');
      setQuickReplyItems([]);
      setShowQuickReply(false);
    } catch (err: any) {
      alert(err.message || '\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F');
    } finally {
      setSending(false);
    }
  }

  async function handleBroadcast() {
    setSending(true);
    try {
      // Check if this is a scheduled text broadcast (use old API for backwards compat)
      const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

      if (broadcastType === 'text') {
        if (!broadcastContent.trim()) return;
        if (isScheduled) {
          await api.messages.broadcast({
            text: broadcastContent,
            scheduledAt: new Date(scheduledAt).toISOString(),
          });
          const dt = new Date(scheduledAt);
          setScheduledAt('');
          setBroadcastContent('');
          alert(
            `\u4E88\u7D04\u914D\u4FE1\u3092\u8A2D\u5B9A\u3057\u307E\u3057\u305F: ${dt.toLocaleDateString('ja-JP')} ${dt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
          );
          return;
        }
      }

      let message: any;
      switch (broadcastType) {
        case 'text':
          if (!broadcastContent.trim()) return;
          message = { type: 'text', text: broadcastContent };
          break;
        case 'image':
          if (!broadcastMediaUrl.trim()) return;
          message = { type: 'image', originalContentUrl: broadcastMediaUrl, previewImageUrl: broadcastPreviewUrl || broadcastMediaUrl };
          break;
        case 'video':
          if (!broadcastMediaUrl.trim() || !broadcastPreviewUrl.trim()) return;
          message = { type: 'video', originalContentUrl: broadcastMediaUrl, previewImageUrl: broadcastPreviewUrl };
          break;
        case 'flex':
          if (!broadcastFlexJson.trim()) return;
          try {
            message = { type: 'flex', altText: 'Flex\u30E1\u30C3\u30BB\u30FC\u30B8', contents: JSON.parse(broadcastFlexJson) };
          } catch {
            alert('JSON\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093');
            return;
          }
          break;
      }

      // Attach quick reply if items exist
      if (broadcastQuickReplyItems.length > 0 && broadcastQuickReplyItems.some(item => item.label.trim() && item.text.trim())) {
        message.quickReply = {
          items: broadcastQuickReplyItems
            .filter(item => item.label.trim() && item.text.trim())
            .map(item => ({
              type: 'action' as const,
              action: { type: 'message', label: item.label, text: item.text },
            })),
        };
      }

      await api.messages.broadcastMessage({ message });
      setBroadcastContent('');
      setBroadcastMediaUrl('');
      setBroadcastPreviewUrl('');
      setBroadcastFlexJson('');
      setBroadcastQuickReplyItems([]);
      setShowBroadcastQuickReply(false);
      alert('\u4E00\u6589\u914D\u4FE1\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F');
    } catch (err: any) {
      alert(err.message || '\u914D\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F');
    } finally {
      setSending(false);
    }
  }

  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

  function renderMessageContent(msg: any) {
    const c = msg.content as any;
    const type = msg.messageType || c?.type || 'text';
    switch (type) {
      case 'image':
        return (
          <div>
            <img
              src={c.originalContentUrl || c.previewImageUrl}
              alt=""
              className="max-w-full rounded-lg max-h-48 object-cover"
            />
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            <span className="text-sm">動画メッセージ</span>
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">音声メッセージ</span>
          </div>
        );
      case 'sticker':
        return <p className="text-sm">スタンプ</p>;
      case 'flex':
        return (
          <div className="text-sm">
            <p className="font-medium">Flexメッセージ</p>
            <p className="text-xs opacity-70">{c.altText || ''}</p>
          </div>
        );
      default:
        return <p className="text-sm">{c?.text || (typeof c === 'string' ? c : JSON.stringify(c))}</p>;
    }
  }

  // Determine if the broadcast send button should be disabled
  const isBroadcastDisabled = sending || (() => {
    switch (broadcastType) {
      case 'text': return !broadcastContent.trim();
      case 'image': return !broadcastMediaUrl.trim();
      case 'video': return !broadcastMediaUrl.trim() || !broadcastPreviewUrl.trim();
      case 'flex': return !broadcastFlexJson.trim();
      default: return true;
    }
  })();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">メッセージ</h1>
        <p className="text-sm text-muted-foreground">友だちとの会話・一斉配信</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'chat' | 'broadcast')}>
        <TabsList>
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            個別チャット
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5">
            <Radio className="h-4 w-4" />
            一斉配信
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card className="overflow-hidden">
            <div className="flex h-[600px]">
              {/* Friends sidebar */}
              <div className="w-72 border-r flex flex-col">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="友だちを検索..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {loadingFriends ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : friends.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">友だちがいません</p>
                  ) : (
                    friends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors',
                          selectedFriend?.id === friend.id && 'bg-muted'
                        )}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          {friend.pictureUrl ? (
                            <AvatarImage src={friend.pictureUrl} alt="" />
                          ) : null}
                          <AvatarFallback>
                            <Users className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {friend.displayName || '名前未設定'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {friend.isFollowing ? 'フォロー中' : 'ブロック'}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>

              {/* Chat area */}
              <div className="flex-1 flex flex-col">
                {selectedFriend ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 border-b">
                      <Avatar className="h-8 w-8">
                        {selectedFriend.pictureUrl ? (
                          <AvatarImage src={selectedFriend.pictureUrl} alt="" />
                        ) : null}
                        <AvatarFallback>
                          <Users className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">
                        {selectedFriend.displayName || '名前未設定'}
                      </p>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                      {loadingMessages ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">まだメッセージがありません</p>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                'flex',
                                msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                              )}
                            >
                              <div
                                className={cn(
                                  'max-w-[70%] rounded-2xl px-4 py-2',
                                  msg.direction === 'outbound'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                )}
                              >
                                {renderMessageContent(msg)}
                                <p className={cn(
                                  'text-[10px] mt-1',
                                  msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                )}>
                                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </ScrollArea>

                    {/* Message type selector */}
                    <div className="flex items-center gap-1 px-4 py-1.5 border-t bg-muted/30">
                      {([
                        { type: 'text' as const, icon: MessageSquare, label: 'テキスト' },
                        { type: 'image' as const, icon: ImageIcon, label: '画像' },
                        { type: 'video' as const, icon: Video, label: '動画' },
                        { type: 'flex' as const, icon: Code2, label: 'Flex' },
                      ]).map((opt) => (
                        <button
                          key={opt.type}
                          onClick={() => setMessageType(opt.type)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                            messageType === opt.type
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted',
                          )}
                        >
                          <opt.icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Reply editor */}
                    {showQuickReply && (
                      <div className="px-4 py-2 border-t bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">クイックリプライ（最大13個）</p>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowQuickReply(false)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {quickReplyItems.map((item, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input
                              value={item.label}
                              onChange={(e) => {
                                const updated = [...quickReplyItems];
                                updated[i] = { ...item, label: e.target.value };
                                setQuickReplyItems(updated);
                              }}
                              placeholder="ラベル"
                              className="h-7 text-xs flex-1"
                              maxLength={20}
                            />
                            <Input
                              value={item.text}
                              onChange={(e) => {
                                const updated = [...quickReplyItems];
                                updated[i] = { ...item, text: e.target.value };
                                setQuickReplyItems(updated);
                              }}
                              placeholder="返信テキスト"
                              className="h-7 text-xs flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0"
                              onClick={() => setQuickReplyItems(quickReplyItems.filter((_, j) => j !== i))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {quickReplyItems.length < 13 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setQuickReplyItems([...quickReplyItems, { label: '', text: '' }])}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            追加
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Input area */}
                    <div className="flex items-center gap-2 px-4 py-3 border-t">
                      <TemplatePicker onSelect={(text) => setContent(text)} />
                      <Button
                        type="button"
                        variant={showQuickReply ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setShowQuickReply(!showQuickReply);
                          if (!showQuickReply && quickReplyItems.length === 0) {
                            setQuickReplyItems([{ label: '', text: '' }]);
                          }
                        }}
                        title="クイックリプライ"
                      >
                        <Zap className="h-4 w-4" />
                      </Button>

                      {messageType === 'text' && (
                        <Input
                          type="text"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                          placeholder="メッセージを入力..."
                          className="flex-1"
                        />
                      )}

                      {messageType === 'image' && (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            placeholder="画像URL (https://...)"
                            className="flex-1"
                          />
                        </div>
                      )}

                      {messageType === 'video' && (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            placeholder="動画URL"
                            className="flex-1"
                          />
                          <Input
                            value={previewUrl}
                            onChange={(e) => setPreviewUrl(e.target.value)}
                            placeholder="サムネイルURL"
                            className="w-40"
                          />
                        </div>
                      )}

                      {messageType === 'flex' && (
                        <Textarea
                          value={flexJson}
                          onChange={(e) => setFlexJson(e.target.value)}
                          placeholder='{"type": "bubble", "body": {...}}'
                          className="flex-1 text-xs font-mono"
                          rows={2}
                        />
                      )}

                      <Button onClick={handleSend} disabled={sending} size="sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">友だちを選択してチャットを開始</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>一斉配信</CardTitle>
              <CardDescription>接続されている全LINE公式アカウントのフォロワーに配信します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Broadcast type selector */}
              <div className="flex items-center gap-1">
                {([
                  { type: 'text' as const, label: 'テキスト' },
                  { type: 'image' as const, label: '画像' },
                  { type: 'video' as const, label: '動画' },
                  { type: 'flex' as const, label: 'Flex' },
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setBroadcastType(opt.type)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      broadcastType === opt.type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {broadcastType === 'text' && (
                <div className="relative">
                  <Textarea
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    rows={5}
                    placeholder="配信メッセージを入力..."
                  />
                  <div className="absolute top-2 right-2">
                    <TemplatePicker onSelect={(text) => setBroadcastContent(text)} />
                  </div>
                </div>
              )}

              {broadcastType === 'image' && (
                <div className="space-y-2">
                  <Input
                    value={broadcastMediaUrl}
                    onChange={(e) => setBroadcastMediaUrl(e.target.value)}
                    placeholder="画像URL (https://...)"
                  />
                  <Input
                    value={broadcastPreviewUrl}
                    onChange={(e) => setBroadcastPreviewUrl(e.target.value)}
                    placeholder="プレビュー画像URL（任意）"
                  />
                  {broadcastMediaUrl && (
                    <img
                      src={broadcastMediaUrl}
                      alt=""
                      className="max-h-32 rounded-lg object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  )}
                </div>
              )}

              {broadcastType === 'video' && (
                <div className="space-y-2">
                  <Input
                    value={broadcastMediaUrl}
                    onChange={(e) => setBroadcastMediaUrl(e.target.value)}
                    placeholder="動画URL (https://...mp4)"
                  />
                  <Input
                    value={broadcastPreviewUrl}
                    onChange={(e) => setBroadcastPreviewUrl(e.target.value)}
                    placeholder="サムネイルURL (必須)"
                  />
                </div>
              )}

              {broadcastType === 'flex' && (
                <Textarea
                  value={broadcastFlexJson}
                  onChange={(e) => setBroadcastFlexJson(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                  placeholder='{"type": "bubble", "body": {"type": "box", "layout": "vertical", "contents": [...]}}'
                />
              )}

              {/* Quick Reply for broadcast */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant={showBroadcastQuickReply ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowBroadcastQuickReply(!showBroadcastQuickReply);
                    if (!showBroadcastQuickReply && broadcastQuickReplyItems.length === 0) {
                      setBroadcastQuickReplyItems([{ label: '', text: '' }]);
                    }
                  }}
                  className="gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" />
                  クイックリプライ
                </Button>
                {showBroadcastQuickReply && (
                  <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground">クイックリプライ（最大13個）</p>
                    {broadcastQuickReplyItems.map((item, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          value={item.label}
                          onChange={(e) => {
                            const updated = [...broadcastQuickReplyItems];
                            updated[i] = { ...item, label: e.target.value };
                            setBroadcastQuickReplyItems(updated);
                          }}
                          placeholder="ラベル（最大20文字）"
                          className="h-8 text-xs flex-1"
                          maxLength={20}
                        />
                        <Input
                          value={item.text}
                          onChange={(e) => {
                            const updated = [...broadcastQuickReplyItems];
                            updated[i] = { ...item, text: e.target.value };
                            setBroadcastQuickReplyItems(updated);
                          }}
                          placeholder="返信テキスト"
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => setBroadcastQuickReplyItems(broadcastQuickReplyItems.filter((_, j) => j !== i))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {broadcastQuickReplyItems.length < 13 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setBroadcastQuickReplyItems([...broadcastQuickReplyItems, { label: '', text: '' }])}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        追加
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Schedule input - only for text type */}
              {broadcastType === 'text' && (
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <label className="text-sm text-muted-foreground shrink-0">予約配信:</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-auto"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {scheduledAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScheduledAt('')}
                      className="text-xs text-muted-foreground"
                    >
                      クリア
                    </Button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                {broadcastType === 'text' ? (
                  <p className="text-sm text-muted-foreground">{broadcastContent.length} 文字</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {broadcastType === 'image' ? '画像配信' : broadcastType === 'video' ? '動画配信' : 'Flex配信'}
                  </p>
                )}
                <Button
                  onClick={handleBroadcast}
                  disabled={isBroadcastDisabled}
                >
                  {broadcastType === 'text' && isScheduled ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      {sending ? '予約中...' : '予約配信'}
                    </>
                  ) : (
                    <>
                      <Radio className="h-4 w-4 mr-2" />
                      {sending ? '配信中...' : '一斉配信する'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
