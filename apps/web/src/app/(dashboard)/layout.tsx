'use client';

import { toast } from 'sonner';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { AiCopilot } from '@/components/dashboard/ai-copilot';
import { Toaster } from '@/components/ui/sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, MessageSquare, GitBranch, Menu,
  FileText, Bot, BarChart3, Settings, LogOut,
  ChevronDown, Send, Filter, FileStack, Ticket,
  CalendarCheck, X, PanelLeftClose, PanelLeft, Dices, ShieldAlert,
  type LucideIcon,
} from 'lucide-react';

// --- Navigation structure ---
interface NavItem { name: string; href: string; icon: LucideIcon }
interface NavGroup { label: string; icon: LucideIcon; items: NavItem[] }
type NavEntry = NavItem | NavGroup;
function isGroup(e: NavEntry): e is NavGroup { return 'items' in e; }

const navigation: NavEntry[] = [
  { name: 'ダッシュボード', href: '/overview', icon: LayoutDashboard },
  {
    label: 'メッセージ',
    icon: MessageSquare,
    items: [
      { name: 'チャット', href: '/messages', icon: Send },
      { name: 'ステップ配信', href: '/steps', icon: GitBranch },
      { name: 'セグメント配信', href: '/segments', icon: Filter },
    ],
  },
  { name: '友だち', href: '/friends', icon: Users },
  {
    label: 'コンテンツ',
    icon: FileStack,
    items: [
      { name: 'テンプレート', href: '/templates', icon: FileStack },
      { name: 'リッチメニュー', href: '/rich-menus', icon: Menu },
      { name: 'フォーム', href: '/forms', icon: FileText },
      { name: 'クーポン', href: '/coupons', icon: Ticket },
      { name: 'ガチャ', href: '/gacha', icon: Dices },
      { name: '離脱防止', href: '/exit-popups', icon: ShieldAlert },
    ],
  },
  { name: 'AI・自動化', href: '/ai', icon: Bot },
  { name: '予約管理', href: '/reservations', icon: CalendarCheck },
  { name: '分析', href: '/analytics', icon: BarChart3 },
  { name: '設定', href: '/settings', icon: Settings },
];

// --- Sidebar sub-components ---
function NavLink({ item, pathname }: { item: NavItem; pathname: string | null }) {
  const active = pathname === item.href || pathname?.startsWith(item.href + '/');
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
        active
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.name}
    </Link>
  );
}

