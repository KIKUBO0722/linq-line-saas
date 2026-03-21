'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, GitBranch, Menu as MenuIcon,
  FileText, Bot, BarChart3, Link2, Settings, LogOut,
  ArrowUpRight, Zap, Send, Sparkles,
  MessageCircle, Search, Plus, Tag, MoreHorizontal,
  ChevronDown, Clock, CheckCircle2, PauseCircle, Play,
} from 'lucide-react';

const C = {
  green: '#06C755', greenBg: 'rgba(6,199,85,0.06)',
  coral: '#FF6B6B', coralBg: 'rgba(255,107,107,0.06)',
  amber: '#FFB347', amberBg: 'rgba(255,179,71,0.06)',
  navy: '#111827',
  bg: '#f9fafb', white: '#fff',
  t1: '#111827', t2: '#374151', t3: '#6b7280', t4: '#9ca3af',
  border: '#e5e7eb', borderLight: '#f3f4f6',
};

/* ═══ Mock Data ═══ */
const friends = [
  { id: '1', name: '佐藤花子', tags: ['VIP', 'カラー好き'], score: 85, status: 'フォロー中', lastMsg: '3時間前', ai: true, source: 'Instagram広告' },
  { id: '2', name: '山田太郎', tags: ['新規', 'カット'], score: 42, status: 'フォロー中', lastMsg: '2日前', ai: true, source: '友だち紹介' },
  { id: '3', name: '鈴木一郎', tags: ['リピーター'], score: 68, status: 'フォロー中', lastMsg: '1日前', ai: false, source: '店頭QR' },
  { id: '4', name: '高橋美穂', tags: ['トリートメント'], score: 55, status: 'フォロー中', lastMsg: '5時間前', ai: true, source: 'ウェブサイト' },
  { id: '5', name: '田中健太', tags: ['新規'], score: 20, status: 'ブロック', lastMsg: '1週間前', ai: false, source: 'Instagram広告' },
  { id: '6', name: '中村美咲', tags: ['VIP', 'パーマ'], score: 92, status: 'フォロー中', lastMsg: '1時間前', ai: true, source: '友だち紹介' },
  { id: '7', name: '小林翔太', tags: ['カット'], score: 35, status: 'フォロー中', lastMsg: '3日前', ai: false, source: '店頭QR' },
  { id: '8', name: '加藤由美', tags: ['リピーター', 'カラー好き'], score: 78, status: 'フォロー中', lastMsg: '6時間前', ai: true, source: 'ウェブサイト' },
];

const conversations = [
  { from: 'user', name: '佐藤花子', msg: '来週の火曜日、14時に予約できますか？', time: '14:32' },
  { from: 'ai', msg: '火曜14時、空きがございます！カット+カラーでよろしいでしょうか？', time: '14:32' },
  { from: 'user', name: '佐藤花子', msg: 'はい、お願いします！', time: '14:33' },
  { from: 'ai', msg: 'ご予約確定しました✨ 前日にリマインドをお送りしますね。', time: '14:33' },
];

const scenarios = [
  { id: '1', name: '新規歓迎シナリオ', trigger: '友だち追加', active: true, enrolled: 156, completed: 112, steps: 7 },
  { id: '2', name: 'VIPフォローアップ', trigger: 'タグ: VIP追加', active: true, enrolled: 34, completed: 20, steps: 5 },
  { id: '3', name: '再来店リマインド', trigger: '手動', active: false, enrolled: 0, completed: 0, steps: 3 },
  { id: '4', name: 'バースデークーポン', trigger: 'カスタムフィールド', active: true, enrolled: 28, completed: 15, steps: 2 },
];

const aiConversations = [
  { friend: '佐藤花子', q: '予約したい', a: '火曜14時をご案内', time: '14:32', handled: true },
  { friend: '山田太郎', q: 'メニューを教えて', a: 'カット¥4,500等をご案内', time: '13:15', handled: true },
  { friend: '高橋美穂', q: '返金について', a: 'スタッフに引き継ぎ', time: '11:00', handled: false },
  { friend: '中村美咲', q: 'カラーの持ち', a: 'ケア方法をアドバイス', time: '10:22', handled: true },
];

const weekly = [
  { day: '月', v: 120, ai: 45 }, { day: '火', v: 180, ai: 62 },
  { day: '水', v: 95, ai: 38 }, { day: '木', v: 220, ai: 78 },
  { day: '金', v: 160, ai: 55 }, { day: '土', v: 280, ai: 95 },
  { day: '日', v: 200, ai: 70 },
];

