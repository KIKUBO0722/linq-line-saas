'use client';

import { useEffect, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.friends
      .list({ search: search || undefined, limit: 50 })
      .then(setFriends)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">友だち管理</h1>
          <p className="text-gray-500 mt-1">{friends.length}人の友だち</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="名前で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : friends.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>友だちがいません</p>
            <p className="text-sm mt-1">LINE公式アカウントに友だちが追加されると、ここに表示されます。</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">名前</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">スコア</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">追加日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {friends.map((friend: any) => (
                <tr key={friend.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {friend.pictureUrl ? (
                          <img src={friend.pictureUrl} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          <Users className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {friend.displayName || '名前未設定'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        friend.isFollowing
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {friend.isFollowing ? 'フォロー中' : 'ブロック'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{friend.score}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {friend.createdAt ? new Date(friend.createdAt).toLocaleDateString('ja-JP') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