function NavAccordion({ group, pathname, badge, onBadgeClear }: { group: NavGroup; pathname: string | null; badge?: number; onBadgeClear?: () => void }) {
  const childActive = group.items.some(
    (i) => pathname === i.href || pathname?.startsWith(i.href + '/'),
  );
  const [open, setOpen] = useState(childActive);

  // Auto-open when child becomes active
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    // Clear parent badge when expanding
    if (willOpen && onBadgeClear) onBadgeClear();
  }

  // Badge is hidden when accordion is open (child badges take over)
  const showParentBadge = !open && badge !== undefined && badge > 0;

  return (
    <div>
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors w-full',
          childActive ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {showParentBadge && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-4 pl-2.5 border-l border-slate-700/50 space-y-0.5 mt-0.5 mb-1">
          {group.items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            // Show badge on "チャット" sub-item
            const itemBadge = item.href === '/messages' ? badge : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors',
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300',
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {itemBadge !== undefined && itemBadge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                    {itemBadge > 99 ? '99+' : itemBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Sidebar nav + logout (shared between mobile & desktop) ---
function SidebarNav({
  pathname,
  unreadCount,
  navigation,
  onLogout,
  onNavClick,
}: {
  pathname: string | null;
  unreadCount: number;
  navigation: NavEntry[];
  onLogout: () => void;
  onNavClick?: () => void;
}) {
  return (
    <>
      <ScrollArea className="flex-1 px-2">
        <nav className="flex flex-col gap-0.5 py-2" onClick={(e) => {
          if (onNavClick && (e.target as HTMLElement).closest('a')) onNavClick();
        }}>
          {navigation.map((entry) =>
            isGroup(entry) ? (
              <NavAccordion key={entry.label} group={entry} pathname={pathname} badge={entry.label === 'メッセージ' ? unreadCount : undefined} onBadgeClear={entry.label === 'メッセージ' ? () => {} : undefined} />
            ) : (
              <NavLink key={entry.href} item={entry} pathname={pathname} />
            ),
          )}
        </nav>
      </ScrollArea>

      <Separator className="bg-white/5" />
      <div className="p-2">
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[12px] text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </>
  );
}

// --- Main layout ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.auth.me()
      .then((data) => {
        if (!data.user) { router.push('/login'); return; }
        setUser(data.user);
        setTenant(data.tenant);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const isOnMessages = pathname?.startsWith('/messages') ?? false;

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Poll for unread messages every 15 seconds (only when NOT on messages page)
  useEffect(() => {
    if (!user || isOnMessages) return;
    let mounted = true;
    function checkUnread() {
      api.messages
        .unreadSummary()
        .then((data) => {
          if (mounted) setUnreadCount(data.totalUnread ?? 0);
        })
        .catch(() => { /* background polling – silent */ });
    }
    checkUnread();
    const interval = setInterval(checkUnread, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user, isOnMessages]);

  // Clear sidebar badge when navigating to messages page
  useEffect(() => {
    if (isOnMessages) setUnreadCount(0);
  }, [isOnMessages]);

  const handleLogout = useCallback(async () => {
    try { await api.auth.logout(); } catch {}
    router.push('/login');
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center h-12 px-3 bg-slate-900 text-white lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" aria-label="メニュー">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="ml-3 text-lg font-extrabold tracking-tight">
          <span className="text-[#06C755]">Lin</span>
          <span className="text-slate-400">Q</span>
        </h1>
        {unreadCount > 0 && (
          <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-slate-900 text-white flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">
                  <span className="text-[#06C755]">Lin</span>
                  <span className="text-slate-400">Q</span>
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tenant?.name}</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav
              pathname={pathname}
              unreadCount={unreadCount}
              navigation={navigation}
              onLogout={handleLogout}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-slate-900 text-white shrink-0 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      )}>
        {collapsed ? (
          /* Collapsed icon-only sidebar */
          <>
            <div className="flex items-center justify-center pt-4 pb-2">
              <button onClick={() => setCollapsed(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors" title="サイドバーを開く" aria-label="サイドバーを開く">
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <nav className="flex flex-col items-center gap-1 py-2">
                {navigation.map((entry) => {
                  if (isGroup(entry)) {
                    return entry.items.map((item) => {
                      const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                      const itemBadge = item.href === '/messages' ? unreadCount : undefined;
                      return (
                        <Link key={item.href} href={item.href} title={item.name} className={cn(
                          'relative flex items-center justify-center w-9 h-9 rounded-md transition-colors',
                          active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                        )}>
                          <item.icon className="h-4 w-4" />
                          {itemBadge !== undefined && itemBadge > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white px-0.5">
                              {itemBadge > 99 ? '!' : itemBadge}
                            </span>
                          )}
                        </Link>
                      );
                    });
                  }
                  const active = pathname === entry.href || pathname?.startsWith(entry.href + '/');
                  return (
                    <Link key={entry.href} href={entry.href} title={entry.name} className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-md transition-colors',
                      active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                    )}>
                      <entry.icon className="h-4 w-4" />
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>
            <Separator className="bg-white/5" />
            <div className="flex justify-center py-2">
              <button onClick={handleLogout} title="ログアウト" className="flex items-center justify-center w-9 h-9 rounded-md text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          /* Expanded sidebar */
          <>
            <div className="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">
                  <span className="text-[#06C755]">Lin</span>
                  <span className="text-slate-400">Q</span>
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tenant?.name}</p>
              </div>
              <button onClick={() => setCollapsed(true)} className="mt-1 p-1 rounded-md text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors" title="サイドバーを閉じる" aria-label="サイドバーを閉じる">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav
              pathname={pathname}
              unreadCount={unreadCount}
              navigation={navigation}
              onLogout={handleLogout}
            />
          </>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        {children}
      </main>

      <AiCopilot />
      <Toaster />
    </div>
  );
}