/* ═══ Sidebar ═══ */
const navItems = [
  { key: 'overview', name: '概要', icon: LayoutDashboard },
  { key: 'friends', name: '友だち', icon: Users },
  { key: 'messages', name: 'メッセージ', icon: MessageSquare },
  { key: 'steps', name: 'ステップ配信', icon: GitBranch },
  { key: 'ai', name: 'AI設定', icon: Bot },
  { key: 'analytics', name: '分析', icon: BarChart3 },
  { key: 'settings', name: '設定', icon: Settings },
];

function Sidebar({ active, onNav }: { active: string; onNav: (k: string) => void }) {
  return (
    <aside style={{ width: 200, background: C.navy, color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: C.green }}>Lin</span><span>Q</span>
        </div>
        <div style={{ fontSize: 10, color: C.t4, marginTop: 4 }}>田中ビューティーサロン</div>
      </div>
      <nav style={{ flex: 1, padding: '4px 6px' }}>
        {navItems.map(it => (
          <div key={it.key} onClick={() => onNav(it.key)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 1,
            background: active === it.key ? C.green : 'transparent',
            color: active === it.key ? '#fff' : '#9ca3af',
            transition: 'all .15s',
          }}>
            <it.icon size={15} />
            {it.name}
          </div>
        ))}
      </nav>
      <div style={{ padding: '8px 6px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
          <LogOut size={14} /> ログアウト
        </div>
      </div>
    </aside>
  );
}

/* ═══ Inline Stats ═══ */
function InlineStats() {
  const stats = [
    { label: '友だち', value: '342', change: '+12' },
    { label: '配信', value: '1,240', change: '+18%' },
    { label: 'AI応答', value: '89', change: '+34%' },
  ];
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.t3 }}>{s.label}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>{s.value}</span>
          <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{s.change}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ AI Copilot ═══ */
