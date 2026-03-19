'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  GitBranch,
  Menu,
  FileText,
  Bot,
  BarChart3,
  Link2,
  Settings,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: '概要', href: '/overview', icon: LayoutDashboard },
  { name: '友だち', href: '/friends', icon: Users },
  { name: 'メッセージ', href: '/messages', icon: MessageSquare },
  { name: 'ステップ配信', href: '/steps', icon: GitBranch },
  { name: 'リッチメニュー', href: '/rich-menus', icon: Menu },
  { name: 'フォーム', href: '/forms', icon: FileText },
  { name: 'AI設定', href: '/ai', icon: Bot },
  { name: '分析', href: '/analytics', icon: BarChart3 },
  { name: '紹介', href: '/referral', icon: Link2 },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar({ tenantName }: { tenantName: string }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">LINE SaaS</h1>
        <p className="text-sm text-gray-400 mt-1 truncate">{tenantName}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors">
          <LogOut className="h-5 w-5" />
          ログアウト
        </button>
      </div>
    </div>
  );
}
