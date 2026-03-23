'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, User, FileText, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';

interface SlotInfo {
  id: string;
  name: string;
  duration: number;
  description: string | null;
}

interface TenantInfo {
  id: string;
  name: string;
  appName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

export default function PublicBookingPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking flow
  const [step, setStep] = useState<'slots' | 'date' | 'time' | 'form' | 'done'>('slots');
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const primaryColor = tenant?.primaryColor || '#06C755';

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/booking/${tenantId}`)
      .then((res) => res.json())
      .then((data) => {
        setTenant(data.tenant);
        setSlots(data.slots || []);
      })
      .catch(() => setError('予約ページの読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  function selectSlot(slot: SlotInfo) {
    setSelectedSlot(slot);
    setStep('date');
  }

  async function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setLoadingTimes(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/${tenantId}/slots/${selectedSlot!.id}/available?date=${dateStr}`);
      const data = await res.json();
      setAvailableTimes(data.available || []);
      setStep('time');
    } catch {
      setError('空き時間の取得に失敗しました');
    } finally {
      setLoadingTimes(false);
    }
  }

  function selectTime(time: string) {
    setSelectedTime(time);
    setStep('form');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/${tenantId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot!.id,
          guestName: guestName.trim(),
          date: selectedDate,
          startTime: selectedTime,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '予約に失敗しました');
      }
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  // Calendar helper
  function renderCalendar() {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthName = new Date(year, month).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalMonth((prev) => {
              const d = new Date(prev.year, prev.month - 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h3 className="text-lg font-semibold text-gray-800">{monthName}</h3>
          <button
            onClick={() => setCalMonth((prev) => {
              const d = new Date(prev.year, prev.month + 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
            <div key={d} className="text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const date = new Date(year, month, day);
            const isPast = date < today;
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            return (
              <button
                key={day}
                disabled={isPast}
                onClick={() => selectDate(dateStr)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  isPast
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:text-white'
                }`}
                style={!isPast ? { ['--hover-bg' as string]: primaryColor } : undefined}
                onMouseEnter={(e) => { if (!isPast) (e.target as HTMLElement).style.backgroundColor = primaryColor; (e.target as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={(e) => { if (!isPast) (e.target as HTMLElement).style.backgroundColor = ''; (e.target as HTMLElement).style.color = ''; }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && step !== 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => { setError(''); setStep('slots'); }} className="text-sm underline text-gray-500">戻る</button>
        </div>
      </div>
    );
  }

  const brandName = tenant?.appName || tenant?.name || 'LinQ';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt={brandName} className="h-8 max-w-[120px] object-contain" />
          ) : (
            <h1 className="text-lg font-bold" style={{ color: primaryColor }}>{brandName}</h1>
          )}
          <span className="text-sm text-gray-500">オンライン予約</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Step: Select slot */}
        {step === 'slots' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">メニューを選択</h2>
            <p className="text-sm text-gray-500">ご希望のメニューをお選びください</p>
            {slots.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>現在予約可能なメニューはありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => selectSlot(slot)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{slot.name}</h3>
                        {slot.description && <p className="text-sm text-gray-500 mt-1">{slot.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400 shrink-0 ml-4">
                        <Clock className="h-4 w-4" />
                        {slot.duration}分
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Select date */}
        {step === 'date' && (
          <div className="space-y-4">
            <button onClick={() => setStep('slots')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="h-4 w-4" /> メニュー選択に戻る
            </button>
            <h2 className="text-xl font-bold text-gray-800">日付を選択</h2>
            <p className="text-sm text-gray-500">{selectedSlot?.name} ({selectedSlot?.duration}分)</p>
            <div className="bg-white rounded-xl border p-4">
              {loadingTimes ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                renderCalendar()
              )}
            </div>
          </div>
        )}

        {/* Step: Select time */}
        {step === 'time' && (
          <div className="space-y-4">
            <button onClick={() => setStep('date')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="h-4 w-4" /> カレンダーに戻る
            </button>
            <h2 className="text-xl font-bold text-gray-800">時間を選択</h2>
            <p className="text-sm text-gray-500">
              {selectedSlot?.name} - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
            {availableTimes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">この日は空きがありません</p>
                <button onClick={() => setStep('date')} className="text-sm underline mt-2" style={{ color: primaryColor }}>別の日を選ぶ</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => selectTime(time)}
                    className="py-3 px-2 rounded-lg border text-sm font-medium transition-all hover:text-white"
                    style={{ borderColor: '#e5e7eb' }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = primaryColor; (e.target as HTMLElement).style.color = '#fff'; (e.target as HTMLElement).style.borderColor = primaryColor; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = ''; (e.target as HTMLElement).style.color = ''; (e.target as HTMLElement).style.borderColor = '#e5e7eb'; }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Guest info form */}
        {step === 'form' && (
          <div className="space-y-4">
            <button onClick={() => setStep('time')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="h-4 w-4" /> 時間選択に戻る
            </button>
            <h2 className="text-xl font-bold text-gray-800">お客様情報</h2>

            {/* Summary */}
            <div className="bg-white rounded-xl border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">メニュー</span>
                <span className="font-medium">{selectedSlot?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">日時</span>
                <span className="font-medium">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {selectedTime}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">所要時間</span>
                <span className="font-medium">{selectedSlot?.duration}分</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-shadow"
                  style={{ ['--tw-ring-color' as string]: primaryColor }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="h-4 w-4 inline mr-1" />
                  備考（任意）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ご要望やご質問がありましたらご記入ください"
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none transition-shadow"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !guestName.trim()}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                予約を確定する
              </button>
            </form>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4" style={{ backgroundColor: `${primaryColor}20` }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">予約が完了しました</h2>
            <p className="text-sm text-gray-500 mb-6">ご予約ありがとうございます。当日のお越しをお待ちしております。</p>
            <div className="bg-white rounded-xl border p-4 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">メニュー</span>
                <span className="font-medium">{selectedSlot?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">日時</span>
                <span className="font-medium">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {selectedTime}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">お名前</span>
                <span className="font-medium">{guestName}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        Powered by {brandName}
      </footer>
    </div>
  );
}
