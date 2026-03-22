'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Trash2, Clock, User, Bell, Settings, Link } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ReservationSlot, Reservation, CalendarIntegration } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectOption } from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';

// Extended reservation type with computed slot fields from the API response
interface ReservationWithSlot extends Reservation {
  slotName: string;
  slotDuration: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: '確定', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
  completed: { label: '完了', color: 'bg-gray-100 text-gray-600' },
};

export default function ReservationsPage() {
  const [tab, setTab] = useState('reservations');
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [reservations, setReservations] = useState<ReservationWithSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);

  // Slot creation
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotName, setSlotName] = useState('');
  const [slotDuration, setSlotDuration] = useState('30');
  const [slotDescription, setSlotDescription] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);

  // Reservation creation
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [resSlotId, setResSlotId] = useState('');
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resGuestName, setResGuestName] = useState('');
  const [resNote, setResNote] = useState('');
  const [creatingRes, setCreatingRes] = useState(false);

  // Reminder
  const [resReminderMinutes, setResReminderMinutes] = useState('');

  // Google Calendar
  const [calendarIntegration, setCalendarIntegration] = useState<CalendarIntegration | null>(null);
  const [calendarId, setCalendarId] = useState('');
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [savingCalendar, setSavingCalendar] = useState(false);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadSlots();
    loadReservations();
    loadCalendarIntegration();
  }, []);

  // Listen for AI Copilot fill events
  useEffect(() => {
    function handleAiFill(e: Event) {
      const { type, data } = (e as CustomEvent).detail;
      if (type === 'create_reservation_slot' && data) {
        if (data.name) setSlotName(data.name);
        if (data.duration) setSlotDuration(String(data.duration));
        if (data.description) setSlotDescription(data.description);
        setTab('slots');
      }
    }
    window.addEventListener('linq-ai-fill', handleAiFill);
    return () => window.removeEventListener('linq-ai-fill', handleAiFill);
  }, []);

  async function loadSlots() {
    setSlotsLoading(true);
    try {
      const data = await api.reservations.listSlots();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function loadCalendarIntegration() {
    try {
      const data = await api.reservations.getCalendarIntegration() as CalendarIntegration | null;
      setCalendarIntegration(data);
      if (data?.calendarId) setCalendarId(data.calendarId);
    } catch {
      setCalendarIntegration(null);
    }
  }

  async function handleSaveCalendar(e: React.FormEvent) {
    e.preventDefault();
    if (!calendarId.trim()) return;
    setSavingCalendar(true);
    try {
      const result = await api.reservations.saveCalendarIntegration({
        calendarId: calendarId.trim(),
        serviceAccountKey: serviceAccountKey.trim(),
      });
      setCalendarIntegration(result as CalendarIntegration);
      setServiceAccountKey('');
      toast.success('Googleカレンダー連携を保存しました');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSavingCalendar(false);
    }
  }

  async function handleDisableCalendar() {
    try {
      await api.reservations.disableCalendarIntegration();
      if (calendarIntegration) {
        setCalendarIntegration({ ...calendarIntegration, isActive: false });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '無効化に失敗しました');
    }
  }

  async function loadReservations() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;
      const data = await api.reservations.list(Object.keys(params).length > 0 ? params : undefined);
      setReservations(Array.isArray(data) ? data as ReservationWithSlot[] : []);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
  }, [filterDate, filterStatus]);

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!slotName.trim()) return;
    setCreatingSlot(true);
    try {
      const slot = await api.reservations.createSlot({
        name: slotName.trim(),
        duration: parseInt(slotDuration, 10),
        description: slotDescription.trim() || undefined,
      });
      setSlots((prev) => [...prev, slot as ReservationSlot]);
      setSlotName('');
      setSlotDuration('30');
      setSlotDescription('');
      setShowSlotForm(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'メニューの作成に失敗しました');
    } finally {
      setCreatingSlot(false);
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!confirm('このメニューを削除しますか？関連する予約も削除されます。')) return;
    try {
      await api.reservations.deleteSlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      loadReservations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'メニューの削除に失敗しました');
    }
  }

  async function handleCreateReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!resSlotId || !resDate || !resTime) return;
    setCreatingRes(true);
    try {
      await api.reservations.create({
        slotId: resSlotId,
        date: resDate,
        startTime: resTime,
        guestName: resGuestName.trim() || undefined,
        note: resNote.trim() || undefined,
        reminderMinutesBefore: resReminderMinutes ? parseInt(resReminderMinutes, 10) : undefined,
      });
      setResSlotId('');
      setResDate('');
      setResTime('');
      setResGuestName('');
      setResNote('');
      setResReminderMinutes('');
      setShowReservationForm(false);
      loadReservations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '予約の作成に失敗しました');
    } finally {
      setCreatingRes(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.reservations.updateStatus(id, status);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ステータスの更新に失敗しました');
    }
  }

  async function handleDeleteReservation(id: string) {
    if (!confirm('この予約を削除しますか？')) return;
    try {
      await api.reservations.delete(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '予約の削除に失敗しました');
    }
  }

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">予約管理</h1>
        <p className="text-sm text-muted-foreground">予約メニューの管理と予約の受付・確認</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reservations">予約一覧</TabsTrigger>
          <TabsTrigger value="slots">メニュー管理</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Link className="h-3.5 w-3.5" />
            カレンダー連携
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Reservations */}
        <TabsContent value="reservations" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-44"
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-36"
              >
                <SelectOption value="">全ステータス</SelectOption>
                <SelectOption value="confirmed">確定</SelectOption>
                <SelectOption value="cancelled">キャンセル</SelectOption>
                <SelectOption value="completed">完了</SelectOption>
              </Select>
              {(filterDate || filterStatus) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterDate(''); setFilterStatus(''); }}
                >
                  クリア
                </Button>
              )}
            </div>
            <Button onClick={() => setShowReservationForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              予約作成
            </Button>
          </div>

          {/* Create reservation form */}
          {showReservationForm && (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateReservation} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">メニュー</label>
                      <Select
                        value={resSlotId}
                        onChange={(e) => setResSlotId(e.target.value)}
                        required
                      >
                        <SelectOption value="">選択してください</SelectOption>
                        {slots.map((s) => (
                          <SelectOption key={s.id} value={s.id}>
                            {s.name} ({s.duration}分)
                          </SelectOption>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">ゲスト名</label>
                      <Input
                        value={resGuestName}
                        onChange={(e) => setResGuestName(e.target.value)}
                        placeholder="予約者名"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">日付</label>
                      <Input
                        type="date"
                        value={resDate}
                        onChange={(e) => setResDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">開始時間</label>
                      <Input
                        type="time"
                        value={resTime}
                        onChange={(e) => setResTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">メモ</label>
                      <Input
                        value={resNote}
                        onChange={(e) => setResNote(e.target.value)}
                        placeholder="備考（任意）"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5" />
                        リマインダー
                      </label>
                      <Select
                        value={resReminderMinutes}
                        onChange={(e) => setResReminderMinutes(e.target.value)}
                      >
                        <SelectOption value="">なし</SelectOption>
                        <SelectOption value="30">30分前</SelectOption>
                        <SelectOption value="60">1時間前</SelectOption>
                        <SelectOption value="120">2時間前</SelectOption>
                        <SelectOption value="1440">1日前</SelectOption>
                        <SelectOption value="2880">2日前</SelectOption>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creatingRes || !resSlotId || !resDate || !resTime}>
                      {creatingRes ? '作成中...' : '予約を作成'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowReservationForm(false)}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Reservations table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">予約一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <PageSkeleton />
              ) : reservations.length === 0 ? (
                <EmptyState
                  illustration="reservations"
                  title="予約がありません"
                  description="「予約作成」から新しい予約を追加しましょう"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>時間</TableHead>
                      <TableHead>メニュー</TableHead>
                      <TableHead>予約者</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="w-[100px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((res) => {
                      const st = STATUS_LABELS[res.status] || STATUS_LABELS.confirmed;
                      return (
                        <TableRow key={res.id}>
                          <TableCell className="font-medium">{res.date}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {res.startTime}
                            </span>
                          </TableCell>
                          <TableCell>
                            {res.slotName}
                            <span className="text-xs text-muted-foreground ml-1">({res.slotDuration}分)</span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {res.guestName || '(未設定)'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={res.status}
                              onChange={(e) => handleStatusChange(res.id, e.target.value)}
                              className="w-28 h-8 text-xs"
                            >
                              <SelectOption value="confirmed">確定</SelectOption>
                              <SelectOption value="cancelled">キャンセル</SelectOption>
                              <SelectOption value="completed">完了</SelectOption>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteReservation(res.id)}
                              className="text-destructive hover:text-destructive"
                              aria-label="削除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Slot Management */}
        <TabsContent value="slots" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">予約で選べるメニュー（施術・サービス）を管理します</p>
            <Button onClick={() => setShowSlotForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              メニュー追加
            </Button>
          </div>

          {/* Create slot form */}
          {showSlotForm && (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateSlot} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">メニュー名</label>
                      <Input
                        value={slotName}
                        onChange={(e) => setSlotName(e.target.value)}
                        placeholder="例: カット、カウンセリング"
                        autoFocus
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">所要時間（分）</label>
                      <Input
                        type="number"
                        value={slotDuration}
                        onChange={(e) => setSlotDuration(e.target.value)}
                        min="5"
                        step="5"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">説明（任意）</label>
                      <Input
                        value={slotDescription}
                        onChange={(e) => setSlotDescription(e.target.value)}
                        placeholder="メニューの説明"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={creatingSlot || !slotName.trim()}>
                      {creatingSlot ? '作成中...' : '追加'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowSlotForm(false)}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Slots list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">メニュー一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <PageSkeleton />
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">メニューがまだありません</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">「メニュー追加」から最初のメニューを作成しましょう</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>メニュー名</TableHead>
                      <TableHead>所要時間</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead className="w-[80px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium">{slot.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {slot.duration}分
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {slot.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-destructive hover:text-destructive"
                            aria-label="削除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Google Calendar Integration */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Googleカレンダー連携
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calendarIntegration?.isActive && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">接続中</Badge>
                  <span className="text-sm text-green-700">カレンダーID: {calendarIntegration.calendarId}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDisableCalendar}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    無効化
                  </Button>
                </div>
              )}
              <form onSubmit={handleSaveCalendar} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">カレンダーID</label>
                  <Input
                    value={calendarId}
                    onChange={(e) => setCalendarId(e.target.value)}
                    placeholder="example@group.calendar.google.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Googleカレンダーの設定からカレンダーIDを取得してください
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">サービスアカウントキー (JSON)</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    value={serviceAccountKey}
                    onChange={(e) => setServiceAccountKey(e.target.value)}
                    placeholder='{"type": "service_account", "project_id": "...", ...}'
                  />
                  <p className="text-xs text-muted-foreground">
                    Google Cloud Consoleでサービスアカウントを作成し、JSONキーをここに貼り付けてください。
                    カレンダーの共有設定でサービスアカウントのメールアドレスに編集権限を付与してください。
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={savingCalendar || !calendarId.trim()}>
                    {savingCalendar ? '保存中...' : '連携を保存'}
                  </Button>
                </div>
              </form>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">連携でできること</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- 予約作成時にGoogleカレンダーに自動でイベントを追加</li>
                  <li>- 予約削除時にカレンダーのイベントも自動削除</li>
                  <li>- スタッフのスケジュール管理と一元化</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