function AICopilot() {
  const [input, setInput] = useState('');
  return (
    <aside style={{ width: 260, background: C.white, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} style={{ color: C.green }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>LinQ AI</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        <div style={{ padding: 12, borderRadius: 10, background: C.greenBg, border: `1px solid ${C.green}20`, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>未予約の顧客<strong>23人</strong>にリマインドクーポンを送りませんか？</div>
          <button style={{ marginTop: 8, padding: '5px 12px', borderRadius: 6, border: 'none', background: C.green, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            配信を作成 →
          </button>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: C.bg, marginBottom: 8, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
          📊 <strong>火曜18時</strong>の開封率が最高。次回推奨。
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: C.coralBg, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
          ⚠️ 田中健太さんが<strong>1週間未反応</strong>。
        </div>
      </div>
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="AIに質問..."
            style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
          <button style={{ padding: '7px 8px', borderRadius: 6, border: 'none', background: C.green, color: '#fff', cursor: 'pointer' }}>
            <Send size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ═══ Page: Overview ═══ */
function OverviewPage() {
  const max = Math.max(...weekly.map(d => d.v));
  return (
    <>
      <div style={{ background: C.greenBg, border: `1px solid ${C.green}20`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={14} style={{ color: C.green }} />
        <span style={{ fontSize: 12, color: C.t2 }}>今月AIが<strong>89件</strong>を自動処理 → <strong style={{ color: C.green }}>約15時間・¥37,500</strong> 削減</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Chart */}
        <div style={{ background: C.white, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>週間推移</span>
            <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: C.green, display: 'inline-block' }} />配信</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: C.amber, display: 'inline-block' }} />AI</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
            {weekly.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 100 }}>
                  <div style={{ width: 12, borderRadius: '3px 3px 0 0', background: C.green, height: `${(d.v / max) * 100}%` }} />
                  <div style={{ width: 12, borderRadius: '3px 3px 0 0', background: C.amber, height: `${(d.ai / max) * 100}%` }} />
                </div>
                <span style={{ fontSize: 10, color: C.t4 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LINE Chat Preview */}
        <div style={{ background: C.white, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <MessageCircle size={14} style={{ color: C.green }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>AI応答プレビュー</span>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: C.greenBg, color: C.green, fontWeight: 700 }}>LIVE</span>
          </div>
          <div style={{ background: '#e8e4df', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {conversations.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'ai' ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '70%', padding: '6px 10px', fontSize: 12, lineHeight: 1.5,
                  borderRadius: m.from === 'ai' ? '2px 10px 10px 10px' : '10px 2px 10px 10px',
                  background: m.from === 'ai' ? '#fff' : C.green,
                  color: m.from === 'ai' ? C.t1 : '#fff',
                }}>
                  {m.from === 'ai' && <><span style={{ fontSize: 9, color: C.green, fontWeight: 600 }}>✦ AI</span><br /></>}
                  {m.msg}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Friends */}
      <div style={{ background: C.white, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>最近の友だち</span>
          <span style={{ fontSize: 12, color: C.green, fontWeight: 600, cursor: 'pointer' }}>すべて →</span>
        </div>
        {friends.slice(0, 4).map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{f.name}</span>
                {f.ai && <Bot size={10} style={{ color: C.green }} />}
              </div>
              <span style={{ fontSize: 10, color: C.t4 }}>{f.tags.join(' · ')} · {f.lastMsg}</span>
            </div>
            <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{f.score}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══ Page: Friends ═══ */
function FriendsPage() {
  const [search, setSearch] = useState('');
  const filtered = friends.filter(f => f.name.includes(search) || f.tags.some(t => t.includes(search)));
  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white }}>
          <Search size={14} style={{ color: C.t4 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・タグで検索..." style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, fontFamily: 'inherit' }} />
        </div>
        <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tag size={13} /> タグ管理
        </button>
      </div>

      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: C.t3, fontWeight: 600, fontSize: 12 }}>名前</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: C.t3, fontWeight: 600, fontSize: 12 }}>タグ</th>
              <th style={{ textAlign: 'center', padding: '10px 16px', color: C.t3, fontWeight: 600, fontSize: 12 }}>スコア</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: C.t3, fontWeight: 600, fontSize: 12 }}>流入経路</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: C.t3, fontWeight: 600, fontSize: 12 }}>状態</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', color: C.t3, fontWeight: 600, fontSize: 12 }}>最終</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} style={{ borderBottom: `1px solid ${C.borderLight}`, cursor: 'pointer' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{f.name}</span>
                    {f.ai && <Bot size={10} style={{ color: C.green }} />}
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {f.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: C.greenBg, color: C.green, fontWeight: 600 }}>{t}</span>)}
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 700, color: f.score >= 70 ? C.green : f.score >= 40 ? C.amber : C.coral }}>{f.score}</td>
                <td style={{ padding: '10px 16px', color: C.t3, fontSize: 12 }}>{f.source}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: f.status === 'フォロー中' ? C.greenBg : C.coralBg, color: f.status === 'フォロー中' ? C.green : C.coral, fontWeight: 600 }}>{f.status}</span>
                </td>
                <td style={{ textAlign: 'right', padding: '10px 16px', color: C.t4, fontSize: 12 }}>{f.lastMsg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ═══ Page: Messages ═══ */
function MessagesPage() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 'calc(100vh - 120px)' }}>
        {/* Contact list */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'auto' }}>
          <div style={{ padding: '12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: C.bg }}>
              <Search size={13} style={{ color: C.t4 }} />
              <input placeholder="検索..." style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, background: 'transparent', fontFamily: 'inherit' }} />
            </div>
          </div>
          {friends.slice(0, 6).map((f, i) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${C.borderLight}`, cursor: 'pointer', background: i === 0 ? C.greenBg : 'transparent' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: C.t4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>予約の件でご連絡...</div>
              </div>
              <span style={{ fontSize: 10, color: C.t4 }}>{f.lastMsg}</span>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>佐藤花子</div>
                <div style={{ fontSize: 10, color: C.green }}>VIP · スコア 85</div>
              </div>
            </div>
            <MoreHorizontal size={16} style={{ color: C.t4 }} />
          </div>
          <div style={{ flex: 1, padding: 16, background: '#e8e4df', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {conversations.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'ai' ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '65%', padding: '8px 12px', fontSize: 13, lineHeight: 1.5,
                  borderRadius: m.from === 'ai' ? '2px 12px 12px 12px' : '12px 2px 12px 12px',
                  background: m.from === 'ai' ? '#fff' : C.green,
                  color: m.from === 'ai' ? C.t1 : '#fff',
                }}>
                  {m.from === 'ai' && <><span style={{ fontSize: 9, color: C.green, fontWeight: 600 }}>✦ AI</span><br /></>}
                  {m.msg}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
            <input placeholder="メッセージを入力..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>送信</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ Page: Steps ═══ */
function StepsPage() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: C.t2 }}>
            <Sparkles size={13} style={{ color: C.green }} /> AIに提案してもらう
          </button>
          <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={13} /> 新規シナリオ
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {scenarios.map(s => (
          <div key={s.id} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flexShrink: 0 }}>
              {s.active
                ? <Play size={16} style={{ color: C.green }} />
                : <PauseCircle size={16} style={{ color: C.t4 }} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>トリガー: {s.trigger} · {s.steps}ステップ</div>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{s.enrolled}</div>
                <div style={{ fontSize: 10, color: C.t4 }}>登録</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{s.completed}</div>
                <div style={{ fontSize: 10, color: C.t4 }}>完了</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.enrolled > 0 ? C.green : C.t4 }}>
                  {s.enrolled > 0 ? `${Math.round(s.completed / s.enrolled * 100)}%` : '-'}
                </div>
                <div style={{ fontSize: 10, color: C.t4 }}>完了率</div>
              </div>
              <span style={{
                fontSize: 10, padding: '3px 10px', borderRadius: 10, fontWeight: 600,
                background: s.active ? C.greenBg : C.bg,
                color: s.active ? C.green : C.t4,
              }}>
                {s.active ? '有効' : '停止中'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══ Page: AI ═══ */
function AIPage() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 12 }}>自動応答設定</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: C.t2 }}>AI自動応答</span>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: C.green, padding: 2, cursor: 'pointer' }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', marginLeft: 18 }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.t3, marginBottom: 4 }}>AIの口調</div>
            <textarea rows={3} defaultValue="丁寧で親しみやすい口調で対応してください。予約の受付、メニューの案内、ヘアケアのアドバイスができます。"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.t3, marginBottom: 4 }}>スタッフ引き継ぎキーワード</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['クレーム', '返金', '予約変更', '担当者'].map(k => (
                <span key={k} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: C.coralBg, color: C.coral, fontWeight: 500 }}>{k}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 12 }}>ナレッジベース</div>
          {['メニュー・料金表', '営業時間・アクセス', 'よくある質問'].map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} style={{ color: C.green }} />
                <span style={{ fontSize: 13, color: C.t1 }}>{k}</span>
              </div>
              <span style={{ fontSize: 12, color: C.green, cursor: 'pointer' }}>編集</span>
            </div>
          ))}
          <button style={{ marginTop: 12, padding: '6px 12px', borderRadius: 6, border: `1px dashed ${C.border}`, background: 'transparent', fontSize: 12, color: C.t3, cursor: 'pointer', width: '100%' }}>
            + ナレッジを追加
          </button>
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 12 }}>AI応答ログ</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ textAlign: 'left', padding: '8px 0', color: C.t3, fontWeight: 600 }}>友だち</th>
              <th style={{ textAlign: 'left', padding: '8px 0', color: C.t3, fontWeight: 600 }}>質問</th>
              <th style={{ textAlign: 'left', padding: '8px 0', color: C.t3, fontWeight: 600 }}>AI回答</th>
              <th style={{ textAlign: 'center', padding: '8px 0', color: C.t3, fontWeight: 600 }}>結果</th>
              <th style={{ textAlign: 'right', padding: '8px 0', color: C.t3, fontWeight: 600 }}>時刻</th>
            </tr>
          </thead>
          <tbody>
            {aiConversations.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>{c.friend}</td>
                <td style={{ padding: '8px 0', color: C.t3 }}>{c.q}</td>
                <td style={{ padding: '8px 0', color: C.t2 }}>{c.a}</td>
                <td style={{ textAlign: 'center', padding: '8px 0' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: c.handled ? C.greenBg : C.amberBg, color: c.handled ? C.green : C.amber, fontWeight: 600 }}>
                    {c.handled ? 'AI完了' : '引き継ぎ'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', padding: '8px 0', color: C.t4 }}>{c.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ═══ Placeholder Pages ═══ */
function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 150px)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: C.t3 }}>{desc}</div>
      </div>
    </div>
  );
}

/* ═══ Page Titles ═══ */
const pageTitles: Record<string, { title: string; sub: string }> = {
  overview: { title: 'ダッシュボード', sub: '運用状況の概要' },
  friends: { title: '友だち管理', sub: `${friends.length}人の友だち` },
  messages: { title: 'メッセージ', sub: '顧客とのやりとり' },
  steps: { title: 'ステップ配信', sub: `${scenarios.length}個のシナリオ` },
  ai: { title: 'AI設定', sub: 'AI自動応答とナレッジベース' },
  analytics: { title: '分析', sub: '配信パフォーマンスと流入経路' },
  settings: { title: '設定', sub: 'アカウントとLINE接続' },
};

/* ═══ Main ═══ */
export default function DashboardPreview() {
  const [page, setPage] = useState('overview');
  const pt = pageTitles[page] || { title: '', sub: '' };

  const renderPage = () => {
    switch (page) {
      case 'overview': return <OverviewPage />;
      case 'friends': return <FriendsPage />;
      case 'messages': return <MessagesPage />;
      case 'steps': return <StepsPage />;
      case 'ai': return <AIPage />;
      case 'analytics': return <PlaceholderPage title="分析" desc="配信実績・友だち推移・流入経路の分析（開発中）" />;
      case 'settings': return <PlaceholderPage title="設定" desc="LINEアカウント接続・チーム管理・プラン変更（開発中）" />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif' }}>
      <Sidebar active={page} onNav={setPage} />

      <main style={{ flex: 1, padding: '24px 28px', overflow: 'auto', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, margin: 0 }}>{pt.title}</h1>
            <p style={{ fontSize: 12, color: C.t3, margin: 0 }}>{pt.sub}</p>
          </div>
          <InlineStats />
        </div>
        {renderPage()}
      </main>

      <AICopilot />
    </div>
  );
}
