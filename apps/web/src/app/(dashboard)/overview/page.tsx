'use client';

import { useEffect, useState } from 'react';
import { Users, MessageSquare, Bot, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api-client';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    api.friends.list({ limit: 5 }).then(setFriends).catch(() => {});
    api.accounts.list().then(setAccounts).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">LINE公式アカウントの運用状況</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="友だち数" value={friends.length} icon={Users} color="bg-blue-500" />
        <StatCard title="今月の配信数" value={0} icon={MessageSquare} color="bg-green-500" />
        <StatCard title="AI応答数" value={0} icon={Bot} color="bg-purple-500" />
        <StatCard title="接続アカウント" value={accounts.length} icon={TrendingUp} color="bg-orange-500" />
      </div>

      {accounts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-medium text-yellow-800">LINE公式アカウントを接続しましょう</h3>
          <p className="text-yellow-700 text-sm mt-1">
            設定ページからLINE公式アカウントを接続すると、友だち管理やメッセージ配信が使えるようになります。
          </p>
          <a
            href="/settings"
            className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition-colors"
          >
            設定へ移動
          </a>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近の友だち</h2>
        {friends.length === 0 ? (
          <p className="text-gray-500 text-sm">まだ友だちがいません。LINE公式アカウントを接続して友だちを追加しましょう。</p>
        ) : (
          <div className="space-y-3">
            {friends.map((friend: any) => (
              <div key={friend.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {friend.pictureUrl ? (
                    <img src={friend.pictureUrl} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <Users className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{friend.displayName || '名前未設定'}</p>
                  <p className="text-xs text-gray-500">
                    {friend.isFollowing ? 'フォロー中' : 'ブロック'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
