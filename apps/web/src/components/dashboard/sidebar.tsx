'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  GitBranch,
  Menu,
  FileText,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Send,
  Filter,
  FileStack,
  Ticket,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

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
    ],
  },
  { name: 'AI・自動化', href: '/ai', icon: Bot },
  { name: '予約管理', href: '/reservations', icon: CalendarCheck },
  { name: '分析', href: '/analytics', icon: BarChart3 },
  { name: '設定', href: '/settings', icon: Settings },
];

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string | null }) {
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.name}
    </Link>
  );
}

function SidebarGroup({ group, pathname }: { group: NavGroup; pathname: string | null }) {
  const isChildActive = group.items.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + '/'),
  );
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors w-full',
          isChildActive
            ? 'text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="ml-4 pl-2.5 border-l border-slate-700/50 space-y-0.5 mt-0.5 mb-1">
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors',
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300',
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ tenantName }: { tenantName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch {}
    router.push('/login');
  }

  return (
    <div className="flex flex-col w-56 bg-slate-900 text-white min-h-screen">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-extrabold tracking-tight">
          <span className="text-[#06C755]">Lin</span>
          <span className="text-slate-400">Q</span>
        </h1>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tenantName}</p>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navigation.map((entry) =>
          isGroup(entry) ? (
            <SidebarGroup key={entry.label} group={entry} pathname={pathname} />
          ) : (
            <SidebarItem key={entry.href} item={entry} pathname={pathname} />
          ),
        )}
      </nav>

      <div className="p-2 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[12px] text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </div>
  );
}
